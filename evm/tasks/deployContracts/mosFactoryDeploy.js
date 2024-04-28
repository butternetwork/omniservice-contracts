let {
    create,
    readFromFile,
    writeToFile,
    zksyncDeploy,
    needVerify
} = require("../../utils/helper.js");

let {
    getTronWeb,
    deploy_contract,
} = require("../utils/tronUtil.js");

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

module.exports = async (taskArgs, hre) => {
    const {deploy} = hre.deployments
    const accounts = await ethers.getSigners()
    const deployer = accounts[0];

    console.log("deployer address:", deployer.address);

    let implContract;
    let implAddr;
    let IMPL;
    let proxyAddr;

    let deployment = await readFromFile(hre.network.name);

    if(hre.network.config.chainId === 212 || hre.network.config.chainId === 22776){
        implContract = "MapoServiceRelayV3"
    }else {
        implContract = "MapoServiceV3"
    }

    if(hre.network.config.chainId === 324 || hre.network.config.chainId === 300){
        implAddr = await zksyncDeploy(implContract, [], hre);
        IMPL = await ethers.getContractAt(implContract,implAddr)
        let data = IMPL.interface.encodeFunctionData("initialize", [taskArgs.wrapped, taskArgs.lightnode]);
        proxyAddr = await zksyncDeploy("MapoServiceProxyV3", [implAddr, data], hre);
    }else if (hre.network.config.chainId === 728126428 || hre.network.config.chainId === 3448148188){
        let tronWeb = await getTronWeb(hre.network.name);
        console.log("deployer :", tronWeb.defaultAddress);

        let wtokenHex = tronWeb.address.toHex(taskArgs.wrapped).replace(/^(41)/, "0x");
        let lightnodeHex = tronWeb.address.toHex(taskArgs.lightnode).replace(/^(41)/, "0x");
        let deployer = tronWeb.defaultAddress.hex.replace(/^(41)/, "0x");

        console.log(`deployer : ${deployer}`);
        console.log(`wToken : ${wtoken} (${wtokenHex})`);
        console.log(`lightnode : ${lightnode} (${lightnodeHex})`);

        let impl = await deploy_contract(hre.artifacts, "MapoServiceV3", [], tronWeb);

        let interface = new ethers.utils.Interface([
            "function initialize(address _wToken, address _lightNode) external",
        ]);

        let data = interface.encodeFunctionData("initialize", [wtokenHex, lightnodeHex]);
        proxyAddr = await deploy_contract(hre.artifacts, "MapoServiceProxyV3", [impl, data], tronWeb);

        deployment[network]["mosProxy"] = tronWeb.address.fromHex(proxyAddr);

    }else {
        await deploy(implContract, {
            from: deployer,
            args: [],
            log: true,
            contract: implContract,
        });
        let impl = await deployments.get(implContract);
        implAddr = impl.address;
        IMPL = await ethers.getContractAt(implContract,implAddr)
        let data = IMPL.interface.encodeFunctionData("initialize", [taskArgs.wrapped, taskArgs.lightnode]);
        let mosProxy = await ethers.getContractFactory('MapoServiceProxyV3');
        let initData = await ethers.utils.defaultAbiCoder.encode(
            ["address","bytes"],
            [IMPL.address,data]
        )
        let createResult = await create(taskArgs.salt, mosProxy.bytecode, initData);
        if (!createResult[1]) {
            return;
        }
        proxyAddr = createResult[0];

        deployment[hre.network.name]["mosProxy"] = proxyAddr;
    }

    console.log(`Deploy ${implContract} proxy address ${proxyAddr} successful`);

    await writeToFile(deployment);

    if (needVerify(hre.network.config.chainId)) {
        sleep(10000);

        await hre.run("verify:verify", {
            address: proxyAddr,
            constructorArguments: [implAddr, data],
            contract: "contracts/MapoServiceProxyV3.sol:MapoServiceProxyV3",
        });
        if(hre.network.config.chainId === 212 || hre.network.config.chainId === 22776){
            await hre.run("verify:verify", {
                address: implAddr,
                constructorArguments: [],
                contract: "contracts/MapoServiceRelayV3.sol:MapoServiceRelayV3",
            });
        }else {
            await hre.run("verify:verify", {
                address: implAddr,
                constructorArguments: [],
                contract: "contracts/MapoServiceV3.sol:MapoServiceV3",
            });
        }

    }
}