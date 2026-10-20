import { network } from "hardhat";
import { ethers as ethersV6 } from "ethers6";
import { signW3C, getTokenId } from "@trustvc/trustvc";
import { generateKeyPair, CryptoSuite } from "@trustvc/w3c-issuer";
import { TradeTrustToken__factory } from "@tradetrust-tt/token-registry/contracts";

async function main() {
  const registryAddress = process.env.TOKEN_REGISTRY_ADDRESS;
  if (!registryAddress) {
    throw new Error("Please set TOKEN_REGISTRY_ADDRESS in .env");
  }

  const provider = new ethersV6.BrowserProvider(network.provider);
  const [minter, beneficiary, holder] = await Promise.all([
    provider.getSigner(0),
    provider.getSigner(1),
    provider.getSigner(2),
  ]);

  const keyPair = await generateKeyPair({ type: CryptoSuite.EcdsaSd2023 });
  const chainId = (await provider.getNetwork()).chainId.toString();

  const rawDocument = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://w3id.org/security/data-integrity/v2",
      "https://w3c-ccg.github.io/citizenship-vocab/contexts/citizenship-v2.jsonld",
      "https://trustvc.io/context/transferable-records-context.json",
    ],
    credentialStatus: {
      type: "TransferableRecords",
      tokenNetwork: { chain: "ETH", chainId },
      tokenRegistry: registryAddress,
    },
    credentialSubject: {
      name: "TradeTrust Demo",
      type: ["PermanentResident", "Person"],
    },
    issuer: "did:web:example.com",
    type: ["VerifiableCredential"],
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const { signed: signedDocument } = await signW3C(rawDocument, {
    "@context": "https://w3id.org/security/multikey/v1",
    id: "did:web:example.com#keys-1",
    controller: "did:web:example.com",
    type: keyPair.type as any,
    publicKeyMultibase: keyPair.publicKeyMultibase,
    secretKeyMultibase: keyPair.secretKeyMultibase,
  });

  if (!signedDocument) {
    throw new Error("Failed to sign document");
  }

  const tokenId = getTokenId(signedDocument);
  console.log("Token ID:", tokenId);

  const registry = TradeTrustToken__factory.connect(registryAddress, minter);
  const tx = await registry.mint(
    await beneficiary.getAddress(),
    await holder.getAddress(),
    tokenId,
    "0x"
  );
  const receipt = await tx.wait();
  console.log("Minted in tx:", receipt.hash);
  console.log("Owner (TitleEscrow):", await registry.ownerOf(tokenId));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
