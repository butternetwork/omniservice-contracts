const {FEE_SALT, DEPLOY_FACTORY} = process.env;


task("setFeeReceiver",
    "Set message fee service address ",
    require("./setFeeReceiver")
)
    .addParam("address", "message fee address")
    .addOptionalParam("feesalt", "mos contract address",FEE_SALT , types.string)
    .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)

task("setMessageFee",
    "set chain message fee",
    require("./setMessageFee")
)
    .addParam("chainid", "to chain id",)
    .addParam("price", "Expenses to be fee",)
    .addParam("base", "Target chain execution base limit",)
    .addOptionalParam("token", "fee token address","0x0000000000000000000000000000000000000000" , types.address)
    .addOptionalParam("salt", "fee contract salt", FEE_SALT , types.string)
    .addOptionalParam("factory", "deploy factory contract address", DEPLOY_FACTORY , types.string)
