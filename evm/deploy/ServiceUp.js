const { MOS_SALT, DEPLOY_FACTORY } = process.env;
module.exports = async function ({ ethers, deployments }) {
    const { deploy } = deployments;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("deployer address:", deployer.address);

    await deploy("OmniService", {
        from: deployer.address,
        args: [],
        log: true,
        contract: "OmniService",
    });
    let mos = await ethers.getContract("OmniService");
    console.log("OmniService address:", mos.address);

    console.log("mos salt:", MOS_SALT);

    let factory = await ethers.getContractAt("IDeployFactory", DEPLOY_FACTORY);

    console.log("deploy factory address:", factory.address);

    let hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(MOS_SALT));

    let mosAddress = await factory.getAddress(hash);

    let mosProxy = await ethers.getContractAt("OmniService", mosAddress);

    console.log("OmniService proxy address:", mosAddress);

    await (await mosProxy.upgradeTo(mos.address)).wait();

    console.log("OmniService up success");
};

module.exports.tags = ["ServiceUp"];
