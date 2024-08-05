const { getChain, getOmniService, getChainList } = require("./utils/utils");
const { isTron } = require("../utils/helper");

task("mos:deploy", "Deploy the upgradeable MOS contract and initialize it")
    .addOptionalParam("client", "lightNode contract address", "", types.string)
    .addParam("relaychain", "relay chain id")
    .addOptionalParam("relay", "relay contract address", "", types.string)
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
            relay: taskArgs.relay,
        });

        await hre.run("mos:setLightClient", {
            client: taskArgs.client,
        });

        await hre.run("mos:setFeeService", {
            client: taskArgs.fee,
        });
    });

task("mos:setRelay", "Initialize MOSRelay address for MOS")
    .addParam("chain", "relay chain id")
    .addOptionalParam("relay", "mos relay contract address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("setRelay deployer address:", deployer.address);

        let mos = await getOmniService(hre, "");

        let relayAddr = taskArgs.relay;
        if (taskArgs.relay === "") {
            let relayChain = await getChain(hre.network.name, taskArgs.chain);
            relayAddr = relayChain["mos"];
        }

        if (isTron(hre.network.config.chainId)) {
            let onchainRelay = await mos.relayContract().call();
            if (onchainRelay === relayAddr) {
                console.log(`relay no update`);
                return;
            }
            await mos.setRelayContract(taskArgs.chain, relayAddr).send();
            console.log(
                `set  relay ${await mos.relayContract().call()} with chain id ${await mos.relayChainId().call()} successfully `,
            );
        } else {
            let onchainRelay = await mos.relayContract();
            if (onchainRelay.toLowerCase() === relayAddr.toLowerCase()) {
                console.log(`relay no update`);
                return;
            }
            await (await mos.setRelayContract(taskArgs.chain, relayAddr)).wait();
            console.log(
                `set  relay ${await mos.relayContract()} with chain id ${await mos.relayChainId()} successfully `,
            );
        }
    });

task("mos:setLightClient", "Initialize MOSRelay address for MOS")
    .addOptionalParam("client", "light client address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("setLightClient deployer address:", deployer.address);

        let mos = await getOmniService(hre, "");
        let clientAddr = taskArgs.client;
        if (taskArgs.client === "") {
            let chain = await getChain(hre.network.name, hre.network.config.chainId);
            clientAddr = chain.lightNode;
        }

        if (isTron(hre.network.config.chainId)) {
            let onchainAddr = await mos.lightNode().call();
            if (onchainAddr === clientAddr) {
                console.log(`client no update`);
                return;
            }
            await mos.setLightClient(clientAddr).send();
            console.log(`set LightClient ${await mos.lightNode().call()} successfully `);
        } else {
            let onchainAddr = await mos.lightNode();
            if (onchainAddr.toLowerCase() === clientAddr.toLowerCase()) {
                console.log(`client no update`);
                return;
            }
            console.log(`${onchainAddr} => ${clientAddr}`);
            await (await mos.setLightClient(clientAddr)).wait();
            console.log(`set LightClient ${await mos.lightNode()} successfully `);
        }
    });

task("mos:setFeeService", "Set message fee service address ")
    .addOptionalParam("fee", "message fee address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("setFeeService deployer address:", deployer.address);

        let mos = await getOmniService(hre, "");

        let feeService = taskArgs.fee;
        if (taskArgs.fee === "") {
            let chain = await getChain(hre.network.name, hre.network.config.chainId);
            feeService = chain["feeService"];
        }

        if (isTron(hre.network.config.chainId)) {
            let onchainAddr = await mos.feeService().call();
            if (onchainAddr === feeService) {
                console.log(`feeService no update`);
                return;
            }
            await mos.setFeeService(feeService).send();
            console.log(`set FeeService ${await mos.feeService().call()} successfully `);
        } else {
            let onchainAddr = await mos.feeService();
            if (onchainAddr.toLowerCase() === feeService.toLowerCase()) {
                console.log(`feeService no update`);
                return;
            }
            await (await mos.setFeeService(feeService)).wait();
            console.log(`set FeeService ${await mos.feeService()} successfully `);
        }
    });

task("mos:grant", "grant role")
    .addParam("role", "role address")
    .addParam("account", "account address")
    .addOptionalParam("grant", "grant or revoke", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { deploy } = hre.deployments;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];

        let role;
        if (taskArgs.role === "upgrade" || taskArgs.role === "upgrader") {
            role = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UPGRADER_ROLE"));
        } else if (taskArgs.role === "manage" || taskArgs.role === "manager") {
            role = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MANAGER_ROLE"));
        } else {
            role = ethers.constants.HashZero;
        }

        let mos = await getOmniService(hre, "");

        if (isTron(hre.network.config.chainId)) {
            let hasRole = await mos.hasRole(role, taskArgs.account).call();
            if (hasRole) {
                console.log(`[${taskArgs.account}] with role [${taskArgs.role}] no update`);
                return;
            }
            await mos.grantRole(role, taskArgs.account).send();
            console.log(
                `set [${taskArgs.account}] hash role [${taskArgs.role}] [${await mos.hasRole(role, taskArgs.account).call()}] `,
            );
        } else {
            let hasRole = await mos.hasRole(role, taskArgs.account);
            if (hasRole) {
                console.log(`[${taskArgs.account}] with role [${taskArgs.role}] no update`);
                return;
            }
            await (await mos.grantRole(role, taskArgs.account)).wait();
            console.log(
                `set [${taskArgs.account}] hash role [${taskArgs.role}] [${await mos.hasRole(role, taskArgs.account)}] `,
            );
        }
    });

task("mos:update", "mos update").setAction(async (taskArgs, hre) => {
    await hre.run("mos:setLightClient", {});

    await hre.run("mos:setFeeService", {});

    await hre.run("fee:update", {});
});

task("mos:listMember", "List member info")
    .addOptionalParam("mos", "The mos address, default mos", "", types.string)
    .addParam("role", "role address")
    .setAction(async (taskArgs, hre) => {
        let role;
        if (taskArgs.role === "upgrade" || taskArgs.role === "upgrader") {
            role = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UPGRADER_ROLE"));
        } else if (taskArgs.role === "manage" || taskArgs.role === "manager") {
            role = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MANAGER_ROLE"));
        } else if (taskArgs.role === "admin") {
            role = ethers.constants.HashZero;
        } else {
            console.log(`invalid role [${taskArgs.role}]`);
            return;
        }
        let mos = await getOmniService(hre, taskArgs.mos);

        let count = await mos.getRoleMemberCount(role);
        console.log(`role [${taskArgs.role}] has [${count}] member(s)`);

        for (let i = 0; i < count; i++) {
            let member = await mos.getRoleMember(role, i);
            console.log(`    ${i}: ${member}`);
        }
    });

task("mos:list", "List mos info")
    .addOptionalParam("mos", "The mos address, default mos", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let mos = await getOmniService(hre, taskArgs.mos);

        let selfChainId = await mos.selfChainId();
        console.log("selfChainId:\t", selfChainId.toString());
        console.log("lightNode:\t", await mos.lightNode());
        console.log("feeService:\t", await mos.feeService());

        console.log("relay chain:\t", await mos.relayChainId());
        console.log("relay contract:\t", await mos.relayContract());
        console.log("Impl:\t", await mos.getImplementation());

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
