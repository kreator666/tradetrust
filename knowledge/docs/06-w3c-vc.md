# W3C 可验证凭证（TrustVC）

TradeTrust 已逐步迁移到 **W3C Verifiable Credentials v2** 数据模型，使用 `@trustvc/trustvc` 进行签名、签发、验证与转让。

## 关键概念

- **`credentialStatus`**：描述凭证状态。
  - `TransferableRecords`：可转让 token，需 Token Registry。
  - `BitstringStatusListEntry`：非转让凭证的撤销/挂起状态。
  - 无：永久凭证，不可撤销。
- **签名套件**：默认 `ecdsa-sd-2023`，支持选择性披露。
- **密钥类型**：`Multikey`，通过 `publicKeyMultibase` / `secretKeyMultibase` 表示。

## 生成密钥对

```ts
import { generateKeyPair, CryptoSuite } from "@trustvc/w3c-issuer";

const keyPair = await generateKeyPair({ type: CryptoSuite.EcdsaSd2023 });
// keyPair.type === "Multikey"
// keyPair.publicKeyMultibase / secretKeyMultibase
```

## 签名 W3C VC

```ts
import { signW3C } from "@trustvc/trustvc";

const rawDocument = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/security/data-integrity/v2",
    "https://w3c-ccg.github.io/citizenship-vocab/contexts/citizenship-v2.jsonld",
    "https://trustvc.io/context/transferable-records-context.json",
  ],
  credentialStatus: {
    type: "TransferableRecords",
    tokenNetwork: { chain: "POL", chainId: "80002" },
    tokenRegistry: "0x...",
  },
  credentialSubject: { name: "TrustVC", type: ["PermanentResident", "Person"] },
  issuer: "did:web:example.com",
  type: ["VerifiableCredential"],
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const { signed: signedDocument } = await signW3C(rawDocument, {
  "@context": "https://w3id.org/security/multikey/v1",
  id: "did:web:example.com#keys-1",
  controller: "did:web:example.com",
  type: keyPair.type,
  publicKeyMultibase: keyPair.publicKeyMultibase,
  secretKeyMultibase: keyPair.secretKeyMultibase,
});
```

## 提取 tokenId 并铸造

```ts
import { getTokenId, encrypt } from "@trustvc/trustvc";
import { TradeTrustToken__factory } from "@tradetrust-tt/token-registry/contracts";

const tokenId = getTokenId(signedDocument);
const encryptedRemarks = remark ? encrypt(remark, signedDocument.id) : "0x";

const registry = TradeTrustToken__factory.connect(registryAddress, minter);
const tx = await registry.mint(owner, holder, tokenId, encryptedRemarks);
await tx.wait();
```

## 非转让凭证：Bitstring Status List

```ts
const rawDocument = {
  // ...
  credentialStatus: {
    id: "https://example.com/credentials/status/3#94567",
    type: "BitstringStatusListEntry",
    statusPurpose: "revocation",
    statusListIndex: "94567",
    statusListCredential: "https://example.com/credentials/status/3",
  },
};
```

## 无状态凭证

直接省略 `credentialStatus` 字段即可，适用于永久声明。

## 注意事项

- `validUntil` 必须在将来，否则签名/验证会报过期错误。
- `credentialSubject` 中使用的类型需要在 `@context` 中定义。
- `remark` 长度限制 120 字符，建议加密后传入。
