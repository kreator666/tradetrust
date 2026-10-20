import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.REGISTRY_PROXY || "";
  if (!proxyAddress) {
    throw new Error("REGISTRY_PROXY env variable is required");
  }

  const V2Factory = await ethers.getContractFactory("DocumentRegistryV2");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, V2Factory, {
    kind: "uups",
  });
  await upgraded.waitForDeployment();

  console.log("DocumentRegistry upgraded to V2 at proxy:", await upgraded.getAddress());
  console.log("Version:", await upgraded.version());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
