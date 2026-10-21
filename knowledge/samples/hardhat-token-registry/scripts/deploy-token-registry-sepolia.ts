import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers6";
import {
  TitleEscrowFactory__factory,
  TradeTrustToken__factory,
} from "@tradetrust-tt/token-registry/contracts";
import fs from "fs";
import path from "path";

async function main() {
  if (!process.env.SEPOLIA_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("请先在 .env 中配置 SEPOLIA_RPC 与 PRIVATE_KEY");
  }

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Deployer:", deployer.address);

  const balance = await provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  console.log("\nDeploying TitleEscrowFactory...");
  const titleEscrowFactory = await new TitleEscrowFactory__factory(deployer).deploy();
  await titleEscrowFactory.waitForDeployment();
  const titleEscrowFactoryAddress = await titleEscrowFactory.getAddress();
  console.log("TitleEscrowFactory deployed to:", titleEscrowFactoryAddress);

  console.log("\nDeploying TradeTrustToken (Token Registry)...");
  const tokenRegistry = await new TradeTrustToken__factory(deployer).deploy(
    "Official TradeTrust Token Registry Demo",
    "OTTRD",
    titleEscrowFactoryAddress
  );
  await tokenRegistry.waitForDeployment();
  const tokenRegistryAddress = await tokenRegistry.getAddress();
  console.log("TradeTrustToken deployed to:", tokenRegistryAddress);

  const deployment = {
    network: "sepolia",
    titleEscrowFactory: titleEscrowFactoryAddress,
    tokenRegistry: tokenRegistryAddress,
    deployer: deployer.address,
  };

  const deploymentPath = path.join(__dirname, "..", "deployment-official.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\ndeployment-official.json written");
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
