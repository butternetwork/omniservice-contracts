// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@mapprotocol/protocol/contracts/interface/ILightNode.sol";
import "@mapprotocol/protocol/contracts/utils/Utils.sol";
import "@mapprotocol/protocol/contracts/lib/LogDecoder.sol";
import "../interface/IFeeService.sol";
import "../interface/IMOSV3.sol";
import "../interface/IMapoExecutor.sol";
import "../utils/EvmDecoder.sol";

abstract contract OmniServiceCore is ReentrancyGuardUpgradeable, PausableUpgradeable, IMOSV3, UUPSUpgradeable {
    using SafeMathUpgradeable for uint;
    using AddressUpgradeable for address;

    uint public immutable selfChainId = block.chainid;
    uint256 public constant gasLimitMin = 21000;
    uint256 public constant gasLimitMax = 10000000;
    uint public nonce;
    address public wToken; // native wrapped token

    IFeeService public feeService;

    mapping(bytes32 => bool) public orderList;

    mapping(address => mapping(uint256 => mapping(bytes => bool))) public callerList;

    mapping(bytes32 => bytes32) public storedCalldataList;

    event mapTransferExecute(uint256 indexed fromChain, uint256 indexed toChain, address indexed from);

    event SetFeeService(address indexed feeServiceAddress);

    event AddRemoteCaller(address indexed target, uint256 remoteChainId, bytes remoteAddress, bool tag);

    function initialize(address _wToken, address _owner) public virtual initializer checkAddress(_wToken) {
        wToken = _wToken;
        _changeAdmin(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();
    }

    receive() external payable {}

    modifier checkOrder(bytes32 _orderId) {
        require(!orderList[_orderId], "MOSV3: Order exist");
        orderList[_orderId] = true;
        _;
    }

    modifier checkAddress(address _address) {
        require(_address != address(0), "MOSV3: Address is zero");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == _getAdmin(), "MOSV3: Only admin");
        _;
    }

    function trigger() external onlyOwner {
        paused() ? _unpause() : _pause();
    }

    function setFeeService(address _feeServiceAddress) external onlyOwner checkAddress(_feeServiceAddress) {
        feeService = IFeeService(_feeServiceAddress);
        emit SetFeeService(_feeServiceAddress);
    }

    function emergencyWithdraw(
        address _token,
        address payable _receiver,
        uint256 _amount
    ) external onlyOwner checkAddress(_receiver) {
        require(_amount > 0, "MOSV3: Withdraw amount error");
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
    ) external payable virtual whenNotPaused returns (bytes32) {}

    function transferInWithIndex(
        uint256 _chainId,
        uint256 _logIndex,
        bytes memory _receiptProof
    ) external virtual nonReentrant whenNotPaused {}

    function retryMessageIn(
        uint256 _fromChain,
        bytes32 _orderId,
        bytes calldata _fromAddress,
        bytes calldata _messageData
    ) external virtual nonReentrant whenNotPaused {
        require(
            keccak256(abi.encodePacked(_fromChain, _fromAddress, _messageData)) == storedCalldataList[_orderId],
            "MOSV3: error messageData"
        );
        IEvent.dataOutEvent memory outEvent = IEvent.dataOutEvent({
            orderId: _orderId,
            fromChain: _fromChain,
            toChain: uint256(selfChainId),
            fromAddress: _fromAddress,
            messageData: _messageData
        });
        delete storedCalldataList[_orderId];
        MessageData memory msgData = abi.decode(_messageData, (MessageData));
        _retryMessageIn(outEvent, msgData);
    }

    function _transferOut(uint256 _toChain, bytes memory _messageData, address _feeToken) internal returns (bytes32) {
        require(_toChain != selfChainId, "MOSV3: Only other chain");

        MessageData memory msgData = abi.decode(_messageData, (MessageData));

        require(msgData.gasLimit >= gasLimitMin, "MOSV3: Execution gas too low");
        require(msgData.gasLimit <= gasLimitMax, "MOSV3: Execution gas too high");
        require(msgData.value == 0, "MOSV3: Not support msg value");

        // TODO: check payload length
        // TODO: check target address
        (uint256 amount, address receiverFeeAddress) = _getMessageFee(_toChain, _feeToken, msgData.gasLimit);
        if (_feeToken == address(0)) {
            require(msg.value >= amount, "MOSV3: Need message fee");

            if (msg.value > 0) {
                payable(receiverFeeAddress).transfer(msg.value);
            }
        } else {
            SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(_feeToken), msg.sender, receiverFeeAddress, amount);
        }

        bytes32 orderId = _getOrderID(msg.sender, msgData.target, _toChain);

        bytes memory fromAddress = Utils.toBytes(msg.sender);

        emit mapMessageOut(selfChainId, _toChain, orderId, fromAddress, _messageData);

        return orderId;
    }

    function _messageIn(IEvent.dataOutEvent memory _outEvent, MessageData memory _msgData) internal {
        address target = Utils.fromBytes(_msgData.target);
        if (_msgData.msgType == MessageType.CALLDATA) {
            if (callerList[target][_outEvent.fromChain][_outEvent.fromAddress]) {
                (bool success, bytes memory reason) = target.call{gas: _msgData.gasLimit}(_msgData.payload);
                if (success) {
                    emit mapMessageIn(
                        _outEvent.fromChain,
                        _outEvent.toChain,
                        _outEvent.orderId,
                        _outEvent.fromAddress,
                        _msgData.payload,
                        true,
                        bytes("")
                    );
                } else {
                    _storeMessageData(_outEvent, reason);
                }
            } else {
                _storeMessageData(_outEvent, bytes("FromAddressNotCaller"));
            }
        } else if (_msgData.msgType == MessageType.MESSAGE) {
            if (AddressUpgradeable.isContract(target)) {
                try
                    IMapoExecutor(target).mapoExecute{gas: _msgData.gasLimit}(
                        _outEvent.fromChain,
                        _outEvent.toChain,
                        _outEvent.fromAddress,
                        _outEvent.orderId,
                        _msgData.payload
                    )
                {
                    emit mapMessageIn(
                        _outEvent.fromChain,
                        _outEvent.toChain,
                        _outEvent.orderId,
                        _outEvent.fromAddress,
                        _msgData.payload,
                        true,
                        bytes("")
                    );
                } catch (bytes memory reason) {
                    _storeMessageData(_outEvent, reason);
                }
            } else {
                _storeMessageData(_outEvent, bytes("NotContractAddress"));
            }
        } else {
            _storeMessageData(_outEvent, bytes("MessageTypeError"));
        }
    }

    function _retryMessageIn(IEvent.dataOutEvent memory _outEvent, MessageData memory _msgData) internal {
        address target = Utils.fromBytes(_msgData.target);
        if (_msgData.msgType == MessageType.CALLDATA) {
            require(callerList[target][_outEvent.fromChain][_outEvent.fromAddress], "MOSV3: FromAddressNotCaller");
            (bool success, ) = target.call(_msgData.payload);
            if (success) {
                emit mapMessageIn(
                    _outEvent.fromChain,
                    _outEvent.toChain,
                    _outEvent.orderId,
                    _outEvent.fromAddress,
                    _msgData.payload,
                    true,
                    bytes("")
                );
            } else {
                revert("MOSV3: MessageCallError");
            }
        } else if (_msgData.msgType == MessageType.MESSAGE) {
            require(AddressUpgradeable.isContract(target), "MOSV3: NotContractAddress");
            IMapoExecutor(target).mapoExecute(
                _outEvent.fromChain,
                _outEvent.toChain,
                _outEvent.fromAddress,
                _outEvent.orderId,
                _msgData.payload
            );

            emit mapMessageIn(
                _outEvent.fromChain,
                _outEvent.toChain,
                _outEvent.orderId,
                _outEvent.fromAddress,
                _msgData.payload,
                true,
                bytes("")
            );
        } else {
            revert("MOSV3: MessageTypeError");
        }
    }

    function _storeMessageData(IEvent.dataOutEvent memory _outEvent, bytes memory _reason) internal {
        storedCalldataList[_outEvent.orderId] = keccak256(
            abi.encodePacked(_outEvent.fromChain, _outEvent.fromAddress, _outEvent.messageData)
        );
        emit mapMessageIn(
            _outEvent.fromChain,
            _outEvent.toChain,
            _outEvent.orderId,
            _outEvent.fromAddress,
            _outEvent.messageData,
            false,
            _reason
        );
    }

    function _getOrderID(address _from, bytes memory _to, uint _toChain) internal returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), nonce++, selfChainId, _toChain, _from, _to));
    }

    function _getMessageFee(
        uint256 _toChain,
        address _feeToken,
        uint256 _gasLimit
    ) internal view returns (uint256 amount, address receiverAddress) {
        (uint256 baseGas, uint256 chainPrice, address receiverFeeAddress) = feeService.getMessageFee(
            _toChain,
            _feeToken
        );

        require(baseGas > 0, "MOSV3: Not support dest chain");

        amount = (baseGas.add(_gasLimit)).mul(chainPrice);
        receiverAddress = receiverFeeAddress;
    }

    /** UUPS *********************************************************/
    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == _getAdmin(), "MOSV3: Only admin can upgrade");
    }

    function changeAdmin(address _admin) external onlyOwner checkAddress(_admin) {
        _changeAdmin(_admin);
    }

    function getAdmin() external view returns (address) {
        return _getAdmin();
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }
}
