const { getChain, getOmniService } = require("./utils/utils");
const { isTron } = require("../utils/helper");

task("mos:deploy", "Deploy the upgradeable MOS contract and initialize it")
    .addOptionalParam("client", "lightNode contract address", "", types.string)
    .addOptionalParam("relaychain", "relay chain id", 22776, types.int)
    .addOptionalParam("relayaddress", "relay contract address", "", types.string)
    .addOptionalParam("fee", "fee service", "", types.string)
    .addOptionalParam("salt", "deploy contract salt", "", types.string)
    .addOptionalParam("factory", "mos contract address", DEPLOY_FACTORY, types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        await hre.run("deploy:mos", {
            salt: taskArgs.salt,
            facotry: taskArgs.facotry,
        });

        await hre.run("mos:setRelay", {
            chain: taskArgs.relaychain,
        });

        await hre.run("mos:setLightClient", {
            client: taskArgs.client,
        });

        await hre.run("mos:setFeeService", {
            client: taskArgs.client,
        });
    });

task("mos:setRelay", "Initialize MOSRelay address for MOS")
    .addOptionalParam("chain", "relay chain id", 22776, types.int)
    .addOptionalParam("relay", "mos relay contract address", "latest", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let mos = await getOmniService(hre.network.config.chainId, "");

        let relayAddr = taskArgs.relay;
        if (taskArgs.relay === "latest") {
            let relayChain = await getChain(taskArgs.chain);
            relayAddr = relayChain["mos"];
        }
        if (isTron(hre.network.config.chainId)) {
            await mos.setRelayContract(taskArgs.chain, relayAddr).send();
            console.log(
                `set  relay ${await mos.relayContract().call()} with chain id ${await mos.relayChainId().call()} successfully `,
            );
        } else {
            await (await mos.setRelayContract(taskArgs.chain, relayAddr)).wait();
            console.log(
                `set  relay ${await mos.relayContract()} with chain id ${await mos.relayChainId()} successfully `,
            );
        }
    });

task("mos:setLightClient", "Initialize MOSRelay address for MOS")
    .addOptionalParam("client", "light client address", "latest", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let mos = await getOmniService(hre.network.config.chainId, "");
        let clientAddr = taskArgs.client;
        if (taskArgs.client === "") {
            let chain = await getChain(hre.network.name);
            clientAddr = chain.lightNode;
        }

        if (isTron(hre.network.config.chainId)) {
            await mos.setLightClient(clientAddr).send();
            console.log(`set LightClient ${await mos.lightNode().call()} successfully `);
        } else {
            await (await mos.setLightClient(clientAddr)).wait();
            console.log(`set LightClient ${await mos.lightNode()} successfully `);
        }
    });

task("mos:setFeeService", "Set message fee service address ")
    .addOptionalParam("fee", "message fee address", "latest", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let mos = await getOmniService(hre.network.config.chainId, "");

        let feeService = taskArgs.fee;
        if (taskArgs.fee === "latest") {
            let chain = await getChain(hre.network.name);
            feeService = chain["feeService"];
        }

        if (isTron(hre.network.config.chainId)) {
            await mos.setFeeService(feeService).send();
            console.log(`set FeeService ${await mos.feeService().call()} successfully `);
        } else {
            await (await mos.setFeeService(feeService)).wait();
            console.log(`set FeeService ${await mos.feeService()} successfully `);
        }
    });

task("mos:list", "List mos info")
    .addOptionalParam("mos", "The mos address, default mos", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let mos = await getOmniService(hre.network.config.chainId, taskArgs.mos);

        let selfChainId = await mos.selfChainId();
        console.log("selfChainId:\t", selfChainId.toString());
        console.log("lightNode:\t", await mos.lightNode());
        console.log("feeService:\t", await mos.feeService());

        console.log("relay chain:\t", await mos.relayChainId());
        console.log("relay contract:\t", await mos.relayContract());
        console.log("Impl:\t", await mos.getImplementation());

        console.log("");

        await hre.run("fee:list", {});
    });
