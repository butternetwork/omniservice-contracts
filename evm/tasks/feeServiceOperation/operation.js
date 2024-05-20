const {getContractList,getMessageFeeConfig} = require("../../utils/helper");
const {getFeeContractImpl,isTron,getEvmAddress} = require("../utils/utilities");

task("setFeeReceiver",
    "Set message fee service address "
)
    .addOptionalParam("receiver", "mos contract address","latest",types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners()
        const deployer = accounts[0]

        const ChainFeeList = await getMessageFeeConfig(hre.network.name);
        const contractList = await getContractList(hre.network.config.chainId)
        let feeService = await getFeeContractImpl(hre.network.config.chainId, contractList["feeService"]);

        if(isTron(hre.network.config.chainId)){
            if(taskArgs.receiver === "latest"){
                await feeService.setFeeReceiver(getEvmAddress(hre.network.name,ChainFeeList.feeRecevier)).send();
            } else {
                await feeService.setFeeReceiver(getEvmAddress(hre.network.name,taskArgs.receiver)).send();
            }
            console.log(`Update chain ${hre.network.name} change feeRecevier address: ${await feeService.feeReceiver().call()}`);
        }else {
            let currentReceiver = await feeService.feeReceiver();
            if (taskArgs.receiver === "latest"){
                if (currentReceiver == ChainFeeList.feeRecevier){
                    console.log(`Skip chain ${hre.network.name} feeRecevier address: ${currentReceiver}`);
                }else{
                    await (await feeService.setFeeReceiver(ChainFeeList.feeRecevier)).wait();
                    console.log(`Update chain ${hre.network.name} change feeRecevier address: ${await feeService.feeReceiver()}`);
                }
            }else{
                if (currentReceiver == taskArgs.receiver){
                    console.log(`Skip chain ${hre.network.name} feeRecevier address: ${currentReceiver}`);
                }else{
                    await (await feeService.connect(deployer).setFeeReceiver(taskArgs.receiver)).wait();
                    console.log(`Update chain ${hre.network.name} change feeRecevier address: ${await feeService.feeReceiver()}`);
                }
            }
        }

    })

task("setMessageFee",
    "set chain message fee"
)
    .addOptionalParam("chainid", "to chain id","latest",types.string)
    .addOptionalParam("token", "fee token address","latest" , types.address)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners()
        const deployer = accounts[0];

        console.log("deployer address:",deployer.address);

        console.log(hre.network.name)

        const ChainFeeList = await getMessageFeeConfig(hre.network.name);

        let contractList = await getContractList(hre.network.config.chainId)

        let feeService = await getFeeContractImpl(hre.network.config.chainId, contractList["feeService"]);

        if (isTron(hre.network.config.chainId)){
            if (taskArgs.chainid === "latest"){
                for (let chainListFee of Object.entries(ChainFeeList.chainIdList)) {
                    await feeService.setBaseGas(chainListFee[0],chainListFee[1].baseGas).send()
                    console.log(`Update to ${chainListFee[0]} baseGas is: ${await feeService.baseGas(chainListFee[0])}`)
                }
            }else{
                await feeService.setBaseGas(
                    taskArgs.chainid,
                    ChainFeeList[hre.network.name].chainIdList[taskArgs.chainid].baseGas
                ).send()
            }
            let gasPrice;
            if (taskArgs.token === "latest"){
                for (let chainListFee of Object.entries(ChainFeeList.chainIdList)) {
                    for(let tokenListFee of Object.entries(chainListFee[1].chainGasPrice)){
                        gasPrice = await feeService.chainGasPrice(chainListFee[0],tokenListFee[0]).call()
                        if(gasPrice == tokenListFee[1]){
                            console.log(`Skip chain: ${chainListFee[0]}, 
                            token: ${tokenListFee[0]}, chainGasPrice is: ${gasPrice}`)
                        }else{
                            await feeService.setChainGasPrice(
                                chainListFee[0],
                                getEvmAddress(hre.network.name,tokenListFee[0]),tokenListFee[1]
                            ).send();
                            console.log(`Update chain: ${chainListFee[0]}, token: ${tokenListFee[0]}, chainGasPrice is: ${await feeService.chainGasPrice(chainListFee[0],tokenListFee[0]).call()}`)
                        }
                    }
                }
            }else{
                for (let chainListFee of Object.entries(ChainFeeList.chainIdList)) {
                    gasPrice = await feeService.chainGasPrice(chainListFee[0],taskArgs.token).call()
                    if(gasPrice == chainListFee[1].chainGasPrice[taskArgs.token]){
                        console.log(`Skip chain: ${chainListFee[0]}, token: ${taskArgs.token}, chainGasPrice is: ${gasPrice}`)
                    }else{
                        await feeService.setChainGasPrice(
                            chainListFee[0],
                            getEvmAddress(hre.network.name,taskArgs.token),
                            chainListFee[1].chainGasPrice[taskArgs.token]
                        ).send();
                        console.log(`Update chain: ${chainListFee[0]}, token: ${taskArgs.token}, chainGasPrice is: ${await feeService.chainGasPrice(chainListFee[0],taskArgs.token).call()}`)
                    }
                }
            }
        }else{
            let baseGas;
            if (taskArgs.chainid === "latest") {
                for (let chainListFee of Object.entries(ChainFeeList.chainIdList)) {
                    baseGas = await feeService.baseGas(chainListFee[0])
                    if(baseGas == chainListFee[1].baseGas){
                        console.log(`Skip to ${chainListFee[0]} baseGas is: ${baseGas}`)
                    }else {
                        await (await feeService.setBaseGas(chainListFee[0],chainListFee[1].baseGas)).wait();
                        console.log(`Update to ${chainListFee[0]} baseGas is: ${await feeService.baseGas(chainListFee[0])}`)
                    }
                }
            }else {
                baseGas = await feeService.baseGas(taskArgs.chainid)
                if(baseGas == ChainFeeList.chainIdList[taskArgs.chainid].baseGas){
                    console.log(`Skip to ${taskArgs.chainid} baseGas is: ${baseGas}`)
                }else {
                    await (await feeService.setBaseGas(
                        taskArgs.chainid,
                        ChainFeeList[hre.network.name].chainIdList[taskArgs.chainid].baseGas
                    )).wait();
                    console.log(`Update to ${taskArgs.chainid} baseGas is: ${await feeService.baseGas(taskArgs.chainid)}`)
                }
            }

            let gasPrice;
            if (taskArgs.token === "latest") {
                for (let chainListFee of Object.entries(ChainFeeList.chainIdList)) {
                    for(let tokenListFee of Object.entries(chainListFee[1].chainGasPrice)){
                        gasPrice = await feeService.chainGasPrice(chainListFee[0],tokenListFee[0])
                        if(gasPrice == tokenListFee[1]){
                            console.log(`Skip chain: ${chainListFee[0]}, token: ${tokenListFee[0]}, chainGasPrice is: ${gasPrice}`)
                        }else{
                            await (await feeService.setChainGasPrice(chainListFee[0],tokenListFee[0],tokenListFee[1])).wait();
                            console.log(`Update chain: ${chainListFee[0]}, token: ${tokenListFee[0]}, chainGasPrice is: ${await feeService.chainGasPrice(chainListFee[0],tokenListFee[0])}`)
                        }
                    }
                }
            }else {
                for (let chainListFee of Object.entries(ChainFeeList.chainIdList)) {
                    gasPrice = await feeService.chainGasPrice(chainListFee[0],taskArgs.token)
                    if(gasPrice == chainListFee[1].chainGasPrice[taskArgs.token]){
                        console.log(`Skip chain: ${chainListFee[0]}, 
                        token: ${taskArgs.token}, chainGasPrice is: ${gasPrice}`)
                    }else{
                        await (await feeService.setChainGasPrice(
                            chainListFee[0],
                            taskArgs.token,chainListFee[1].chainGasPrice[taskArgs.token]
                        )).wait();
                        console.log(`Update chain: ${chainListFee[0]}, token: ${taskArgs.token}, chainGasPrice is: ${await feeService.chainGasPrice(chainListFee[0],taskArgs.token)}`)
                    }
                }
            }
        }


    })

