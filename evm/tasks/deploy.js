const { verify } = require("../utils/verify");
const { getOmniService, readFromFile, writeToFile } = require("./utils/utils");

const { isTron, create } = require("../utils/helper");

task("deploy:fee", "Deploy the upgradeable MOS contract and initialize it")
    .addOptionalParam("salt", "deploy contract salt", process.env.FEE_SALT, types.string)
    .addOptionalParam("factory", "mos contract address", process.env.DEPLOY_FACTORY, types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let deployment = await readFromFile(hre.network.config.chainId);

        let implAddr = create(hre, deployer, "FeeService", [], [], taskArgs.salt);

        deployment[hre.network.config.chainId]["chainName"] = hre.network.name;
        deployment[hre.network.config.chainId]["feeService"] = implAddr;

        await writeToFile(deployment);

        await verify(implAddr, [], "contracts/FeeService.sol:FeeService", hre.network.config.chainId, true);
    });

task("deploy:mos", "Deploy the upgradeable MOS contract and initialize it")
    .addOptionalParam("salt", "deploy contract salt", "", types.string)
    .addOptionalParam("factory", "mos contract address", DEPLOY_FACTORY, types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let deployment = await readFromFile(hre.network.config.chainId);

        let implContract;
        if (hre.network.config.chainId === 212 || hre.network.config.chainId === 22776) {
            implContract = "OmniServiceRelay";
        } else {
            implContract = "OmniService";
        }
        let implAddr = await create(hre, deployer, implContract, [], [], "");

        let MOS = await ethers.getContractFactory(implContract);
        let data = await MOS.interface.encodeFunctionData("initialize", [deployer.address]);

        let proxyAddr = await create(
            hre,
            deployer,
            "OmniServiceProxy",
            ["address", "bytes"],
            [implAddr, data],
            taskArgs.salt,
        );

        deployment[hre.network.config.chainId]["chainName"] = hre.network.name;
        deployment[hre.network.config.chainId]["mosAddress"] = proxyAddr;
        await writeToFile(deployment);

        await verify(implAddr, [], "contracts/OmniService.sol:OmniService", hre.network.config.chainId, true);

        await verify(
            proxyAddr,
            [implAddr, data],
            "contracts/OmniServiceProxy.sol:OmniServiceProxy",
            hre.network.config.chainId,
            true,
        );
    });

task("deploy:upgrade", "upgrade mos evm contract in proxy")
    .addOptionalParam("mos", "deploy contract salt", "latest", types.string)
    .addOptionalParam("impl", "impl", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let implContract;
        if (hre.network.config.chainId === 212 || hre.network.config.chainId === 22776) {
            implContract = "OmniServiceRelay";
        } else {
            implContract = "OmniService";
        }

        let proxy = await getOmniService(hre, taskArgs.mos);

        let implAddr = taskArgs.impl;
        if (implAddr === "") {
            implAddr = await create(hre, deployer, implContract, [], [], "");
        }

        if (isTron(hre.network.config.chainId)) {
            await proxy.upgradeTo(impl).send();
            console.log("impl address:", await proxy.getImplementation().call());
        } else {
            await (await proxy.upgradeTo(implAddr)).wait();
            console.log("impl address:", await proxy.getImplementation());
        }

        await verify(implAddr, [], "contracts/OmniService.sol:OmniService", hre.network.config.chainId, true);

        console.log(`upgrade MOS success`);
    });
