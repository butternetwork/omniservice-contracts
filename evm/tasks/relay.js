const { getOmniService, getChainList, getChain } = require("./utils/utils");

task("relay:deploy", "Deploy the upgradeable MOS contract and initialize it")
    .addOptionalParam("client", "lightNode contract address", "", types.string)
    .addOptionalParam("salt", "deploy contract salt", "", types.string)
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
        console.log("setClientManager deployer address:", deployer.address);

        let mos = await getOmniService(hre, "");
        let clientAddr = taskArgs.manager;
        if (clientAddr === "") {
            let chain = await getChain(hre.network.name, hre.network.name);

            clientAddr = chain.lightNode;
        }

        let onchainAddr = await mos.lightClientManager();
        if (onchainAddr.toLowerCase() === clientAddr.toLowerCase()) {
            console.log(`lightclient manager no update`);
            return;
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
        console.log("registerChain deployer address:", deployer.address);

        let relay = await getOmniService(hre, "");

        let chain = await getChain(hre.network.name, taskArgs.chain);
        let mosAddr = taskArgs.address;
        if (taskArgs.address === "latest") {
            mosAddr = chain.mos;
        }

        let onchainMos = await relay.mosContracts(chain.chainId);
        if (onchainMos.toLowerCase() === mosAddr.toLowerCase()) {
            console.log(`chain [${chain.name}] mos addr no update`);
            return;
        }
        await (await relay.registerChain(chain.chainId, mosAddr, taskArgs.type)).wait();
        console.log(
            `register chain [${taskArgs.chain}] with mos [${await relay.mosContracts(chain.chainId)}] successfully `,
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
        console.log("");
    }

    await hre.run("fee:update", {});
});

task("relay:list", "List mos info")
    .addOptionalParam("mos", "The mos address, default mos", "mos", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let relay = await getOmniService(hre, "");

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
        await hre.run("mos:listMember", {
            role: "admin",
        });
        await hre.run("mos:listMember", {
            role: "manager",
        });
        await hre.run("mos:listMember", {
            role: "upgrader",
        });
        console.log("");

        await hre.run("fee:list", {});
    });

