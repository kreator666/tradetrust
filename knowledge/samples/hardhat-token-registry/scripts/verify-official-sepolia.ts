import { run } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployment-official.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment-official.json not found. Run deploy-token-registry-sepolia first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("TitleEscrowFactory:", deployment.titleEscrowFactory);
  console.log("TradeTrustToken:", deployment.tokenRegistry);

  console.log("\nVerifying TitleEscrowFactory...");
  await run("verify:verify", {
    address: deployment.titleEscrowFactory,
    constructorArguments: [],
  });

  console.log("\nVerifying TradeTrustToken...");
  await run("verify:verify", {
    address: deployment.tokenRegistry,
    contract: "contracts/TradeTrustToken.sol:TradeTrustToken",
    constructorArguments: [
      "Official TradeTrust Token Registry Demo",
      "OTTRD",
      deployment.titleEscrowFactory,
    ],
  });

  console.log("\nVerification submitted.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
