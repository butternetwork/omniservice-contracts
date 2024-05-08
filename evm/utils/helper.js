let fs = require("fs");
let path = require("path");

let { Wallet } = require("zksync-web3");
let { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

const {DEPLOY_FACTORY,PRIVATE_KEY} = process.env;

async function zksyncDeploy(contractName, args, hre) {
    const wallet = new Wallet(PRIVATE_KEY);
    const deployer = new Deployer(hre, wallet);
    const c_artifact = await deployer.loadArtifact(contractName);
    const c = await deployer.deploy(c_artifact, args);
    return c.address;
}

async function create(salt, bytecode, param) {
    let [wallet] = await ethers.getSigners();
    let factory = await ethers.getContractAt("IDeployFactory", DEPLOY_FACTORY, wallet);
    let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
    console.log("deploy factory address:", factory.address);
    console.log("deploy salt:", salt);
    let addr = await factory.getAddress(salt_hash);
    console.log("deployed to :", addr);

    let code = await ethers.provider.getCode(addr);
    let redeploy = false;
    if (code === "0x") {
        let create_code = ethers.utils.solidityPack(["bytes", "bytes"], [bytecode, param]);
        let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();
        if (create.status == 1) {
            console.log("deployed to :", addr);
            redeploy = true;
        } else {
            console.log("deploy fail");
            throw "deploy fail";
        }
    } else {
        console.log("already deploy, please change the salt if if want to deploy another contract ...");
    }

    return [addr, redeploy];
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

async function getMos(chainId, network) {
    let deploy = await readFromFile(network);
    if (deploy[network]["mosProxy"]) {
        let Mos;
        if (chainId === 212 || chainId === 22776) {
            Mos = await ethers.getContractFactory("MapoServiceRelayV3");
        } else {
            Mos = await ethers.getContractFactory("MapoServiceV3");
        }
        let mos = Mos.attach(deploy[network]["mosProxy"]);
        return mos;
    }
    return undefined;
}

async function readFromFile(network) {
    let p = path.join(__dirname, "../configs/cotractConfig.json");
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

async function getFeeList(token) {
    let p = path.join(__dirname, "../constants/fee.json");
    let tokenFees;
    if (!fs.existsSync(p)) {
        throw "not fee ..";
    } else {
        let rawdata = fs.readFileSync(p);
        tokenFees = JSON.parse(rawdata);
        if (!tokenFees[token]) {
            throw "not fee ..";
        }
    }

    return tokenFees[token];
}

async function getChain(network) {
    let chains = await getChainList();

    for (let i = 0; i < chains.length; i++) {
        if (chains[i].chain === network || chains[i].chainId == network) {
            return chains[i];
        }
    }

    throw "can't find the chain";
}

async function getChainList() {
    let p = path.join(__dirname, "../constants/chains.json");
    let chains;
    if (!fs.existsSync(p)) {
        throw "not chains ..";
    } else {
        let rawdata = fs.readFileSync(p);
        chains = JSON.parse(rawdata);
    }

    return chains;
}

async function getTokenList(chainId) {
    let p = path.join(__dirname, "../constants/tokens.json");
    let tokens;
    if (!fs.existsSync(p)) {
        throw "not tokens ..";
    } else {
        let rawdata = fs.readFileSync(p);
        tokens = JSON.parse(rawdata);
        if (!tokens[chainId]) {
            throw "no tokens ..";
        }
    }
    let tokenList = Object.keys(tokens[chainId]);

    return tokenList;
}

async function getToken(network, token) {
    let chain = await getChain(network);
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
    let tokens = await getTokensFromFile(chain.chain);
    if (tokens[chain.chain][token]) {
        return tokens[chain.chain][token];
    }

    throw "token not support ..";
}

async function getTokensFromFile(network) {
    let p = path.join(__dirname, "../constants/tokens.json");
    let tokens;
    if (!fs.existsSync(p)) {
        tokens = {};
        tokens[network] = {};
    } else {
        let rawdata = fs.readFileSync(p);
        tokens = JSON.parse(rawdata);
        if (!tokens[network]) {
            tokens[network] = {};
        }
    }

    return tokens;
}

async function writeToFile(deploy) {
    let p = path.join(__dirname, "../configs/cotractConfig.json");
    await folder("../configs/");
    // fs.writeFileSync(p,JSON.stringify(deploy));
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

function needVerify(chainId) {
    if (
        chainId === 1 ||
        chainId === 56 ||
        chainId === 137 ||
        chainId === 199 ||
        chainId === 81457 ||
        chainId === 8453 ||
        chainId === 324
    ) {
        return true;
    } else {
        return false;
    }
}


module.exports = {
    writeToFile,
    readFromFile,
    getMos,
    create,
    zksyncDeploy,
    getChain,
    getToken,
    getRole,
    getTokenList,
    getChainList,
    getFeeList,
    needVerify
};
