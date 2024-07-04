const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MAPO ServiceV3 start test", () => {
    let owner;
    let addr1;

    let os;

    let lightNode;

    let wrapped;

    let echo;

    let feeService;

    async function deployOSContractFixture() {
        [owner, addr1] = await ethers.getSigners();

        let osContract = await ethers.getContractFactory("OmniService");
        os = await osContract.deploy();
        console.log("osMessage address:", os.address);

        let wrappedContract = await ethers.getContractFactory("Wrapped");
        wrapped = await wrappedContract.deploy();
        console.log("Wrapped:", wrapped.address);

        let lightNodeContract = await ethers.getContractFactory("LightNode");
        lightNode = await lightNodeContract.deploy();
        console.log("lightNodeContract:", lightNode.address);

        let EchoContract = await ethers.getContractFactory("Echo");
        echo = await EchoContract.deploy();
        console.log("echo address:", echo.address);

        let data = await os.initialize(owner.address);

        let proxyContract = await ethers.getContractFactory("OmniServiceProxy");
        let proxy = await proxyContract.deploy(os.address, data.data);
        await proxy.deployed();
        os = osContract.attach(proxy.address);

        let feeContract = await ethers.getContractFactory("FeeService");
        feeService = await feeContract.deploy();

        console.log("FeeService address:", feeService.address);

        return { os, echo, feeService, owner, addr1,lightNode };
    }

    describe("MapoService start test", () => {
        it("osMessage set ", async function () {
            let { os, echo, feeService, owner, addr1,lightNode } = await loadFixture(deployOSContractFixture);

            await os.setRelayContract(5, "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707");

            //await os.addWhiteList(echo.address,true);

            await os.setFeeService(feeService.address);

            await os.setLightClient(lightNode.address);

            await echo.setWhiteList(os.address);

            await echo.setMapoService(os.address);

            //await echo.addCorrespondence("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",true);

            expect(await feeService.owner()).to.equal("0x0000000000000000000000000000000000000000");

            await feeService.initialize();

            await feeService.setBaseGas(97, 1000000);
            await feeService.setChainGasPrice(97, "0x0000000000000000000000000000000000000000", 10000);
        });

        it("transferOut start test ", async function () {
            let data = await echo.getData("hello", "hello world");

            let dataBytes = await echo.getMessageBytes([false, 0, echo.address, data, "5000000", "0"]);

            await os.transferOut("97", dataBytes, "0x0000000000000000000000000000000000000000", {
                value: 60000000000,
            });

            await expect(
                os.transferOut("97", dataBytes, "0x0000000000000000000000000000000000000000", { value: 50 }),
            ).to.be.revertedWith("MOSV3: Need message fee");

            dataBytes = await echo.getMessageBytes([false, 0, echo.address, data, "5000000", "10"]);

            await expect(
                os.transferOut("97", dataBytes, "0x0000000000000000000000000000000000000000", { value: 100 }),
            ).to.be.revertedWith("MOSV3: Not support msg value");
        });

        it("transferIn start test ", async function () {
            expect(await echo.EchoList("hello")).to.equal("");

            let receiptProof =
                "0xf90340f9033d945fc8d32690cc91d4c39d9d3abcbd16989f875707f863a0f4397fd41454e34a9a4015d05a670124ecd71fe7f1d05578a62f8009b1a57f8aa00000000000000000000000000000000000000000000000000000000000000005a000000000000000000000000000000000000000000000000000000000000000d4b902c063bf27b593f5ecbfe3212c102d6dc04aabcf5e27150edeb6a60003feb71c3d38000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000014cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000000000000000000000000000000000000000000000c4dd1d382400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b68656c6c6f20776f726c6400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

            const relayData = await os.transferInWithIndex(5,0, receiptProof);

            let relayHashData = await ethers.provider.getTransactionReceipt(relayData.hash);

            let decodeData = await ethers.utils.defaultAbiCoder.decode(
                ["bytes32", "bytes", "bytes", "bool", "bytes"],
                relayHashData.logs[0].data,
            );

            expect(decodeData[3]).to.equal(false);

            console.log(
                await os.storedMessageList("0x63bf27b593f5ecbfe3212c102d6dc04aabcf5e27150edeb6a60003feb71c3d38"),
            );

            expect(
                await os.storedMessageList("0x63bf27b593f5ecbfe3212c102d6dc04aabcf5e27150edeb6a60003feb71c3d38"),
            ).to.not.equal("");

            await echo.addCorrespondence("5", "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9", true);

            let messageData =
                "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000000000000000000000000000000000000000000000c4dd1d382400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b68656c6c6f20776f726c6400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

            await (await os.retryMessageIn(5, decodeData[0], decodeData[1], messageData,{gasLimit:10000000})).wait();
            expect(await echo.EchoList("hello")).to.equal("hello world");
        });
    });
});
