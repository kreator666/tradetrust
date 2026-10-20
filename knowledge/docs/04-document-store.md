# Document Store 与可验证文档

Document Store 用于**不可转让**的可验证文档。它将文档的 Merkle root 记录在链上，提供签发（issue）与撤销（revoke）状态。

## 适用场景

- 学历证书、培训证明
- 发票、收据
- 原产地证、检验报告

## 核心操作

### 部署

```ts
import { DocumentStoreFactory } from "@tradetrust-tt/tradetrust-core";

const factory = new DocumentStoreFactory(wallet);
const tx = await factory.deploy("My Document Store", ownerAddress);
const receipt = await tx.wait();
console.log(receipt.contractAddress);
```

### 包装文档

```ts
import { wrapDocumentV2 } from "@tradetrust-tt/tradetrust-core";

const wrappedDocument = wrapDocumentV2(rawDocument);
const documentHash = wrappedDocument.signature.targetHash;
```

### 签发

```ts
import { connectDocumentStore } from "@tradetrust-tt/tradetrust-core";

const store = await connectDocumentStore(documentStoreAddress, wallet);
const tx = await store.issue(`0x${documentHash}`);
await tx.wait();
```

### 撤销

```ts
const tx = await store.revoke(`0x${documentHash}`);
await tx.wait();
```

## 验证

验证时 `tt-verify` 会检查：

- `DOCUMENT_INTEGRITY`：文档哈希未被篡改。
- `DOCUMENT_STATUS`：Merkle root 已 issue 且未被 revoke。
- `ISSUER_IDENTITY`：DNS-TXT 记录指向该 Document Store 地址。

## 与 Token Registry 的区别

| 特性 | Document Store | Token Registry |
|------|----------------|----------------|
| 可转让 | 否 | 是 |
| 链上单位 | Merkle root | tokenId（即 Merkle root） |
| 所有权管理 | 无 | Title Escrow |
| 撤销 | 支持 | burn / restore |
