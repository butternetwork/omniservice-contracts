const { MOS_SALT, FEE_SALT, DEPLOY_FACTORY} = process.env;

task("mosFactoryDeploy",
    "Deploy the upgradeable MOS contract and initialize it",
    require("./mosFactoryDeploy")
)
    .addParam("wrapped", "native wrapped token address")
    .addParam("lightnode", "lightNode contract address")
    .addOptionalParam("salt", "deploy contract salt",MOS_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)

task("feeFactoryDeploy",
    "Deploy the upgradeable MOS contract and initialize it",
    require("./feeFactoryDeploy")
)
    .addOptionalParam("salt", "deploy contract salt",FEE_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)