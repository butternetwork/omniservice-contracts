// const { MOS_SALT, FEE_SALT, DEPLOY_FACTORY} = process.env;

require("./deployContracts/deploy.js")
require("./mosOperation/operation.js")
require("./relayOperation/operation.js")
require("./feeServiceOperation/operation.js")

// task("feeFactoryDeploy",
//     "Deploy the upgradeable MOS contract and initialize it",
//     require("./deployContracts/feeFactoryDeploy")
// )
//     .addOptionalParam("salt", "deploy contract salt",FEE_SALT , types.string)
//     .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)
//
// task("mosFactoryDeploy",
//     "Deploy the upgradeable MOS contract and initialize it",
//     require("./deployContracts/mosFactoryDeploy")
// )
//     .addParam("wrapped", "native wrapped token address")
//     .addParam("lightnode", "lightNode contract address")
//     .addOptionalParam("salt", "deploy contract salt",MOS_SALT , types.string)
//     .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)


// task("mosSetRelay",
//     "Initialize MOSRelay address for MOS",
//     require("./mosSetRelay")
// )
//     .addParam("relay", "map chain relayOperation contract address")
//     .addParam("chain", "map chain id")
//     .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
//     .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)
//
// task("mosSetClient",
//     "Set light client address for MOS",
//     require("./mosSetClient")
// )
//     .addParam("client", "light client address")
//     .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
//     .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)


// task("relaySetClientManager",
//     "Update client manager",
//     require("./relayOperation/relaySetClientManager")
// )
//     .addParam("manager","client manager contract")
//     .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
//     .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)
//
// task("relayRegisterChain",
//     "Register altchain mos to relayOperation chain",
//     require("./relayOperation/relayRegisterChain")
// )
//     .addParam("address", "mos contract address")
//     .addParam("chain", "chain id")
//     .addOptionalParam("type", "chain type, default 1", 1, types.int)
//     .addOptionalParam("salt", "mos contract address",MOS_SALT , types.string)
//     .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)



// task("setFeeService",
//     "Set message fee service address ",
//     require("./mosOperation/setFeeService")
// )
//     .addParam("address", "message fee address")
//     .addOptionalParam("salt", "mos contract salt", MOS_SALT , types.string)
//     .addOptionalParam("factory", "deploy factory contract address", DEPLOY_FACTORY , types.string)

// task("setMessageFee",
//     "set chain message fee",
//     require("./feeServiceOperation/setMessageFee")
// )
//     .addParam("chainid", "to chain id",)
//     .addParam("price", "Expenses to be fee",)
//     .addParam("base", "Target chain execution base limit",)
//     .addOptionalParam("token", "fee token address","0x0000000000000000000000000000000000000000" , types.address)
//     .addOptionalParam("salt", "fee contract salt", FEE_SALT , types.string)
//     .addOptionalParam("factory", "deploy factory contract address", DEPLOY_FACTORY , types.string)
//
// task("setFeeReceiver",
//     "Set message fee service address ",
//     require("./feeServiceOperation/setFeeReceiver")
// )
//     .addParam("address", "message fee address")
//     .addOptionalParam("feesalt", "mos contract address",FEE_SALT , types.string)
//     .addOptionalParam("factory", "mos contract address",DEPLOY_FACTORY , types.string)


