const MessageFeeList = require('../../configs/MessageFeeConfig.js')

module.exports = async (taskArgs,hre) => {
    const accounts = await ethers.getSigners()
    const deployer = accounts[0];

    console.log("deployer address:",deployer.address);

    console.log("fee salt:", taskArgs.salt);

    let factory = await ethers.getContractAt("IDeployFactory",taskArgs.factory)

    console.log("deploy factory address:",factory.address)

    let hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(taskArgs.salt));

    let feeServiceAddress = await factory.getAddress(hash);

    console.log("fee service address:", feeServiceAddress)

    let feeService = await ethers.getContractAt('FeeService', feeServiceAddress);
    let baseGas;
    if (taskArgs.chainid === "later") {
        for (let chainListFee of Object.entries(MessageFeeList[hre.network.name].chainIdList)) {
            baseGas = await feeService.baseGas(chainListFee[0])
            if(baseGas == chainListFee[1].baseGas){
                console.log(`Skip to ${chainListFee[0]} baseGas is: ${baseGas}`)
            }else {
                await (await feeService.connect(deployer).setBaseGas(chainListFee[0],chainListFee[1].baseGas)).wait();
                console.log(`Update to ${chainListFee[0]} baseGas is: ${await feeService.baseGas(chainListFee[0])}`)
            }
        }
    }else {
        baseGas = await feeService.baseGas(taskArgs.chainid)
        if(baseGas == MessageFeeList[hre.network.name].chainIdList[taskArgs.chainid].baseGas){
            console.log(`Skip to ${taskArgs.chainid} baseGas is: ${baseGas}`)
        }else {
            await (await feeService.connect(deployer).setBaseGas(taskArgs.chainid,MessageFeeList[hre.network.name].chainIdList[taskArgs.chainid].baseGas)).wait();
            console.log(`Update to ${taskArgs.chainid} baseGas is: ${await feeService.baseGas(taskArgs.chainid)}`)
        }
    }

    let gasPrice;
    if (taskArgs.token === "later") {
        for (let chainListFee of Object.entries(MessageFeeList[hre.network.name].chainIdList)) {
            for(let tokenListFee of Object.entries(chainListFee[1].chainGasPrice)){
                gasPrice = await feeService.chainGasPrice(chainListFee[0],tokenListFee[0])
                if(gasPrice == tokenListFee[1]){
                    console.log(`Skip chain: ${chainListFee[0]}, token: ${tokenListFee[0]}, chainGasPrice is: ${gasPrice}`)
                }else{
                    await (await feeService.connect(deployer).setChainGasPrice(chainListFee[0],tokenListFee[0],tokenListFee[1])).wait();
                    console.log(`Update chain: ${chainListFee[0]}, token: ${tokenListFee[0]}, chainGasPrice is: ${await feeService.chainGasPrice(chainListFee[0],tokenListFee[0])}`)
                }
            }
        }
    }else {
        for (let chainListFee of Object.entries(MessageFeeList[hre.network.name].chainIdList)) {
            gasPrice = await feeService.chainGasPrice(chainListFee[0],taskArgs.token)
            if(gasPrice == chainListFee[1].chainGasPrice[taskArgs.token]){
                console.log(`Skip chain: ${chainListFee[0]}, token: ${taskArgs.token}, chainGasPrice is: ${gasPrice}`)
            }else{
                await (await feeService.connect(deployer).setChainGasPrice(chainListFee[0],taskArgs.token,chainListFee[1].chainGasPrice[taskArgs.token])).wait();
                console.log(`Update chain: ${chainListFee[0]}, token: ${taskArgs.token}, chainGasPrice is: ${await feeService.chainGasPrice(chainListFee[0],taskArgs.token)}`)
            }
        }
    }

}