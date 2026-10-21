import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers6";
import {
  TradeTrustToken__factory,
} from "@tradetrust-tt/token-registry/contracts";
import fs from "fs";
import path from "path";

async function main() {
  if (!process.env.SEPOLIA_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("请先在 .env 中配置 SEPOLIA_RPC 与 PRIVATE_KEY");
  }

  const deploymentPath = path.join(__dirname, "..", "deployment-official.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment-official.json not found");
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const beneficiary = process.env.BENEFICIARY_ADDRESS || deployer.address;
  const holder = process.env.HOLDER_ADDRESS || deployer.address;
  const tokenId = ethers.keccak256(ethers.toUtf8Bytes("official-demo-doc-" + Date.now()));

  const registry = TradeTrustToken__factory.connect(deployment.tokenRegistry, deployer);

  console.log("Minting transferable record...");
  console.log("Token ID (document hash):", tokenId);
  console.log("Beneficiary:", beneficiary);
  console.log("Holder:", holder);

  const tx = await registry.mint(beneficiary, holder, tokenId, "0x");
  await tx.wait();
  console.log("Mint tx hash:", tx.hash);

  const tokenUri = await registry.tokenURI(tokenId);
  console.log("Token URI:", tokenUri);

  const owner = await registry.ownerOf(tokenId);
  console.log("Token owner (TitleEscrow):", owner);

  const mintInfo = {
    network: "sepolia",
    tokenRegistry: deployment.tokenRegistry,
    tokenId,
    beneficiary,
    holder,
    titleEscrow: owner,
    mintTxHash: tx.hash,
  };

  const mintPath = path.join(__dirname, "..", "mint-official.json");
  fs.writeFileSync(mintPath, JSON.stringify(mintInfo, null, 2));
  console.log("\nmint-official.json written");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
