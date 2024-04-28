const { MOS_SALT, DEPLOY_FACTORY} = process.env;

task("mosSetRelay",
    "Initialize MOSRelay address for MOS",
    require("./mosSetRelay")
)
    .addParam("relay", "map chain relayOperation contract address")
    .addParam("chain", "map chain id")
    .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)


task("mosSetClient",
    "Set light client address for MOS",
    require("./mosSetClient")
)
    .addParam("client", "light client address")
    .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)


task("setFeeService",
    "Set message fee service address ",
    require("./setFeeService")
)
    .addParam("address", "message fee address")
    .addOptionalParam("salt", "mos contract salt", MOS_SALT , types.string)
    .addOptionalParam("factory", "deploy factory contract address", DEPLOY_FACTORY , types.string)
