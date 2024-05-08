const MessageFeeList = require('../../configs/MessageFeeConfig.js')
const {
    readFromFile,
} = require("../../utils/helper");

module.exports = async (taskArgs,hre) => {
    const accounts = await ethers.getSigners()
    const deployer = accounts[0];

    console.log("deployer address:",deployer.address);

    let contractConfig = await readFromFile(hre.network.name);

    console.log("fee salt:", taskArgs.feesalt);

    let factory = await ethers.getContractAt("IDeployFactory",taskArgs.factory)

    console.log("deploy factory address:",factory.address)

    let hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(taskArgs.feesalt));

   // let feeServiceAddress = await factory.getAddress(hash);
    let feeServiceAddress = await contractConfig[hre.network.name]["feeService"];

    console.log("fee service address:", feeServiceAddress)

    let feeService = await ethers.getContractAt('FeeService', feeServiceAddress);

    let currentReceiver = await feeService.feeReceiver();

    if (currentReceiver == MessageFeeList[hre.network.name].feeRecevier){
        console.log(`Skip chain ${hre.network.name} feeRecevier address: ${currentReceiver}`);
    }else{
        await (await feeService.connect(deployer).setFeeReceiver(MessageFeeList[hre.network.name].feeRecevier)).wait();
        console.log(`Update chain ${hre.network.name} change feeRecevier address: ${await feeService.feeReceiver()}`);
    }

}