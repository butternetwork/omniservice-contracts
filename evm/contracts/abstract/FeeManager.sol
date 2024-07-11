// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../interface/IFeeService.sol";

abstract contract FeeManager is IFeeService {
    address public feeReceiver;
    mapping(uint256 => uint256) public baseGas; // chainid => gas
    mapping(uint256 => mapping(address => uint256)) public chainGasPrice; // chain => (feeToken => gasPrice)

    event SetBaseGas(uint256 chainId, uint256 basLimit);
    event SetChainGasPrice(uint256 chainId, uint256 chainPrice);
    event SetFeeReceiver(address receiver);

    function getFeeInfo(
        uint256 _chainId,
        address _feeToken
    ) external view override returns (uint256 _base, uint256 _gasPrice, address _receiverAddress) {
        return (baseGas[_chainId], chainGasPrice[_chainId][_feeToken], feeReceiver);
    }

    function _setBaseGas(uint256[] memory _chainList, uint256[] memory _limitList) internal {
        require(_chainList.length == _limitList.length, "MOSV3: length mismatch");
        for (uint256 i = 0; i < _chainList.length; i++) {
            baseGas[_chainList[i]] = _limitList[i];
            emit SetBaseGas(_chainList[i], _limitList[i]);
        }
    }

    function _setChainGasPrice(address _token, uint256[] memory _chainList, uint256[] memory _priceList) internal {
        require(_chainList.length == _priceList.length, "MOSV3: length mismatch");
        for (uint256 i = 0; i < _chainList.length; i++) {
            chainGasPrice[_chainList[i]][_token] = _priceList[i];
            emit SetChainGasPrice(_chainList[i], _priceList[i]);
        }
    }

    function _setFeeReceiver(address _receiver) internal {
        feeReceiver = _receiver;
        emit SetFeeReceiver(_receiver);
    }
}
