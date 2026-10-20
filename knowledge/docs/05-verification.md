# 文档验证（tt-verify）

`@tradetrust-tt/tt-verify` 用于程序化验证 TradeTrust 文档。它会返回一组 **verification fragments**，分别回答三个问题：

- 文档是否被篡改？
- 文档的签发/撤销状态是否有效？
- 签发者身份是否可信？

## 基本用法

```ts
import { isValid, verify } from "@tradetrust-tt/tt-verify";

const fragments = await verify(signedDocument, { network: "sepolia" });
console.log(isValid(fragments)); // true / false
```

## Fragment 类型

| 类型 | 说明 |
|------|------|
| `DOCUMENT_INTEGRITY` | Merkle root / target hash 校验 |
| `DOCUMENT_STATUS` | 链上 issue / revoke / token 状态 |
| `ISSUER_IDENTITY` | DNS-TXT / DNS-DID / DID 身份校验 |

## 默认验证器

```ts
import { openAttestationVerifiers, verificationBuilder } from "@tradetrust-tt/tt-verify";

const verify = verificationBuilder(openAttestationVerifiers, { network: "sepolia" });
const fragments = await verify(document);
```

默认包含的 verifier：

- `OpenAttestationHash`
- `OpenAttestationEthereumDocumentStoreStatus`
- `OpenAttestationEthereumTokenRegistryStatus`
- `OpenAttestationDidSignedDocumentStatus`
- `OpenAttestationDnsTxtIdentityProof`
- `OpenAttestationDnsDidIdentityProof`

## 自定义 Verifier

```ts
import { Verifier, verificationBuilder, openAttestationVerifiers, isValid } from "@tradetrust-tt/tt-verify";

const customVerifier: Verifier<any> = {
  skip: async () => ({
    status: "SKIPPED",
    type: "DOCUMENT_INTEGRITY",
    name: "CustomVerifier",
    reason: { code: 0, codeString: "SKIPPED", message: "Not applicable" },
  }),
  test: (document) => document.version === "https://schema.openattestation.com/2.0/schema.json",
  verify: async (document) => {
    return { status: "VALID", type: "DOCUMENT_INTEGRITY", name: "CustomVerifier", data: {} };
  },
};

const verify = verificationBuilder([...openAttestationVerifiers, customVerifier], { network: "sepolia" });
```

## 结果解释

```ts
import { interpretFragments } from "@tradetrust-tt/tt-verify";

const { hashValid, issuedValid, identityValid } = interpretFragments(fragments);
console.log({ hashValid, issuedValid, identityValid });
```

## 自定义 Provider

```ts
import { generateProvider, providerType } from "@tradetrust-tt/tt-verify";

const provider = generateProvider({
  network: "sepolia",
  providerType: "infura",
  apiKey: "YOUR_INFURA_KEY",
});

const verify = verificationBuilder(openAttestationVerifiers, { provider });
```
