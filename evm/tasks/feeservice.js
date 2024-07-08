const {
    getFeeService,
    getFee,
    getFeeConfig,
    getToken,
    getChain,
    getChainList,
    saveFeeList,
} = require("./utils/utils");

const { isTron } = require("../utils/helper");

task("fee:setReceiver", "Set message fee service address ")
    .addOptionalParam("receiver", "mos contract address", "latest", types.string)
    .addOptionalParam("service", "the fee service address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];

        let feeService = await getFeeService(hre.network.config.chainId, taskArgs.service);

        let receiver = taskArgs.receiver;
        if (taskArgs.receiver === "latest") {
            let feeConfig = await getFeeConfig(hre.network.name);
            receiver = feeConfig.feeRecevier;
        }

        if (isTron(hre.network.config.chainId)) {
            let onchainReceiver = await feeService.feeReceiver().call();
            if (onchainReceiver === receiver) {
                console.log(`fee receiver no update`);
                return;
            }
            await feeService.setFeeReceiver(receiver).send();
            console.log(
                `Update chain ${hre.network.name} fee recevier [onchainReceiver] => ${await feeService.feeReceiver().call()}`,
            );
        } else {
            let onchainReceiver = await feeService.feeReceiver();
            if (onchainReceiver === receiver) {
                console.log(`fee receiver no update`);
                return;
            }
            await (await feeService.setFeeReceiver(recevier)).wait();
            console.log(
                `Update chain ${hre.network.name} fee recevier [onchainReceiver] => [${await feeService.feeReceiver()}]`,
            );
        }
    });

task("fee:setBaseGas", "set target chain base gas limit")
    .addParam("chain", "target chain id or name")
    .addParam("gas", "base gas limit")
    .addOptionalParam("token", "fee token address", "0x0000000000000000000000000000000000000000", types.string)
    .addOptionalParam("service", "the fee service address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        // console.log("deployer address:", deployer.address);

        let feeService = await getFeeService(hre.network.config.chainId, taskArgs.service);
        let chain = await getChain(hre.network.name, taskArgs.chain);

        if (isTron(hre.network.config.chainId)) {
            let baseGas = await feeService.baseGas(chain.chainId).call();
            if (baseGas.toString() === taskArgs.gas) {
                console.log(`target chain [${taskArgs.chain}] base gas limit no update`);
                return;
            }
            await feeService.setBaseGas(chain.chainId, taskArgs.gas).send();
            console.log(
                `Update chain [${taskArgs.chain}] base gas limit [${baseGas}] => [${await feeService.baseGas(chain.chainId).call()}]`,
            );
        } else {
            let baseGas = await feeService.baseGas(chain.chainId);
            if (baseGas.toString() === taskArgs.gas) {
                console.log(`target chain [${taskArgs.chain}] base gas limit no update`);
                return;
            }
            await (await feeService.setBaseGas(chain.chainId, taskArgs.gas)).wait();
            console.log(
                `Update chain [${taskArgs.chain}] base gas limit [${baseGas}] => [${await feeService.baseGas(chain.chainId)}]`,
            );
        }
    });

task("fee:setTargetPrice", "set chain message fee")
    .addParam("chain", "to chain id", "latest", types.string)
    .addParam("price", "to chain id", "latest", types.string)
    .addOptionalParam("token", "fee token", "0x0000000000000000000000000000000000000000", types.string)
    .addOptionalParam("service", "the fee service address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        //console.log("deployer address:", deployer.address);

        let feeService = await getFeeService(hre.network.config.chainId, taskArgs.service);

        let chain = await getChain(hre.network.name, taskArgs.chain);
        let token = await getToken(hre.network.name, taskArgs.token);
        if (isTron(hre.network.config.chainId)) {
            let gasPrice = await feeService.chainGasPrice(chain.chainId, token).call();
            if (gasPrice === taskArgs.price) {
                console.log(`target chain [${taskArgs.chain}] token [${taskArgs.token}] gas price no update`);
                return;
            }
            await feeService.setChainGasPrice(chain.chainId, token, taskArgs.price).send();
            console.log(
                `Update chain [${taskArgs.chain}] token [${taskArgs.token}] gas price [${gasPrice}] => ${await feeService.chainGasPrice(chain.chainId, token).call()}`,
            );
        } else {
            let gasPrice = await feeService.chainGasPrice(chain.chainId, token);
            if (gasPrice.toString() === taskArgs.price) {
                console.log(`target chain [${taskArgs.chain}] fee token [${taskArgs.token}] gas price no update`);
                return;
            }

            await (await feeService.setChainGasPrice(chain.chainId, token, taskArgs.price)).wait();
            console.log(
                `Update chain [${taskArgs.chain}] fee token [${taskArgs.token}] gas price [${gasPrice}] => [${await feeService.chainGasPrice(chain.chainId, token)}]`,
            );
        }
    });

