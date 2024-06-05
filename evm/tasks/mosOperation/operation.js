const { getContractList } = require("../../utils/helper");
const { getContractImpl, isTron, getEvmAddress } = require("../utils/utilities");

task("mosSetRelay", "Initialize MOSRelay address for MOS")
    .addParam("chain", "map chain id")
    .addOptionalParam("relay", "map chain relayOperation contract address", "latest", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let contractList = await getContractList(hre.network.config.chainId);
        console.log(contractList["mosAddress"]);

        let mos = await getContractImpl(hre.network.config.chainId, contractList["mosAddress"]);
        console.log(mos.address);

        let addressList = await getContractList(taskArgs.chain);

        if (taskArgs.relay == "latest") {
            if (isTron(hre.network.config.chainId)) {
                await mos
                    .setRelayContract(taskArgs.chain, await getEvmAddress(hre.network.name, addressList["mosAddress"]))
                    .send();
                console.log(
                    `set  relay ${await mos.relayContract().call()} with chain id ${await mos.relayChainId().call()} successfully `,
                );
            } else {
                await (await mos.setRelayContract(taskArgs.chain, addressList["mosAddress"])).wait();
                console.log(
                    `set  relay ${await mos.relayContract()} with chain id ${await mos.relayChainId()} successfully `,
                );
            }
        } else {
            if (isTron(hre.network.config.chainId)) {
                await mos
                    .setRelayContract(taskArgs.chain, await getEvmAddress(hre.network.name, taskArgs.relay))
                    .send();
                console.log(
                    `set  relay ${await mos.relayContract().call()} with chain id ${await mos.relayChainId().call()} successfully `,
                );
            } else {
                await (await mos.setRelayContract(taskArgs.chain, taskArgs.relay)).wait();
                console.log(
                    `set  relay ${await mos.relayContract()} with chain id ${await mos.relayChainId()} successfully `,
                );
            }
        }
    });

task("mosSetClient", "Set light client address for MOS")
    .addOptionalParam("client", "light client address", "latest", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let contractList = await getContractList(hre.network.config.chainId);

        let mos = await getContractImpl(hre.network.config.chainId, contractList["mosAddress"]);

        if (taskArgs.client == "latest") {
            if (isTron(hre.network.config.chainId)) {
                await mos.setLightClient(await getEvmAddress(hre.network.name, contractList["lightClient"])).send();
                console.log(`set  LightClient ${await mos.lightNode().call()} successfully `);
            } else {
                await (await mos.setLightClient(contractList["lightClient"])).wait();
                console.log(`set  LightClient ${await mos.lightNode()} successfully `);
            }
        } else {
            if (isTron(hre.network.config.chainId)) {
                await mos.setLightClient(await getEvmAddress(hre.network.name, taskArgs.client)).send();
                console.log(`set  LightClient ${await mos.lightNode().call()} successfully `);
            } else {
                await (await mos.setLightClient(taskArgs.client)).wait();
                console.log(`set  LightClient ${await mos.lightNode()} successfully `);
            }
        }
    });

task("setFeeService", "Set message fee service address ")
    .addOptionalParam("fee", "message fee address", "latest", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let contractList = await getContractList(hre.network.config.chainId);

        let mos = await getContractImpl(hre.network.config.chainId, contractList["mosAddress"]);

        if (taskArgs.fee == "latest") {
            if (isTron(hre.network.config.chainId)) {
                await mos.setFeeService(await getEvmAddress(hre.network.name, contractList["feeService"])).send();
                console.log(`set  FeeService ${await mos.feeService().call()} successfully `);
            } else {
                await (await mos.setFeeService(contractList["feeService"])).wait();
                console.log(`set  FeeService ${await mos.feeService()} successfully `);
            }
        } else {
            if (isTron(hre.network.config.chainId)) {
                await mos.setFeeService(await getEvmAddress(hre.network.name, taskArgs.fee)).send();
                console.log(`set  FeeService ${await mos.feeService().call()} successfully `);
            } else {
                await (await mos.setFeeService(taskArgs.fee)).wait();
                console.log(`set  FeeService ${await mos.feeService()} successfully `);
            }
        }
    });

task("relaySetClientManager", "Update client manager")
    .addOptionalParam("manager", "client manager contract", "latest", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let contractList = await getContractList(hre.network.config.chainId);

        let mos = await getContractImpl(hre.network.config.chainId, contractList["mosAddress"]);

        if (taskArgs.manager == "latest") {
            await (await mos.setLightClientManager(contractList["lightClient"])).wait();
        } else {
            await (await mos.setLightClientManager(taskArgs.manager)).wait();
        }
        console.log(`set  LightClientManager ${await mos.lightClientManager()} successfully `);
    });

task("relayRegisterChain", "Register altchain mos to relayOperation chain")
    .addParam("chain", "chain id")
    .addOptionalParam("address", "mos contract address", "latest", types.string)
    .addOptionalParam("type", "chain type, default 1", 1, types.int)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let contractList = await getContractList(hre.network.config.chainId);

        let mos = await getContractImpl(hre.network.config.chainId, contractList["mosAddress"]);

        let addressList = await getContractList(taskArgs.chain);

        let registerMosAddress;
        if (taskArgs.address == "latest") {
            if (isTron(Number(taskArgs.chain))) {
                registerMosAddress = await getEvmAddress(addressList["chainName"], addressList["mosAddress"]);
                console.log(registerMosAddress);
            } else {
                registerMosAddress = addressList["mosAddress"];
            }
            await (await mos.registerChain(taskArgs.chain, registerMosAddress, taskArgs.type)).wait();
        } else {
            if (isTron(Number(taskArgs.chain))) {
                registerMosAddress = await getEvmAddress(addressList["chainName"], taskArgs.address);
            } else {
                registerMosAddress = taskArgs.address;
            }
            await (await mos.registerChain(taskArgs.chain, registerMosAddress, taskArgs.type)).wait();
        }
        console.log(
            `register  chain id ${taskArgs.chain} with mos address ${await mos.mosContracts(taskArgs.chain)} successfully `,
        );
    });
