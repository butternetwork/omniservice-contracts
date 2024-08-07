let fs = require("fs");
let path = require("path");

const { isTron, getTronContract, isTestnet, isRelayChain,toEvmAddress,fromEvmAddress } = require("../../utils/helper");
const net = require("node:net");

async function getOmniService(hre, contractAddress) {
    let addr = contractAddress;
    if (addr === "" || addr === "latest") {
        let deployment = await readFromFile(hre.network.config.chainId);
        addr = deployment[hre.network.config.chainId]["mosAddress"];
        if (!addr) {
            throw "mos not deployed.";
        }
    }

    let mos;
    if (isTron(hre.network.config.chainId)) {
        mos = await getTronContract("OmniService", hre.artifacts, hre.network.name, addr);
    } else if (isRelayChain(hre.network.name)) {
        mos = await ethers.getContractAt("OmniServiceRelay", addr);
    } else {
        mos = await ethers.getContractAt("OmniService", addr);
    }

    console.log("mos address:", mos.address);
    return mos;
}

async function getFeeService(hre, contractAddress) {
    let addr = contractAddress;
    let feeService;
    if (addr === "" || addr === "latest") {
        let mos = await getOmniService(hre, contractAddress);
        if (isTron(hre.network.config.chainId)) {
            let feeServiceAddr = await mos.feeService().call();
            feeServiceAddr = await toEvmAddress(feeServiceAddr,hre.network.name)
            if (feeServiceAddr === ethers.constants.AddressZero) {
                console.log("mos=>feeService address:", mos.address);
                return mos;
            } else {
                feeServiceAddr = await fromEvmAddress(feeServiceAddr,hre.network.name)
                feeService = await getTronContract("FeeService", hre.artifacts, hre.network.name, feeServiceAddr);
            }
        } else {
            let feeServiceAddr = await mos.feeService();
            if (feeServiceAddr === ethers.constants.AddressZero) {
                console.log("mos=>feeService address:", mos.address);
                return mos;
            } else {
                feeService = await ethers.getContractAt("FeeService", feeServiceAddr);
            }
        }
    }
    console.log("feeService address:", feeService.address);
    return feeService;
}

function getRole(role) {
    if (role.substr(0, 2) === "0x") {
        return role;
    }
    if (role === "admin") {
        return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }
    let roleName = role;
    if (role === "manager") {
        roleName = "MANAGER_ROLE";
    } else if (role === "minter") {
        roleName = "MINTER_ROLE";
    }
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(roleName));
}

async function getToken(network, token) {
    if (token === "native") {
        return ethers.constants.AddressZero;
    }
    let chain = await getChain(network, network);
    let chainId = chain.chainId;

    if (chainId === 1360100178526209 || chainId === 1360100178526210) {
        // near
        if (token.length > 4) {
            return token;
        }
    } else if (chainId === 728126428 || chainId === 728126429) {
        // tron
        if (token.length === 34) {
            return token;
        }
    } else {
        if (token.substr(0, 2) === "0x") {
            return token;
        }
    }

    throw "token not support ..";
}

async function saveFeeList(network, feeList) {
    let p;
    if (isTestnet(network)) {
        p = path.join(__dirname, "../../configs/testnet/fee.json");
        await folder("../../configs/testnet/");
    } else {
        p = path.join(__dirname, "../../configs/fee.json");
        await folder("../../configs/");
    }

    fs.writeFileSync(p, JSON.stringify(feeList, null, "\t"));
}

async function getFeeList(network) {
    let p;
    if (isTestnet(network)) {
        p = path.join(__dirname, "../../configs/testnet/fee.json");
    } else {
        p = path.join(__dirname, "../../configs/fee.json");
    }

    let feeList;
    if (!fs.existsSync(p)) {
        throw "no fee ..";
    } else {
        let rawdata = fs.readFileSync(p);
        feeList = JSON.parse(rawdata);
        if (!feeList) {
            throw "not fee ..";
        }
    }

    return feeList;
}

async function getFee(network) {
    let feeList = await getFeeList(network);
    if (!feeList[network]) {
        throw "no chain fee...";
    }
    return feeList[network];
}

async function getFeeConfig(network) {
    let p;
    if (isTestnet(network)) {
        p = path.join(__dirname, "../../configs/testnet/feeConfig.json");
    } else {
        p = path.join(__dirname, "../../configs/feeConfig.json");
    }

    let configList;
    if (!fs.existsSync(p)) {
        throw "no fee config ..";
    } else {
        let rawdata = fs.readFileSync(p);
        configList = JSON.parse(rawdata);
        if (!configList) {
            throw "not fee ..";
        }
    }
    if (!configList[network]) {
        throw "no chain fee config...";
    }

    return configList[network];
}

async function getChain(network, chain) {
    let chains = await getChainList(network);
    for (let i = 0; i < chains.length; i++) {
        if (chains[i].name === chain || chains[i].chainId == chain) {
            return chains[i];
        }
    }

    throw "can't find the chain";
}

async function getChainList(network) {
    let p;
    if (isTestnet(network)) {
        p = path.join(__dirname, "../../configs/testnet/chains.json");
    } else {
        p = path.join(__dirname, "../../configs/chains.json");
    }
    let chains;
    if (!fs.existsSync(p)) {
        throw "no chains ..";
    } else {
        let rawdata = fs.readFileSync(p);
        chains = JSON.parse(rawdata);
    }

    return chains;
}

async function readFromFile(network) {
    let p = path.join(__dirname, "../../deployments/deployments.json");
    let deploy;
    if (!fs.existsSync(p)) {
        deploy = {};
        deploy[network] = {};
    } else {
        let rawdata = fs.readFileSync(p);
        deploy = JSON.parse(rawdata);
        if (!deploy[network]) {
            deploy[network] = {};
        }
    }

    return deploy;
}

async function writeToFile(deploy) {
    let p = path.join(__dirname, "../../deployments/deployments.json");
    await folder("../deployments/");
    fs.writeFileSync(p, JSON.stringify(deploy, null, "\t"));
}

const folder = async (reaPath) => {
    const absPath = path.resolve(__dirname, reaPath);
    try {
        await fs.promises.stat(absPath);
    } catch (e) {
        // {recursive: true}
        await fs.promises.mkdir(absPath, { recursive: true });
    }
};

module.exports = {
    getOmniService,
    getFeeService,
    writeToFile,
    readFromFile,
    getToken,
    getFee,
    getFeeList,
    saveFeeList,
    getFeeConfig,
    getChain,
    getChainList,
};