task("setToChainGasPrice",
    "set chain message fee"
)
    .addParam("tochainid", "to chain id","latest",types.string)
    .addParam("price", "to chain id","latest",types.string)
    .addParam("token", "to chain id","latest",types.string)
    .addOptionalParam("contract", "fee token address","defaultAddress" , types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners()
        const deployer = accounts[0];
        console.log("deployer address:",deployer.address);

        let feeService

        if (taskArgs.contract === "defaultAddress"){
            let contractList = await getContractList(hre.network.config.chainId)
            feeService = await getFeeContractImpl(hre.network.config.chainId, contractList["feeService"]);
        }else{
            feeService = await getFeeContractImpl(hre.network.config.chainId, taskArgs.contract);
        }

        if (isTron(hre.network.config.chainId)){
            await feeService.setChainGasPrice(taskArgs.tochainid,taskArgs.token,taskArgs.price).send()
            console.log(`Update to chain: ${taskArgs.tochainid}, token: ${taskArgs.token}, chainGasPrice is: ${await feeService.chainGasPrice(taskArgs.tochainid,taskArgs.token).call()}`)
        }else{
            let gasPrice = await feeService.chainGasPrice(taskArgs.tochainid,taskArgs.token)
            if(gasPrice == taskArgs.price){
                console.log(`Skip to chain: ${taskArgs.tochainid}, token: ${taskArgs.token}, chainGasPrice is: ${gasPrice}`)
            }else{
                await (await feeService.setChainGasPrice(taskArgs.tochainid,taskArgs.token,taskArgs.price)).wait();
                console.log(`Update to chain: ${taskArgs.tochainid}, token: ${taskArgs.token}, chainGasPrice is: ${await feeService.chainGasPrice(taskArgs.tochainid,taskArgs.token)}`)
            }
        }


    })


task("setBaseFee",
    "set chain message fee"
)
    .addParam("tochainid", "to chain id","latest",types.string)
    .addParam("fee", "to chain id","latest",types.string)
    .addOptionalParam("contract", "fee token address","defaultAddress" , types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners()
        const deployer = accounts[0];
        console.log("deployer address:",deployer.address);

        let feeService

        if (taskArgs.contract === "defaultAddress"){
            let contractList = await getContractList(hre.network.config.chainId)
            feeService = await getFeeContractImpl(hre.network.config.chainId, contractList["feeService"]);
        }else{
            feeService = await getFeeContractImpl(hre.network.config.chainId, taskArgs.contract);
        }
        if(isTron(hre.network.config.chainId)){
            await feeService.setBaseGas(taskArgs.tochainid,taskArgs.fee).send();
            console.log(`Update to ${taskArgs.tochainid} baseGas is: ${await feeService.baseGas(taskArgs.tochainid).call()}`)
        }else {
            let baseGas = await feeService.baseGas(taskArgs.tochainid)
            if(baseGas == taskArgs.fee){
                console.log(`Skip to ${taskArgs.tochainid} baseGas is: ${baseGas}`)
            }else {
                await (await feeService.setBaseGas(taskArgs.tochainid,taskArgs.fee)).wait();
                console.log(`Update to ${taskArgs.tochainid} baseGas is: ${await feeService.baseGas(taskArgs.tochainid)}`)
            }
        }

    })