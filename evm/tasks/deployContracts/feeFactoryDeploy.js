const {
    readFromFile,
    zksyncDeploy,
    create,
    writeToFile,
    needVerify
} = require("../../utils/helper");

let {
    getTronWeb,
    deploy_contract,
} = require("../utils/tronUtil.js");

module.exports = async (taskArgs, hre) => {
    const {deploy} = hre.deployments
    const accounts = await ethers.getSigners()
    const deployer = accounts[0];

    console.log("deployer address:", deployer.address);


    let implContract = "FeeService";
    let implAddr;

    let deployment = await readFromFile(hre.network.name);

    if(hre.network.config.chainId === 324 || hre.network.config.chainId === 300){
        implAddr = await zksyncDeploy(implContract, [], hre);
        deployment[hre.network.name]["feeService"] = implAddr;
    }else if (hre.network.config.chainId === 728126428 || hre.network.config.chainId === 3448148188){
        let tronWeb = await getTronWeb(hre.network.name);
        console.log("deployer :", tronWeb.defaultAddress);

        let wtokenHex = tronWeb.address.toHex(taskArgs.wrapped).replace(/^(41)/, "0x");
        let lightnodeHex = tronWeb.address.toHex(taskArgs.lightnode).replace(/^(41)/, "0x");
        let deployer = tronWeb.defaultAddress.hex.replace(/^(41)/, "0x");

        console.log(`deployer : ${deployer}`);
        console.log(`wToken : ${wtoken} (${wtokenHex})`);
        console.log(`lightnode : ${lightnode} (${lightnodeHex})`);

        implAddr = await deploy_contract(hre.artifacts, implContract, [], tronWeb);

        deployment[hre.network.name]["feeService"] = tronWeb.address.fromHex(implAddr);

    }else {

        let FeeService = await ethers.getContractFactory(implContract);

        let createResult = await create(taskArgs.salt, FeeService.bytecode, "0x");
        if (!createResult[1]) {
            return;
        }
        implAddr = createResult[0];

        deployment[hre.network.name]["feeService"] = implAddr;
    }

    console.log(`Deploy ${implContract} address ${implAddr} successful`);

    await writeToFile(deployment);

    if (needVerify(hre.network.config.chainId)) {
        sleep(10000);

        await hre.run("verify:verify", {
            address: implAddr,
            constructorArguments: [],
            contract: "contracts/FeeService.sol:FeeService",
        });


    }

}
