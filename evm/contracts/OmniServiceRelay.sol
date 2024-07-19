// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "@mapprotocol/protocol/contracts/interface/ILightClientManager.sol";
import "./utils/NearDecoder.sol";
import "./utils/EvmDecoder.sol";
import "./abstract/OmniServiceCore.sol";

contract OmniServiceRelay is OmniServiceCore {
    ILightClientManager public lightClientManager;

    mapping(uint256 => bytes) public mosContracts;
    mapping(uint256 => ChainType) public chainTypes;

    event SetLightClientManager(address lightClient);
    event RegisterChain(uint256 _chainId, bytes _address, ChainType _type);

    function setLightClientManager(
        address _managerAddress
    ) external onlyRole(MANAGER_ROLE) checkAddress(_managerAddress) {
        lightClientManager = ILightClientManager(_managerAddress);
        emit SetLightClientManager(_managerAddress);
    }

    function registerChain(uint256 _chainId, bytes memory _address, ChainType _type) external onlyRole(MANAGER_ROLE) {
        mosContracts[_chainId] = _address;
        chainTypes[_chainId] = _type;
        emit RegisterChain(_chainId, _address, _type);
    }

    function getOrderStatus(
        uint256 _chainId,
        uint256 _blockNum,
        bytes32 _orderId
    ) external view override returns (bool exists, bool verifiable, uint256 nodeType) {
        exists = orderList[_orderId];
        verifiable = lightClientManager.isVerifiable(_chainId, _blockNum, bytes32(""));
        nodeType = lightClientManager.nodeType(_chainId);
    }

    function transferInWithIndex(
        uint256 _chainId,
        uint256 _logIndex,
        bytes memory _receiptProof
    ) external nonReentrant whenNotPaused {
        (bool success, string memory message, bytes memory logArray) = lightClientManager.verifyProofDataWithCache(
            _chainId,
            _receiptProof
        );
        require(success, message);
        if (chainTypes[_chainId] == ChainType.NEAR) {
            (bytes memory mosContract, IEvent.transferOutEvent[] memory outEvents) = NearDecoder.decodeNearLog(
                logArray
            );
            IEvent.transferOutEvent memory outEvent = outEvents[_logIndex];
            require(outEvent.toChain != 0, "MOSV3: invalid target chain id");
            require(Utils.checkBytes(mosContract, mosContracts[_chainId]), "MOSV3: invalid mos contract");
            // TODO support near
        } else if (chainTypes[_chainId] == ChainType.EVM) {
            LogDecoder.txLog memory log = LogDecoder.decodeTxLog(logArray, _logIndex);
            bytes32 topic = abi.decode(log.topics[0], (bytes32));
            require(topic == EvmDecoder.MAP_MESSAGE_TOPIC, "MOSV3: invalid topic");
            bytes memory mosContract = Utils.toBytes(log.addr);
            require(Utils.checkBytes(mosContract, mosContracts[_chainId]), "MOSV3: invalid mos contract");

            (, IEvent.dataOutEvent memory outEvent) = EvmDecoder.decodeDataLog(log);
            _transferIn(_chainId, outEvent);
        } else {
            require(false, "MOSV3: invalid chain type");
        }
    }

    function transferInWithOrderId(
        uint256 _chainId,
        uint256 _logIndex,
        bytes32 _orderId,
        bytes memory _receiptProof
    ) external nonReentrant whenNotPaused {
        require(!orderList[_orderId],"OS: order exist");
        (bool success, string memory message, bytes memory logArray) = lightClientManager.verifyProofDataWithCache(
            _chainId,
            _receiptProof
        );
        require(success, message);
        if (chainTypes[_chainId] == ChainType.NEAR) {
            (bytes memory mosContract, IEvent.transferOutEvent[] memory outEvents) = NearDecoder.decodeNearLog(
                logArray
            );
            IEvent.transferOutEvent memory outEvent = outEvents[_logIndex];
            require(outEvent.toChain != 0, "MOSV3: invalid target chain id");
            require(Utils.checkBytes(mosContract, mosContracts[_chainId]), "MOSV3: invalid mos contract");
            // TODO support near
        } else if (chainTypes[_chainId] == ChainType.EVM) {
            LogDecoder.txLog memory log = LogDecoder.decodeTxLog(logArray, _logIndex);
            bytes32 topic = abi.decode(log.topics[0], (bytes32));
            require(topic == EvmDecoder.MAP_MESSAGE_TOPIC, "MOSV3: invalid topic");
            bytes memory mosContract = Utils.toBytes(log.addr);
            require(Utils.checkBytes(mosContract, mosContracts[_chainId]), "MOSV3: invalid mos contract");

            (, IEvent.dataOutEvent memory outEvent) = EvmDecoder.decodeDataLog(log);
            _transferIn(_chainId, outEvent);
        } else {
            require(false, "MOSV3: invalid chain type");
        }
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

        if (outEvent.toChain == selfChainId) {
            _messageIn(outEvent, msgData, true, true);
        } else {
            _messageRelay(outEvent, msgData, true);
        }
    }

    function _transferIn(
        uint256 _chainId,
        IEvent.dataOutEvent memory _outEvent
    ) internal checkOrder(_outEvent.orderId) {
        require(_chainId == _outEvent.fromChain, "MOSV3: invalid from chain");
        MessageData memory msgData = abi.decode(_outEvent.messageData, (MessageData));
        if (_outEvent.toChain == selfChainId) {
            _messageIn(_outEvent, msgData, true, false);
        } else {
            _messageRelay(_outEvent, msgData, false);
        }
    }

    function _messageRelay(IEvent.dataOutEvent memory _outEvent, MessageData memory _msgData, bool _retry) internal {
        if (!_msgData.relay) {
            _notifyMessageOut(_outEvent, _outEvent.messageData);
            return;
        }
        (bool success, bytes memory returnData) = _messageExecute(_outEvent, _msgData, true);
        if (!success) {
            if (_retry) {
                revert(string(returnData));
            } else {
                _storeMessageData(_outEvent, returnData);
            }
            return;
        }
        MessageData memory msgData = abi.decode(returnData, (MessageData));
        if (msgData.gasLimit != _msgData.gasLimit || msgData.value != 0) {
            msgData.gasLimit = _msgData.gasLimit;
            msgData.value = 0;
            returnData = abi.encode(msgData);
        }
        _notifyMessageOut(_outEvent, returnData);
    }

    function _notifyMessageOut(IEvent.dataOutEvent memory _outEvent, bytes memory _payload) internal {
        emit MessageOut(_outEvent.fromChain, _outEvent.toChain, _outEvent.orderId, _outEvent.fromAddress, _payload);

        _notifyLightClient(_outEvent.toChain, bytes(""));
    }

    function _notifyLightClient(uint256 _chainId, bytes memory _data) internal override {
        lightClientManager.notifyLightClient(_chainId, address(this), _data);
    }
}