task("fee:update", "update chain message fee")
    .addOptionalParam("service", "the fee service address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address:", deployer.address);

        let feeConfig = await getFeeConfig(hre.network.name);

        // set fee receiver
        await hre.run("fee:setReceiver", {
            receiver: feeConfig.feeRecevier,
            service: taskArgs.service,
        });

        let addList = [];
        let removeList = [];
        let chainList = await getChainList(hre.network.name);
        for (let i = 0; i < chainList.length; i++) {
            if (chainList[i].name === hre.network.name) {
                continue;
            }
            if (feeConfig.nontarget.includes(chainList[i].name)) {
                removeList.push(chainList[i]);
            } else {
                addList.push(chainList[i]);
            }
        }
        // console.log("add list", addList);
        console.log("remove list", removeList);
        for (let i = 0; i < removeList.length; i++) {
            await hre.run("fee:setBaseGas", {
                chain: removeList[i].name,
                gas: "0",
                service: taskArgs.service,
            });
        }

        let fee = await getFee(hre.network.name);
        for (let i = 0; i < addList.length; i++) {
            let targetConfig = await getFeeConfig(addList[i].name);
            await hre.run("fee:setBaseGas", {
                chain: addList[i].name,
                gas: targetConfig.baseGas.toString(),
                service: taskArgs.service,
            });
            for (let token in fee) {
                await hre.run("fee:setTargetPrice", {
                    chain: addList[i].name,
                    price: fee[token][addList[i].name],
                    token: token,
                    service: taskArgs.service,
                });
            }
        }
        console.log("Update fee success!");
    });

task("fee:updateFee", "List mos info")
    .addOptionalParam("fee", "The fee address", "", types.string)
    .addOptionalParam("save", "save fee", false, types.boolean)
    .setAction(async (taskArgs, hre) => {
        let feeList = {};
        let chainList = await getChainList(hre.network.name);
        for (let chain of chainList) {
            feeList[chain.name] = {};
            let feeConfig = await getFeeConfig(chain.name);

            let nativePriceList = {};
            let nativePrice = ethers.utils.parseUnits(feeConfig.nativePrice, 6);
            for (let targetChain of chainList) {
                if (chain.name === targetChain.name) {
                    continue;
                }
                if (feeConfig.nontarget.includes(targetChain.name)) {
                    continue;
                }
                let targetFeeConfig = await getFeeConfig(targetChain.name);
                let targetGasPrice = ethers.utils.parseUnits(targetFeeConfig.gasPrice, 9); // gwei
                let targetNativePrice = ethers.utils.parseUnits(targetFeeConfig.nativePrice, 6);
                let price = targetGasPrice.mul(targetNativePrice).div(nativePrice);
                nativePriceList[targetChain.name] = price.toString();
            }
            feeList[chain.name]["native"] = nativePriceList;
        }

        if (taskArgs.save) {
            await saveFeeList(hre.network.name, feeList);
        } else {
            console.log(feeList);
        }
    });

task("fee:list", "List mos info")
    .addOptionalParam("service", "the fee service address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        let feeService = await getFeeService(hre.network.config.chainId, taskArgs.service);

        console.log("owner:\t", await feeService.owner());
        console.log("feeService receiver:\t", await feeService.feeReceiver());

        console.log("fees:");
        let chains = await getChainList(hre.network.name);
        for (let i = 0; i < chains.length; i++) {
            let chainId = chains[i].chainId;
            let baseFee = await feeService.baseGas(chainId);
            if (!baseFee.eq(0)) {
                let price = await feeService.chainGasPrice(chainId, ethers.constants.AddressZero);
                console.log(`${chains[i].name} (${chainId}) \t base fee [${baseFee}] gas price [${price}]`);
            }
        }
        console.log("");
    });
