import express from "express";
import path from "path";
import fs from "fs";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: 0,
    etag: false,
    setHeaders: (res: express.Response) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  })
);

app.get("/config", (_req: express.Request, res: express.Response) => {
  const deploymentPath = path.join(__dirname, "..", "deployment-official.json");
  const mintPath = path.join(__dirname, "..", "mint-official.json");
  const config: any = {};
  if (fs.existsSync(deploymentPath)) {
    Object.assign(config, JSON.parse(fs.readFileSync(deploymentPath, "utf8")));
  }
  if (fs.existsSync(mintPath)) {
    Object.assign(config, { mint: JSON.parse(fs.readFileSync(mintPath, "utf8")) });
  }
  res.json(config);
});

app.get("/abis/:name", (req: express.Request, res: express.Response) => {
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
 * 后端代部署账户铸造可转让记录。
 * 仅用于本地演示；生产环境应通过授权账户在客户端签名。
 */
app.post("/api/mint", async (req: express.Request, res: express.Response) => {
  const { tokenId, beneficiary, holder, remark } = req.body;
  if (!tokenId || !tokenId.startsWith("0x") || tokenId.length !== 66) {
    return res.status(400).json({ error: "Invalid tokenId" });
  }
  if (!beneficiary || !holder) {
    return res.status(400).json({ error: "beneficiary and holder are required" });
  }
  if (!process.env.SEPOLIA_RPC || !process.env.PRIVATE_KEY) {
    return res.status(500).json({ error: "SEPOLIA_RPC or PRIVATE_KEY not configured" });
  }

  const deploymentPath = path.join(__dirname, "..", "deployment-official.json");
  if (!fs.existsSync(deploymentPath)) {
    return res.status(500).json({ error: "deployment-official.json not found" });
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const tokenAbi = await fetch(`http://localhost:${port}/abis/TradeTrustToken`).then((r) =>
      r.json()
    );
    const registry = new ethers.Contract(deployment.tokenRegistry, tokenAbi, wallet);

    const minterRole = await registry.MINTER_ROLE();
    const hasRole = await registry.hasRole(minterRole, wallet.address);
    if (!hasRole) {
      return res.status(400).json({ error: "部署账户没有 MINTER_ROLE" });
    }

    let exists = false;
    try {
      await registry.ownerOf(tokenId);
      exists = true;
    } catch (e) {
      exists = false;
    }
    if (exists) {
      return res.status(400).json({ error: "该 tokenId 已被铸造" });
    }

    const tx = await registry.mint(beneficiary, holder, tokenId, remark || "0x");
    await tx.wait();

    const owner = await registry.ownerOf(tokenId);
    res.json({
      success: true,
      txHash: tx.hash,
      tokenId,
      beneficiary,
      holder,
      titleEscrow: owner,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(port, () => {
  console.log(`TradeTrust Official Token Registry frontend: http://localhost:${port}`);
});
