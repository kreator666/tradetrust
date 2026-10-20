import { signW3C, verifyW3CSignature } from "@trustvc/trustvc";
import { generateKeyPair, CryptoSuite } from "@trustvc/w3c-issuer";

async function main() {
  const keyPair = await generateKeyPair({ type: CryptoSuite.EcdsaSd2023 });

  const rawDocument = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://w3id.org/security/data-integrity/v2",
      "https://w3c-ccg.github.io/citizenship-vocab/contexts/citizenship-v2.jsonld",
    ],
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

  const result = await verifyW3CSignature(signedDocument);
  console.log("Verification result:", result);
  // 注意：若 did:web 无法解析，验证会失败；生产环境需托管 did.json 或使用自定义 documentLoader
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
