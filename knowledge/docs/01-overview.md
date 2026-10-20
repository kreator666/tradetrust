# TradeTrust 概述

TradeTrust 是一套用于创建、签发、转让和验证可验证数字文档（Verifiable Documents）与电子可转让记录（Electronic Transferable Records, ETR）的开放框架。它由新加坡 IMDA / GovTech 主导，广泛应用于电子提单（eBL）、原产地证、学历证书等场景。

## 核心价值

- **不可篡改**：文档内容通过 Merkle 树哈希保护，任何修改都会使验证失败。
- **来源可验证**：通过 DNS-TXT、DNS-DID、`did:web` 等方式将链上合约/密钥与真实域名绑定。
- **链上所有权**：可转让记录通过 Token Registry + Title Escrow 智能合约表达受益人（beneficiary）与持有人（holder）。
- **开放标准**：基于 W3C Verifiable Credentials v2、OpenAttestation、ERC-721（SBT）等。

## 两大文档形态

| 形态 | 代表合约 | 特点 | 典型场景 |
|------|----------|------|----------|
| 可验证文档（Verifiable Document） | Document Store | 签发/撤销状态记录在链，文档本身不可转让 | 学历证书、发票、原产地证 |
| 可转让记录（Transferable Record） | Token Registry | 每一份文档对应一个 token，由 Title Escrow 管理所有权 | 电子提单（eBL）、电子仓单 |

## 身份验证方式

- **DNS-TXT**：在 DNS 记录中发布文档存储地址或 DID，验证时检查域名所有权。
- **DNS-DID**：结合 DID 与 DNS TXT 记录。
- **did:web**：将 DID 文档托管在域名的 `/.well-known/did.json`，适合后端服务自签。
- **DID Signed**：文档由 DID 对应的密钥签名，无需链上合约即可验证签名。

## 主要生态项目

- [`@trustvc/trustvc`](https://www.npmjs.com/package/@trustvc/trustvc)：新一代统一 SDK，覆盖 W3C VC 签名、Token Registry v5、Document Store、验证。
- [`@tradetrust-tt/tradetrust-core`](https://www.npmjs.com/package/@tradetrust-tt/tradetrust-core)：OpenAttestation v2/v3 核心工具，已标注 depreciated，建议新项目使用 TrustVC。
- [`@tradetrust-tt/token-registry`](https://www.npmjs.com/package/@tradetrust-tt/token-registry)：Token Registry v5 合约与 TypeChain 绑定。
- [`@tradetrust-tt/tt-verify`](https://www.npmjs.com/package/@tradetrust-tt/tt-verify)：验证库，输出 `DOCUMENT_INTEGRITY`、`DOCUMENT_STATUS`、`ISSUER_IDENTITY` 三类 fragment。
- [`creator-tutorial`](https://github.com/TradeTrust/creator-tutorial)：官方后端服务教程，演示如何生成 `did:web`、部署 Token Registry 并签发可转让文档。

## 支持网络

Ethereum、Sepolia、Polygon、Polygon Amoy、XDC、XDC Apothem、Stability、Astron 等。具体以各 SDK 的 `SUPPORTED_CHAINS` / `TOKEN_REG_CONSTS` 为准。
