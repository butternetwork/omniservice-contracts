// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "@mapprotocol/protocol/contracts/interface/ILightNode.sol";
import "@mapprotocol/protocol/contracts/utils/Utils.sol";
import "@mapprotocol/protocol/contracts/lib/LogDecoder.sol";
import "./utils/EvmDecoder.sol";
import "./abstract/OmniServiceCore.sol";

contract OmniService is OmniServiceCore {
    uint256 public relayChainId;
    address public relayContract;
    ILightNode public lightNode;

    event SetLightClient(address indexed lightNode);
    event SetRelayContract(uint256 indexed chainId, address indexed relay);

    event MessageVerified(
        uint256 indexed fromChain,
        uint256 indexed toChain,
        bytes32 orderId,
        bytes fromAddrss,
        bytes messageData
    );

    function setLightClient(address _lightNode) external onlyRole(MANAGER_ROLE) checkAddress(_lightNode) {
        lightNode = ILightNode(_lightNode);
        emit SetLightClient(_lightNode);
    }

    function setRelayContract(uint256 _chainId, address _relay) external onlyRole(MANAGER_ROLE) checkAddress(_relay) {
        relayContract = _relay;
        relayChainId = _chainId;
        emit SetRelayContract(_chainId, _relay);
    }

    function getOrderStatus(
        uint256,
        uint256 _blockNum,
        bytes32 _orderId
    ) external view virtual override returns (bool exists, bool verifiable, uint256 nodeType) {
        exists = orderList[_orderId];
        verifiable = lightNode.isVerifiable(_blockNum, bytes32(""));
        nodeType = lightNode.nodeType();
    }

    function transferInWithIndex(
        uint256 _chainId,
        uint256 _logIndex,
        bytes memory _receiptProof
    ) external virtual nonReentrant whenNotPaused {
        IEvent.dataOutEvent memory outEvent = _transferInVerify(_chainId, _logIndex, _receiptProof);

        _transferIn(outEvent, false);
    }

    function transferInWithOrderId(
        uint256 _chainId,
        uint256 _logIndex,
        bytes32 _orderId,
        bytes memory _receiptProof
    ) external virtual nonReentrant whenNotPaused {
        require(!orderList[_orderId], "MOSV3: Order exist");
        IEvent.dataOutEvent memory outEvent = _transferInVerify(_chainId, _logIndex, _receiptProof);

        _transferIn(outEvent, false);
    }

    function transferInVerify(
        uint256 _chainId,
        uint256 _logIndex,
        bytes memory _receiptProof
    ) external virtual nonReentrant whenNotPaused {
        IEvent.dataOutEvent memory outEvent = _transferInVerify(_chainId, _logIndex, _receiptProof);

        _transferIn(outEvent, true);
    }

    function transferInVerifyWithOrderId(
        uint256 _chainId,
        uint256 _logIndex,
        bytes32 _orderId,
        bytes memory _receiptProof
    ) external virtual nonReentrant whenNotPaused {
        require(!orderList[_orderId], "MOSV3: Order exist");
        IEvent.dataOutEvent memory outEvent = _transferInVerify(_chainId, _logIndex, _receiptProof);

        _transferIn(outEvent, true);
    }

    function transferInVerified(
        bytes32 _orderId,
        uint256 _fromChain,
        bytes calldata _fromAddress,
        bytes calldata _messageData
    ) external virtual checkOrder(_orderId) nonReentrant whenNotPaused {
        (IEvent.dataOutEvent memory outEvent, MessageData memory msgData) = _getStoredMessage(
            _fromChain,
            _orderId,
            _fromAddress,
            _messageData
        );
        _messageIn(outEvent, msgData, false, false);
    }

    function retryMessageIn(
        uint256 _fromChain,
        bytes32 _orderId,
        bytes calldata _fromAddress,
        bytes calldata _messageData
    ) external nonReentrant whenNotPaused {
        (IEvent.dataOutEvent memory outEvent, MessageData memory msgData) = _getStoredMessage(
            _fromChain,
            _orderId,
            _fromAddress,
            _messageData
        );

        _messageIn(outEvent, msgData, true, true);
    }

    function _transferInVerify(
        uint256 _chainId,
        uint256 _logIndex,
        bytes memory _receiptProof
    ) internal returns (IEvent.dataOutEvent memory outEvent) {
        require(_chainId == relayChainId, "MOSV3: Invalid chain id");
        (bool success, string memory message, bytes memory logArray) = lightNode.verifyProofDataWithCache(
            _receiptProof
        );
        require(success, message);

        LogDecoder.txLog memory log = LogDecoder.decodeTxLog(logArray, _logIndex);
        require(relayContract == log.addr, "MOSV3: Invalid relay");

        bytes32 topic = abi.decode(log.topics[0], (bytes32));
        require(topic == EvmDecoder.MAP_MESSAGE_TOPIC, "MOSV3: Invalid topic");

        (, outEvent) = EvmDecoder.decodeDataLog(log);
    }

    function _transferIn(
        IEvent.dataOutEvent memory _outEvent,
        bool _verifyOnly
    ) internal checkOrder(_outEvent.orderId) {
        require(_outEvent.toChain == selfChainId, "MOSV3: Invalid target chain");

        if (_verifyOnly) {
            storedMessageList[_outEvent.orderId] = keccak256(
                abi.encodePacked(_outEvent.fromChain, _outEvent.fromAddress, _outEvent.messageData)
            );
            emit MessageVerified(
                _outEvent.fromChain,
                _outEvent.toChain,
                _outEvent.orderId,
                _outEvent.fromAddress,
                _outEvent.messageData
            );
        } else {
            MessageData memory msgData = abi.decode(_outEvent.messageData, (MessageData));
            _messageIn(_outEvent, msgData, false, false);
        }
    }

    function _notifyLightClient(uint256, bytes memory _data) internal override {
        lightNode.notifyLightClient(address(this), _data);
    }
}
