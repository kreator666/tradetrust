import express from "express";
import path from "path";
import fs from "fs";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: 0,
    etag: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  })
);

app.get("/config", (_req, res) => {
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (fs.existsSync(deploymentPath)) {
    res.json(JSON.parse(fs.readFileSync(deploymentPath, "utf8")));
  } else {
    res.json({});
  }
});

app.get("/abis/:name", (req, res) => {
  const abiPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${req.params.name}.sol`,
    `${req.params.name}.json`
  );
  if (!fs.existsSync(abiPath)) {
    return res.status(404).send("ABI not found");
  }
  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  res.json(artifact.abi);
});

/**
 * 后端代部署账户签发文档。
 * 仅用于本地演示；生产环境应通过授权账户在客户端签名。
 */
app.post("/api/issue", async (req, res) => {
  const { documentHash } = req.body;
  if (!documentHash || !documentHash.startsWith("0x") || documentHash.length !== 66) {
    return res.status(400).json({ error: "Invalid documentHash" });
  }
  if (!process.env.SEPOLIA_RPC || !process.env.PRIVATE_KEY) {
    return res.status(500).json({ error: "SEPOLIA_RPC or PRIVATE_KEY not configured" });
  }

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    return res.status(500).json({ error: "deployment.json not found" });
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const registryAbi = await fetch(`http://localhost:${port}/abis/DocumentRegistry`).then((r) =>
      r.json()
    );
    const registry = new ethers.Contract(deployment.registry, registryAbi, wallet);

    const alreadyIssued = await registry.isValid(documentHash);
    if (alreadyIssued) {
      return res.status(400).json({ error: "该文档哈希已被签发，请勿重复签发" });
    }

    const issuerRole = await registry.ISSUER_ROLE();
    const hasRole = await registry.hasRole(issuerRole, wallet.address);
    if (!hasRole) {
      await (await registry.grantRole(issuerRole, wallet.address)).wait();
    }

    const tx = await registry.issue(documentHash);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash, documentHash });
  } catch (err: any) {
    console.error(err);
    const msg = err.message || String(err);
    if (msg.includes("DocumentAlreadyIssued") || (err.data && err.data.includes("5f1b530c"))) {
      return res.status(400).json({ error: "该文档哈希已被签发，请勿重复签发" });
    }
    res.status(500).json({ error: msg });
  }
});

app.post("/api/deploy-escrow", async (req, res) => {
  const { documentHash, beneficiary, holder, admin } = req.body;
  if (!documentHash || !documentHash.startsWith("0x") || documentHash.length !== 66) {
    return res.status(400).json({ error: "Invalid documentHash" });
  }
  if (!beneficiary || !holder || !admin) {
    return res.status(400).json({ error: "beneficiary, holder, admin are required" });
  }
  if (!process.env.SEPOLIA_RPC || !process.env.PRIVATE_KEY) {
    return res.status(500).json({ error: "SEPOLIA_RPC or PRIVATE_KEY not configured" });
  }

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    return res.status(500).json({ error: "deployment.json not found" });
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const escrowArtifactPath = path.join(
      __dirname,
      "..",
      "artifacts",
      "contracts",
      "DocumentEscrow.sol",
      "DocumentEscrow.json"
    );
    if (!fs.existsSync(escrowArtifactPath)) {
      return res.status(500).json({ error: "Escrow artifact not found" });
    }
    const escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, "utf8"));

    const registryAbi = await fetch(`http://localhost:${port}/abis/DocumentRegistry`).then((r) =>
      r.json()
    );
    const registry = new ethers.Contract(deployment.registry, registryAbi, wallet);
    const isValid = await registry.isValid(documentHash);
    if (!isValid) {
      return res.status(400).json({ error: "文档哈希未在 Registry 中签发，无法创建 Escrow" });
    }

    const EscrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
    const escrowImpl = await EscrowFactory.deploy();
    await escrowImpl.waitForDeployment();
    const implAddress = await escrowImpl.getAddress();

    const proxyArtifactPath = path.join(
      __dirname,
      "..",
      "artifacts",
      "@openzeppelin",
      "contracts",
      "proxy",
      "ERC1967",
      "ERC1967Proxy.sol",
      "ERC1967Proxy.json"
    );
    if (!fs.existsSync(proxyArtifactPath)) {
      return res.status(500).json({ error: "Proxy artifact not found" });
    }
    const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, "utf8"));
    const initData = escrowImpl.interface.encodeFunctionData("initialize", [
      deployment.registry,
      documentHash,
      beneficiary,
      holder,
      admin,
    ]);
    const ProxyFactory = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
    const proxy = await ProxyFactory.deploy(implAddress, initData);
    const deployTxHash = proxy.deploymentTransaction()?.hash;
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();

    // 将新 Escrow 注册到 Registry
    const registerTx = await registry.registerEscrow(proxyAddress, documentHash);
    await registerTx.wait();

    res.json({
      success: true,
      escrow: proxyAddress,
      documentHash,
      beneficiary,
      holder,
      admin,
      implementation: implAddress,
      txHash: deployTxHash,
      registerTxHash: registerTx.hash,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(port, () => {
  console.log(`Document Verification & Transfer frontend: http://localhost:${port}`);
});
