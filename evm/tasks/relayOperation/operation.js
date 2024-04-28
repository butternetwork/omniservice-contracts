const { MOS_SALT, DEPLOY_FACTORY} = process.env;

task("relaySetClientManager",
    "Update client manager",
    require("./relaySetClientManager")
)
    .addParam("manager","client manager contract")
    .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)

task("relayRegisterChain",
    "Register altchain mos to relayOperation chain",
    require("./relayRegisterChain")
)
    .addParam("address", "mos contract address")
    .addParam("chain", "chain id")
    .addOptionalParam("type", "chain type, default 1", 1, types.int)
    .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)