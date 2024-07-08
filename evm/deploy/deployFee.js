const { MOS_SALT, DEPLOY_FACTORY } = process.env;
module.exports = async function ({ ethers, deployments }) {
    const { deploy } = deployments;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("deployer address:", deployer.address);

    await deploy("FeeService", {
        from: deployer.address,
        args: [],
        log: true,
        contract: "FeeService",
    });
    let fee = await ethers.getContract("FeeService");
    console.log("FeeService address:", fee.address);

    let feeC = await ethers.getContractAt("FeeService", fee.address);

    // await (await feeC.connect(deployer).initialize({gasLimit:300000})).wait()

    console.log(await feeC.owner());

    await (await feeC.connect(deployer).setBaseGas(71, 10000, { gasLimit: 500000 })).wait();
    // console.log(1)
    //console.log(await feeC.getMessageFee(212,"0x0000000000000000000000000000000000000000"))
    await (
        await feeC
            .connect(deployer)
            .setChainGasPrice(71, "0x0000000000000000000000000000000000000000", 10000, { gasLimit: 500000 })
    ).wait();
    // console.log(2)
    // await (await feeC.connect(deployer).setFeeReceiver("0x49d6Dae5D59B3aF296DF35BDc565371c8A563ef6",{gasLimit:500000})).wait()
    // console.log(3)
};

module.exports.tags = ["Fee"];
