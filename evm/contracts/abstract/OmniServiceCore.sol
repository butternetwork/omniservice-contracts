// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../interface/IMOSV3.sol";
import "../interface/IMapoExecutor.sol";
import "../utils/EvmDecoder.sol";
import "./FeeManager.sol";

abstract contract OmniServiceCore is
    FeeManager,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    IMOSV3,
    UUPSUpgradeable,
    AccessControlEnumerableUpgradeable
{
    using SafeMathUpgradeable for uint;
    using AddressUpgradeable for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public immutable selfChainId = block.chainid;
    uint256 public constant gasLimitMin = 5000;
    uint256 public constant gasLimitMax = 10000000;
    uint256 public nonce;

    IFeeService public feeService;

    mapping(bytes32 => bool) public orderList;

    mapping(address => mapping(uint256 => mapping(bytes => bool))) public callerList;

    mapping(bytes32 => bytes32) public storedMessageList;

    event MessageTransfer(
        address indexed initiator,
        address indexed referrer,
        address indexed sender,
        bytes32 orderId,
        bytes32 transferId,
        address feeToken,
        uint256 fee
    );

    event SetFeeService(address indexed feeServiceAddress);

    event AddRemoteCaller(address indexed target, uint256 remoteChainId, bytes remoteAddress, bool tag);

    function initialize(address _owner) public virtual initializer checkAddress(_owner) {
        // _changeAdmin(_owner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __AccessControlEnumerable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(MANAGER_ROLE, _owner);
        _grantRole(UPGRADER_ROLE, _owner);
    }

    receive() external payable {}

    modifier checkOrder(bytes32 _orderId) {
        require(!orderList[_orderId], "MOSV3: order exist");
        orderList[_orderId] = true;
        _;
    }

    modifier checkAddress(address _address) {
        require(_address != address(0), "MOSV3: zero address");
        _;
    }

    function trigger() external onlyRole(MANAGER_ROLE) {
        paused() ? _unpause() : _pause();
    }

    function setFeeService(address _feeServiceAddress) external onlyRole(MANAGER_ROLE) {
        feeService = IFeeService(_feeServiceAddress);
        emit SetFeeService(_feeServiceAddress);
    }

    function setBaseGas(uint256[] memory _chainList, uint256[] memory _limitList) external onlyRole(MANAGER_ROLE) {
        _setBaseGas(_chainList, _limitList);
    }

    function setChainGasPrice(
        address _token,
        uint256[] memory _chainList,
        uint256[] memory _priceList
    ) external onlyRole(MANAGER_ROLE) {
        _setChainGasPrice(_token, _chainList, _priceList);
    }

    function setFeeReceiver(address _receiver) external onlyRole(MANAGER_ROLE) {
        _setFeeReceiver(_receiver);
    }

    function emergencyWithdraw(
        address _token,
        address payable _receiver,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) checkAddress(_receiver) {
        require(_amount > 0, "MOSV3: withdraw amount error");
        if (_token == address(0)) {
            _receiver.transfer(_amount);
        } else {
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(_token), _receiver, _amount);
        }
    }

    function getMessageFee(
        uint256 _toChain,
        address _feeToken,
        uint256 _gasLimit
    ) external view override returns (uint256 amount, address receiverAddress) {
        (amount, receiverAddress) = _getMessageFee(_toChain, _feeToken, _gasLimit);
    }

    function getExecutePermission(
        address _targetAddress,
        uint256 _fromChain,
        bytes memory _fromAddress
    ) external view override returns (bool) {
        return callerList[_targetAddress][_fromChain][_fromAddress];
    }

    function getOrderStatus(
        uint256,
        uint256 _blockNum,
        bytes32 _orderId
    ) external view virtual override returns (bool exists, bool verifiable, uint256 nodeType) {}

    function addRemoteCaller(uint256 _fromChain, bytes memory _fromAddress, bool _tag) external override {
        callerList[msg.sender][_fromChain][_fromAddress] = _tag;

        emit AddRemoteCaller(msg.sender, _fromChain, _fromAddress, _tag);
    }

    function transferOut(
        uint256 _toChain,
        bytes memory _messageData,
        address _feeToken
    ) external payable virtual whenNotPaused returns (bytes32) {
        (bytes32 orderId, uint256 feeAmount) = _transferOut(_toChain, _messageData, _feeToken);

        emit MessageTransfer(msg.sender, address(0), msg.sender, orderId, bytes32(0), _feeToken, feeAmount);

        _notifyLightClient(_toChain, bytes(""));

        return orderId;
    }

    function messageOut(
        bytes32 _transferId,
        address _initiator, // initiator address
        address _referrer,
        uint256 _toChain,
        bytes memory _messageData,
        address _feeToken
    ) external payable virtual whenNotPaused returns (bytes32) {
        (bytes32 orderId, uint256 feeAmount) = _transferOut(_toChain, _messageData, _feeToken);

        emit MessageTransfer(_initiator, _referrer, msg.sender, orderId, _transferId, _feeToken, feeAmount);

        _notifyLightClient(_toChain, bytes(""));

        return orderId;
    }

    function _notifyLightClient(uint256 _chainId, bytes memory _data) internal virtual {}

    function _transferOut(
        uint256 _toChain,
        bytes memory _messageData,
        address _feeToken
    ) internal returns (bytes32, uint256) {
        require(_toChain != selfChainId, "MOSV3: only other chain");

        MessageData memory msgData = abi.decode(_messageData, (MessageData));

        require(msgData.gasLimit >= gasLimitMin, "MOSV3: gas too low");
        //require(msgData.gasLimit <= gasLimitMax, "MOSV3: gas too high");
        require(msgData.value == 0, "MOSV3: not support msg value");

        // TODO: check payload length
        // TODO: check target address
        (uint256 amount, address receiverFeeAddress) = _getMessageFee(_toChain, _feeToken, msgData.gasLimit);
        if (_feeToken == address(0)) {
            require(msg.value >= amount, "MOSV3: invalid message fee");
            if (msg.value > 0) {
                payable(receiverFeeAddress).transfer(msg.value);
            }
        } else {
            SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(_feeToken), msg.sender, receiverFeeAddress, amount);
        }

        bytes32 orderId = _getOrderId(msg.sender, msgData.target, _toChain);

        bytes memory fromAddress = Utils.toBytes(msg.sender);

        emit MessageOut(selfChainId, _toChain, orderId, fromAddress, _messageData);

        return (orderId, amount);
    }

    function _messageExecute(
        IEvent.dataOutEvent memory _outEvent,
        MessageData memory _msgData,
        bool _gasleft
    ) internal returns (bool, bytes memory) {
        uint256 gasLimit = _msgData.gasLimit;
        if (_gasleft) {
            gasLimit = gasleft();
        }
        address target = Utils.fromBytes(_msgData.target);
        if (!AddressUpgradeable.isContract(target)) {
            return (false, bytes("NotContract"));
        }
        if (_msgData.msgType == MessageType.CALLDATA) {
            if (!callerList[target][_outEvent.fromChain][_outEvent.fromAddress]) {
                return (false, bytes("InvalidCaller"));
            }
            (bool success, bytes memory returnData) = target.call{gas: gasLimit}(_msgData.payload);
            if (!success) {
                return (false, returnData);
            } else {
                if (_msgData.relay) {
                    bytes memory data = abi.decode(returnData, (bytes));
                    return (true, data);
                } else {
                    return (true, returnData);
                }
            }
        } else if (_msgData.msgType == MessageType.MESSAGE) {
            try
                IMapoExecutor(target).mapoExecute{gas: gasLimit}(
                    _outEvent.fromChain,
                    _outEvent.toChain,
                    _outEvent.fromAddress,
                    _outEvent.orderId,
                    _msgData.payload
                )
            returns (bytes memory returnData) {
                return (true, returnData);
            } catch (bytes memory reason) {
                return (false, reason);
            }
        } else {
            return (false, bytes("InvalidMessageType"));
        }
    }

    function _messageIn(
        IEvent.dataOutEvent memory _outEvent,
        MessageData memory _msgData,
        bool _gasleft,
        bool _revert
    ) internal {
        (bool success, bytes memory returnData) = _messageExecute(_outEvent, _msgData, _gasleft);
        if (success) {
            emit MessageIn(
                _outEvent.fromChain,
                _outEvent.toChain,
                _outEvent.orderId,
                _outEvent.fromAddress,
                bytes(""),
                true,
                bytes("")
            );
        } else {
            if (_revert) {
                revert(string(returnData));
            } else {
                _storeMessageData(_outEvent, returnData);
            }
        }
    }

    function _storeMessageData(IEvent.dataOutEvent memory _outEvent, bytes memory _reason) internal {
        storedMessageList[_outEvent.orderId] = keccak256(
            abi.encodePacked(_outEvent.fromChain, _outEvent.fromAddress, _outEvent.messageData)
        );
        emit MessageIn(
            _outEvent.fromChain,
            _outEvent.toChain,
            _outEvent.orderId,
            _outEvent.fromAddress,
            _outEvent.messageData,
            false,
            _reason
        );
    }

    function _getStoredMessage(
        uint256 _fromChain,
        bytes32 _orderId,
        bytes calldata _fromAddress,
        bytes calldata _messageData
    ) internal returns (IEvent.dataOutEvent memory outEvent, MessageData memory msgData) {
        require(
            keccak256(abi.encodePacked(_fromChain, _fromAddress, _messageData)) == storedMessageList[_orderId],
            "MOSV3: invalid message data"
        );
        outEvent = IEvent.dataOutEvent({
            orderId: _orderId,
            fromChain: _fromChain,
            toChain: selfChainId,
            fromAddress: _fromAddress,
            messageData: _messageData
        });
        delete storedMessageList[_orderId];
        msgData = abi.decode(_messageData, (MessageData));
    }

    function _getOrderId(address _from, bytes memory _to, uint _toChain) internal returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), nonce++, selfChainId, _toChain, _from, _to));
    }

    function _getMessageFee(
        uint256 _toChain,
        address _feeToken,
        uint256 _gasLimit
    ) internal view returns (uint256 amount, address receiverAddress) {
        uint256 baseGas;
        uint256 chainPrice;
        if (address(feeService) == address(0)) {
            (amount, receiverAddress) = this.getServiceMessageFee(_toChain, _feeToken,_gasLimit);
            if(selfChainId == 728126428 || selfChainId == 3448148188){
                if(_feeToken == address(0)){
                    amount = amount / 10**12;
                }
            }
        } else {
            (amount, receiverAddress) = feeService.getServiceMessageFee(_toChain, _feeToken,_gasLimit);
            require(amount > 0, "MOSV3: not support target chain");
        }
    }

    /** UUPS *********************************************************/
    function _authorizeUpgrade(address) internal view override {
        require(hasRole(UPGRADER_ROLE, msg.sender), "MOSV3: only admin can upgrade");
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }
}
