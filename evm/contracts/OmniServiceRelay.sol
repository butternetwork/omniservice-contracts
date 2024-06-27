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

    function setLightClientManager(address _managerAddress) external onlyOwner checkAddress(_managerAddress) {
        lightClientManager = ILightClientManager(_managerAddress);
        emit SetLightClientManager(_managerAddress);
    }

    function registerChain(uint256 _chainId, bytes memory _address, ChainType _type) external onlyOwner {
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

    function transferOut(
        uint256 _toChain,
        bytes memory _messageData,
        address _feeToken
    ) external payable override nonReentrant whenNotPaused returns (bytes32) {
        bytes32 orderId = _transferOut(_toChain, _messageData, _feeToken);

        _notifyLightClient(_toChain, bytes(""));

        return orderId;
    }

    function transferInWithIndex(
        uint256 _chainId,
        uint256 _logIndex,
        bytes memory _receiptProof
    ) external override nonReentrant whenNotPaused {
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
            require(outEvent.toChain != 0, "MOSV3: Invalid target chain id");
            require(Utils.checkBytes(mosContract, mosContracts[_chainId]), "MOSV3: Invalid mos contract");
            // TODO support near
        } else if (chainTypes[_chainId] == ChainType.EVM) {
            LogDecoder.txLog memory log = LogDecoder.decodeTxLog(logArray, _logIndex);
            bytes32 topic = abi.decode(log.topics[0], (bytes32));
            require(topic == EvmDecoder.MAP_MESSAGE_TOPIC, "MOSV3: Invalid topic");
            bytes memory mosContract = Utils.toBytes(log.addr);
            require(Utils.checkBytes(mosContract, mosContracts[_chainId]), "MOSV3: Invalid mos contract");

            (, IEvent.dataOutEvent memory outEvent) = EvmDecoder.decodeDataLog(log);

            require(_chainId == outEvent.fromChain, "MOSV3: Invalid chain id");

            MessageData memory msgData = abi.decode(outEvent.messageData, (MessageData));
            _tryMessageIn(outEvent, msgData, false);
        } else {
            require(false, "MOSV3: Invalid chain type");
        }
    }

    function _tryMessageIn(
        IEvent.dataOutEvent memory _outEvent,
        MessageData memory _msgData,
        bool _retry
    ) internal override {
        if (_outEvent.toChain == selfChainId) {
            _messageIn(_outEvent, _msgData, _retry);
        } else {
            _messageRelay(_outEvent, _msgData);
        }
    }

    function _messageRelay(IEvent.dataOutEvent memory _outEvent, MessageData memory _msgData) internal {
        if (!_msgData.relay) {
            _notifyMessageOut(_outEvent, _outEvent.messageData);
            return;
        }
        (bool success, bytes memory returnData) = _messageExecute(_outEvent, _msgData, true);
        if (!success) {
            _storeMessageData(_outEvent, returnData);
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
        _notifyLightClient(_outEvent.toChain, bytes(""));
        emit mapMessageOut(_outEvent.fromChain, _outEvent.toChain, _outEvent.orderId, _outEvent.fromAddress, _payload);
    }

    function _notifyLightClient(uint256 _chainId, bytes memory _data) internal {
        lightClientManager.notifyLightClient(_chainId, address(this), _data);
    }
}
