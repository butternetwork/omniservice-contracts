const { getOmniService, getChainList, getChain } = require("./utils/utils");

task("relay:deploy", "Deploy the upgradeable MOS contract and initialize it")
    .addParam("wrapped", "native wrapped token address")
    .addParam("lightnode", "lightNode contract address")
    .addOptionalParam("salt", "deploy contract salt", process.env.MOS_SALT, types.string)
    .addOptionalParam("factory", "mos contract address", process.env.DEPLOY_FACTORY, types.string)
    .setAction(async (taskArgs, hre) => {
        await hre.run("deploy:mos", {
            salt: taskArgs.salt,
            facotry: taskArgs.facotry,
        });

        await hre.run("relay:setClientManager", {
            client: taskArgs.client,
        });

        await hre.run("mos:setFeeService", {});
    });

task("relay:setClientManager", "Update client manager")
    .addOptionalParam("manager", "client manager contract", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let mos = await getOmniService(hre.network.config.chainId);
        let clientAddr = taskArgs.manager;
        if (taskArgs.manager === "") {
            let chain = await getChain(hre.network.name);
            clientAddr = chain.lightNode;
        }
        await (await mos.setLightClientManager(clientAddr)).wait();
        console.log(`set  LightClientManager ${await mos.lightClientManager()} successfully `);
    });

task("relay:registerChain", "Register altchain mos to relayOperation chain")
    .addParam("chain", "chain id or name")
    .addOptionalParam("address", "mos contract address", "latest", types.string)
    .addOptionalParam("type", "chain type, default 1", 1, types.int)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let relay = await getOmniService(hre.network.config.chainId);

        let chain = await getChain(taskArgs.chain);
        let mosAddr = taskArgs.address;
        if (taskArgs.address === "latest") {
            mosAddr = chain.mos;
        }

        let onchainMos = await relay.mosContracts(chain.chainId);
        if (onchainMos === mosAddr) {
            console.log(`chain [${chain.name}] mos addr no update`);
            return;
        }
        await (await relay.registerChain(chain.chainId, mosAddr, taskArgs.type)).wait();
        console.log(
            `register chain [${taskArgs.chain}] with mos [${await relay.mosContracts(taskArgs.chain)}] successfully `,
        );
    });

task("relay:update", "Register altchain mos to relay chain").setAction(async (taskArgs, hre) => {
    let chainList = await getChainList(hre.network.name);
    for (let chain of chainList) {
        if (chain.name === hre.network.name) {
            continue;
        }

        await hre.run("relay:registerChain", {
            chain: chain.name,
            address: chain.mos,
        });
    }

    await hre.run("fee:update", {});
});

task("relay:list", "List mos info")
    .addOptionalParam("mos", "The mos address, default mos", "mos", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let relay = await getOmniService(hre.network.config.chainId);

        let selfChainId = await relay.selfChainId();
        console.log("selfChainId:\t", selfChainId.toString());
        console.log("lightNode:\t", await relay.lightClientManager());
        console.log("feeService:\t", await relay.feeService());

        console.log("Impl:\t", await relay.getImplementation());

        let chainList = await getChainList(hre.network.config.chainId);
        console.log("\nRegister chains:");
        let chains = [selfChainId];
        for (let i = 0; i < chainList.length; i++) {
            let contract = await relay.mosContracts(chainList[i].chainId);
            if (contract !== "0x") {
                let chaintype = await relay.chainTypes(chainList[i].chainId);
                console.log(`type(${chaintype}) ${chainList[i].chainId}\t => ${contract} `);
            }
        }
        console.log("");

        await hre.run("fee:list", {});
    });
