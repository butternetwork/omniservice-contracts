const {FEE_SALT, DEPLOY_FACTORY} = process.env;


task("setFeeReceiver",
    "Set message fee service address ",
    require("./setFeeReceiver")
)
    .addOptionalParam("feesalt", "mos contract address",FEE_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)

task("setMessageFee",
    "set chain message fee",
    require("./setMessageFee")
)
    .addOptionalParam("chainid", "to chain id","later",types.string)
    .addOptionalParam("token", "fee token address","later" , types.address)
    .addOptionalParam("salt", "fee contract salt", FEE_SALT , types.string)
    .addOptionalParam("factory", "deploy factory contract address", DEPLOY_FACTORY , types.string)
