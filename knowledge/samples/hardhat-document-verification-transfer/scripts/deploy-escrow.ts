import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer, beneficiary, holder] = await ethers.getSigners();

  const registryAddress = process.env.REGISTRY_PROXY || "";
  const documentHash =
    process.env.DOCUMENT_HASH || ethers.keccak256(ethers.toUtf8Bytes("demo-doc"));

  if (!registryAddress) {
    throw new Error("REGISTRY_PROXY env variable is required");
  }

  const registry = await ethers.getContractAt("DocumentRegistry", registryAddress);

  // 确保文档已签发；若未签发，则由 admin 先签发
  if (!(await registry.isValid(documentHash))) {
    const issuerRole = await registry.ISSUER_ROLE();
    if (!(await registry.hasRole(issuerRole, deployer.address))) {
      await (await registry.grantRole(issuerRole, deployer.address)).wait();
    }
    await (await registry.issue(documentHash)).wait();
    console.log("Document issued:", documentHash);
  }

  const EscrowFactory = await ethers.getContractFactory("DocumentEscrow");
  const proxy = await upgrades.deployProxy(
    EscrowFactory,
    [registryAddress, documentHash, beneficiary.address, holder.address, deployer.address],
    { kind: "uups" }
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  // 注册到 Registry
  await (await registry.registerEscrow(proxyAddress, documentHash)).wait();
  console.log("Escrow registered in Registry for document:", documentHash);

  console.log("DocumentEscrow proxy deployed to:", proxyAddress);
  console.log("Registry:", registryAddress);
  console.log("Document hash:", documentHash);
  console.log("Beneficiary:", beneficiary.address);
  console.log("Holder:", holder.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
