import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const RegistryFactory = await ethers.getContractFactory("DocumentRegistry");
  const proxy = await upgrades.deployProxy(RegistryFactory, [deployer.address], {
    kind: "uups",
  });
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  console.log("DocumentRegistry proxy deployed to:", proxyAddress);
  console.log("Admin:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
