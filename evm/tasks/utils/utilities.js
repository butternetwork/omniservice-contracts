const {getTronWeb} = require("../utils/tronUtil");

exports.getContractImpl = async function (chainId,contractAddress) {

    let mos;
    if (chainId === 212 || chainId === 22776) {
        mos = await ethers.getContractAt("MapoServiceRelayV3",contractAddress)
    } else if(chainId === 728126428 || chainId === 3448148188 ) {
        let network;
        if (chainId === 728126428){
            network = "Tron"
        }else if (chainId === 3448148188){
            network = "TronTest"
        }
        let tronWeb = await getTronWeb(network);
        let Mos = await artifacts.readArtifact("MapoServiceV3");
        mos = await tronWeb.contract(Mos.abi, contractAddress);
    }else{
        mos = await ethers.getContractAt("MapoServiceV3",contractAddress)
    }

    return mos;
}

exports.getFeeContractImpl = async function (chainId,contractAddress) {
    let feeService;
    if(chainId === 728126428 || chainId === 3448148188 ) {
        let network;
        if (chainId === 728126428){
            network = "Tron"
        }else if (chainId === 3448148188){
            network = "TronTest"
        }
        let tronWeb = await getTronWeb(network);
        let FeeService = await artifacts.readArtifact("FeeService");
        feeService = await tronWeb.contract(FeeService.abi, contractAddress);
    }else{
        feeService = await ethers.getContractAt("FeeService",contractAddress)
    }

    return feeService;
}


exports.getEvmAddress = async function (network,tronAddress) {
    let tronWeb = await getTronWeb(network);

    let evmAddress = tronWeb.address.toHex(tronAddress).replace(/^(41)/, "0x");

    return evmAddress;

}

exports.isTron = function (chainId) {
    if(chainId === 728126428 || chainId === 3448148188 ){
        return true;
    }else{
        return false;
    }
}