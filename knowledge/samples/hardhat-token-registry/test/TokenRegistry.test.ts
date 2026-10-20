import { expect } from "chai";
import { network } from "hardhat";
import { ethers as ethersV6 } from "ethers6";
import {
  TitleEscrowFactory__factory,
  TradeTrustToken__factory,
  TitleEscrow__factory,
} from "@tradetrust-tt/token-registry/contracts";
import { signW3C, getTokenId } from "@trustvc/trustvc";
import { generateKeyPair, CryptoSuite } from "@trustvc/w3c-issuer";

describe("TradeTrust Token Registry", function () {
  async function getProviderAndSigners() {
    const provider = new ethersV6.BrowserProvider(network.provider);
    const [deployer, beneficiary, holder] = await Promise.all([
      provider.getSigner(0),
      provider.getSigner(1),
      provider.getSigner(2),
    ]);
    return { provider, deployer, beneficiary, holder };
  }

  async function deployRegistry() {
    const { deployer, beneficiary, holder } = await getProviderAndSigners();
    const titleEscrowFactory = await new TitleEscrowFactory__factory(deployer).deploy();
    await titleEscrowFactory.waitForDeployment();
    const tokenRegistry = await new TradeTrustToken__factory(deployer).deploy(
      "Demo Token Registry",
      "DTR",
      await titleEscrowFactory.getAddress()
    );
    await tokenRegistry.waitForDeployment();
    return { deployer, beneficiary, holder, titleEscrowFactory, tokenRegistry };
  }

  async function signDemoVC(tokenRegistryAddress: string) {
    const keyPair = await generateKeyPair({ type: CryptoSuite.EcdsaSd2023 });
    const rawDocument = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://w3id.org/security/data-integrity/v2",
        "https://w3c-ccg.github.io/citizenship-vocab/contexts/citizenship-v2.jsonld",
        "https://trustvc.io/context/transferable-records-context.json",
      ],
      credentialStatus: {
        type: "TransferableRecords",
        tokenNetwork: { chain: "ETH", chainId: "31337" },
        tokenRegistry: tokenRegistryAddress,
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

    return signedDocument;
  }

  it("should deploy Token Registry and mint a transferable record", async function () {
    const { beneficiary, holder, tokenRegistry } = await deployRegistry();
    const signedDocument = await signDemoVC(await tokenRegistry.getAddress());

    expect(signedDocument.proof).to.exist;

    const tokenId = getTokenId(signedDocument);
    const tx = await tokenRegistry.mint(
      await beneficiary.getAddress(),
      await holder.getAddress(),
      tokenId,
      "0x"
    );
    await tx.wait();

    const titleEscrowAddress = await tokenRegistry.ownerOf(tokenId);
    expect(titleEscrowAddress).to.not.equal(ethersV6.ZeroAddress);

    const titleEscrow = TitleEscrow__factory.connect(titleEscrowAddress, beneficiary);
    expect(await titleEscrow.beneficiary()).to.equal(await beneficiary.getAddress());
    expect(await titleEscrow.holder()).to.equal(await holder.getAddress());
  });
});
