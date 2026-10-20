# TradeTrust 知识库

本目录用于整理 [TradeTrust](https://www.tradetrust.io) 框架的学习笔记、核心概念与可运行样例。

## 目录结构

```
knowledge/
├── docs/                           # 结构化学习文档
│   ├── 01-overview.md              # TradeTrust 概述与核心概念
│   ├── 02-creator-tutorial.md      # Creator Tutorial 要点总结
│   ├── 03-token-registry.md        # Token Registry 与可转让记录
│   ├── 04-document-store.md        # Document Store 与可验证文档
│   ├── 05-verification.md          # 文档验证（tt-verify）
│   ├── 06-w3c-vc.md                # W3C 可验证凭证（TrustVC）
│   └── 07-uups-contracts.md        # UUPS 可升级文档验证与转移合约
└── samples/                        # 样例程序
    ├── hardhat-token-registry/     # Hardhat 样例（主选，可直接运行）
    ├── foundry-token-registry/     # Foundry 样例骨架与说明
    └── hardhat-document-verification-transfer/  # UUPS 可升级文档验证与转移合约
```

## 主要依赖

- [`@trustvc/trustvc`](https://www.npmjs.com/package/@trustvc/trustvc)：W3C VC 签名、Token Registry/Document Store 交互、验证。
- [`@tradetrust-tt/tradetrust-core`](https://www.npmjs.com/package/@tradetrust-tt/tradetrust-core)：OpenAttestation v2/v3 文档包装、签名、部署、验证（已逐步迁移至 TrustVC）。
- [`@tradetrust-tt/token-registry`](https://www.npmjs.com/package/@tradetrust-tt/token-registry)：Token Registry 与 Title Escrow 智能合约及 TypeChain 绑定。
- [`@tradetrust-tt/tt-verify`](https://www.npmjs.com/package/@tradetrust-tt/tt-verify)：TradeTrust 文档验证库。

## 快速开始

进入 Hardhat 样例目录：

```bash
cd knowledge/samples/hardhat-token-registry
npm install
npm test
```

新增的 UUPS 样例：

```bash
cd knowledge/samples/hardhat-document-verification-transfer
npm install
npm test
```

更多说明见各子目录的 `README.md`。
