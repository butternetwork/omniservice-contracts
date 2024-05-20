const {readFromFile, zksyncDeploy, create, writeToFile, needVerify} = require("../../utils/helper");
const {getTronWeb, deploy_contract} = require("../utils/tronUtil");
const { MOS_SALT, FEE_SALT, DEPLOY_FACTORY} = process.env;

task("mosDeploy",
    "Deploy the upgradeable MOS contract and initialize it"
)
    .addParam("wrapped", "native wrapped token address")
    .addParam("lightnode", "lightNode contract address")
    .addOptionalParam("salt", "deploy contract salt",MOS_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)
    .setAction(async (taskArgs, hre) => {
        const { deployments } = hre
        const { deploy } = deployments
        const accounts = await ethers.getSigners()
        const deployer = accounts[0];

        console.log("deployer address:", deployer.address);

        let implContract;
        let implAddr;
        let IMPL;
        let proxyAddr;

        let deployment = await readFromFile(hre.network.config.chainId);

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

            let impl = await deploy_contract(hre.artifacts, "MapoServiceV3", [], tronWeb);

            let interface = new ethers.utils.Interface([
                "function initialize(address _wToken, address _lightNode) external",
            ]);

            let data = interface.encodeFunctionData("initialize", [wtokenHex, lightnodeHex]);
            let proxy = await deploy_contract(hre.artifacts, "MapoServiceProxyV3", [impl, data], tronWeb);

            proxyAddr = tronWeb.address.fromHex(proxy);

        }else {
            let impl = await deploy(implContract, {
                from: deployer.address,
                args: [],
                log: true,
                contract: implContract,
            });
            implAddr = impl.address;
            IMPL = await ethers.getContractAt(implContract,implAddr)
            let data = IMPL.interface.encodeFunctionData("initialize", [taskArgs.wrapped, taskArgs.lightnode]);
            if(taskArgs.salt === ""){
                let proxy =  await deploy("MapoServiceProxyV3", {
                    from: deployer.address,
                    args: [IMPL.address,data],
                    log: true,
                    contract: "MapoServiceProxyV3",
                });
                proxyAddr = proxy.address;
                deployment[hre.network.config.chainId]["mosSalt"] = "";
            }else{
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
                deployment[hre.network.config.chainId]["mosSalt"] = taskArgs.salt;
            }
        }
        deployment[hre.network.config.chainId]["chainName"] = hre.network.name;
        deployment[hre.network.config.chainId]["mosAddress"] = proxyAddr;

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
    });

task("feeDeploy",
    "Deploy the upgradeable MOS contract and initialize it"
)
    .addOptionalParam("salt", "deploy contract salt",FEE_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)
    .setAction(async (taskArgs, hre) => {
        const {deploy} = hre.deployments
        const accounts = await ethers.getSigners()
        const deployer = accounts[0];

        console.log("deployer address:", deployer.address);

        let implContract = "FeeService";
        let implAddr;
        let feeService;

        let deployment = await readFromFile(hre.network.config.chainId);

        if(hre.network.config.chainId === 324 || hre.network.config.chainId === 300){
            implAddr = await zksyncDeploy(implContract, [], hre);
            feeService = await ethers.getContractAt(implContract,implAddr)
            await (await feeService.initialize()).wait();
            console.log(`${implAddr} initialize success`);
            deployment[hre.network.name]["feeService"] = implAddr;
        }else if (hre.network.config.chainId === 728126428 || hre.network.config.chainId === 3448148188){
            let tronWeb = await getTronWeb(hre.network.name);
            console.log("Tron deployer :", tronWeb.defaultAddress);
            let contractAddress = await deploy_contract(hre.artifacts, implContract, [], tronWeb);
            implAddr = tronWeb.address.fromHex(contractAddress);
            let FeeService = await artifacts.readArtifact("FeeService");
            feeService = await tronWeb.contract(FeeService.abi, implAddr);
            await feeService.initialize().send();
            console.log(`${hre.network.name} FeeService Contract initialize success`)
        }else {
            if (taskArgs.salt === ""){
                let IMPL = await deploy(implContract, {
                    from: deployer.address,
                    args: [],
                    log: true,
                    contract: implContract,
                });
                implAddr = IMPL.address;
                feeService = await ethers.getContractAt(implContract,implAddr)
                await (await feeService.initialize()).wait();
                console.log(`${implAddr} initialize success`)
            }else{
                let FeeService = await ethers.getContractFactory(implContract);

                let createResult = await create(taskArgs.salt, FeeService.bytecode, "0x");
                if (!createResult[1]) {
                    return;
                }
                implAddr = createResult[0];
                deployment[hre.network.config.chainId]["feeSalt"] = taskArgs.salt;
                feeService = await ethers.getContractAt("FeeService",implAddr);
                await (await feeService.initialize()).wait();
                console.log(`${implAddr} initialize success`)
            }
        }

        deployment[hre.network.config.chainId]["chainName"] = hre.network.name;
        deployment[hre.network.config.chainId]["feeService"] = implAddr;

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
    });

task("mosUpgrade", "upgrade mos evm contract in proxy")
    .addOptionalParam("mos", "deploy contract salt","latest" , types.string)
    .setAction(async (taskArgs, hre) => {
        const { deployments } = hre
        const { deploy } = deployments
        const accounts = await ethers.getSigners()
        const deployer = accounts[0];

        console.log("deployer address:", deployer.address);

        let implContract;
        let implAddr;
        let proxy;
        let proxyAddress;

        let deployment = await readFromFile(hre.network.config.chainId);

        if(hre.network.config.chainId === 212 || hre.network.config.chainId === 22776){
            implContract = "MapoServiceRelayV3"
        }else {
            implContract = "MapoServiceV3"
        }

        if(taskArgs.mos === "latest"){
            proxyAddress = deployment[hre.network.config.chainId]["mosAddress"]
        }else{
            proxyAddress = taskArgs.mos
        }

        if(hre.network.config.chainId === 324 || hre.network.config.chainId === 300){
            implAddr = await zksyncDeploy(implContract, [], hre);
            proxy = await ethers.getContractAt(implContract,proxyAddress);
            await (await proxy.upgradeTo(implAddr)).wait()
            console.log(`ZK upgrade MOS success`)
        }else if (hre.network.config.chainId === 728126428 || hre.network.config.chainId === 3448148188){
            let tronWeb = await getTronWeb(hre.network.name);
            console.log("deployer :", tronWeb.defaultAddress);
            let impl = await deploy_contract(hre.artifacts, implContract, [], tronWeb);
            let MapoServiceV3 = await artifacts.readArtifact(implContract);
            proxy = await tronWeb.contract(MapoServiceV3.abi, proxyAddress);
            await proxy.upgradeTo(impl).send()
            console.log(`ZK upgrade MOS success`)
        }else {
            let impl = await deploy(implContract, {
                from: deployer.address,
                args: [],
                log: true,
                contract: implContract,
            });
            implAddr = impl.address;
            proxy = await ethers.getContractAt(implContract,proxyAddress)
            await (await proxy.upgradeTo(implAddr)).wait()
            console.log(`ZK upgrade MOS success`)
        }
    });

