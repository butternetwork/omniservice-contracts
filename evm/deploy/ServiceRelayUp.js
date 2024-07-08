const { MOS_SALT, DEPLOY_FACTORY } = process.env;

module.exports = async function ({ ethers, deployments }) {
    const { deploy } = deployments;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("deployer address:", deployer.address);

    await deploy("OmniServiceRelay", {
        from: deployer.address,
        args: [],
        log: true,
        contract: "OmniServiceRelay",
    });

    let mosRelay = await ethers.getContract("OmniServiceRelay");

    console.log("OmniServiceRelay up address:", mosRelay.address);

    console.log("mos salt:", MOS_SALT);

    let factory = await ethers.getContractAt("IDeployFactory", DEPLOY_FACTORY);

    console.log("deploy factory address:", factory.address);

    let hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(MOS_SALT));

    let mosAddress = await factory.getAddress(hash);

    let mosRelayProxy = await ethers.getContractAt("OmniServiceRelay", mosAddress);

    console.log("OmniServiceRelay proxy address:", mosAddress);

    await (await mosRelayProxy.upgradeTo(mosRelay.address)).wait();

    console.log("OmniServiceRelay up success");
};

module.exports.tags = ["ServiceRelayUp"];
