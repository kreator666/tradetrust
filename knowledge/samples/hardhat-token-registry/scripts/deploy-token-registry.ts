import { network } from "hardhat";
import { ethers as ethersV6 } from "ethers6";
import {
  TitleEscrowFactory__factory,
  TradeTrustToken__factory,
} from "@tradetrust-tt/token-registry/contracts";

async function main() {
  const provider = new ethersV6.BrowserProvider(network.provider);
  const deployer = await provider.getSigner(0);
  console.log("Deployer:", await deployer.getAddress());

  const titleEscrowFactory = await new TitleEscrowFactory__factory(deployer).deploy();
  await titleEscrowFactory.waitForDeployment();
  const titleEscrowFactoryAddress = await titleEscrowFactory.getAddress();
  console.log("TitleEscrowFactory deployed to:", titleEscrowFactoryAddress);

  const tokenRegistry = await new TradeTrustToken__factory(deployer).deploy(
    "Demo Token Registry",
    "DTR",
    titleEscrowFactoryAddress
  );
  await tokenRegistry.waitForDeployment();
  console.log("TokenRegistry deployed to:", await tokenRegistry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
