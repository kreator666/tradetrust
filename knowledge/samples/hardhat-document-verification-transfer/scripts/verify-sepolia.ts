import { run, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found. Run deploy:sepolia first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Registry proxy:", deployment.registry);
  console.log("Escrow proxy:", deployment.escrow);

  const registryImpl = await upgrades.erc1967.getImplementationAddress(deployment.registry);
  const escrowImpl = await upgrades.erc1967.getImplementationAddress(deployment.escrow);
  console.log("Registry implementation:", registryImpl);
  console.log("Escrow implementation:", escrowImpl);

  console.log("\nVerifying DocumentRegistry implementation...");
  await run("verify:verify", {
    address: registryImpl,
    constructorArguments: [],
  });

  console.log("\nVerifying DocumentEscrow implementation...");
  await run("verify:verify", {
    address: escrowImpl,
    constructorArguments: [],
  });

  console.log("\nVerification submitted. Check Etherscan Sepolia for status.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
