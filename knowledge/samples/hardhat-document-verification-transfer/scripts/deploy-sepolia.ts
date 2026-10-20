import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  if (!process.env.SEPOLIA_RPC || !process.env.PRIVATE_KEY) {
    throw new Error(
      "请先在 .env 中配置 SEPOLIA_RPC 与 PRIVATE_KEY，并确保部署账户有足够 SepoliaETH"
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const RegistryFactory = await ethers.getContractFactory("DocumentRegistry");
  const registry = await upgrades.deployProxy(RegistryFactory, [deployer.address], {
    kind: "uups",
  });
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("DocumentRegistry proxy:", registryAddress);

  // 给部署账户签发权限并签发一份示例文档
  await (await registry.grantRole(await registry.ISSUER_ROLE(), deployer.address)).wait();
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("sepolia-demo-doc"));
  await (await registry.issue(documentHash)).wait();
  console.log("Document issued:", documentHash);

  const beneficiaryAddress = process.env.BENEFICIARY_ADDRESS || deployer.address;
  const holderAddress = process.env.HOLDER_ADDRESS || deployer.address;

  const EscrowFactory = await ethers.getContractFactory("DocumentEscrow");
  const escrow = await upgrades.deployProxy(
    EscrowFactory,
    [registryAddress, documentHash, beneficiaryAddress, holderAddress, deployer.address],
    { kind: "uups" }
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("DocumentEscrow proxy:", escrowAddress);

  const deployment = {
    network: "sepolia",
    registry: registryAddress,
    escrow: escrowAddress,
    documentHash,
    deployer: deployer.address,
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "deployment.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("deployment.json written");
  console.log("\n下一步：\n  npm run frontend");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
