# TradeTrust 学习仓库

本仓库汇总了 [TradeTrust](https://www.tradetrust.io) 官方文档与生态项目的学习笔记，并提供基于 EVM 的 Hardhat / Foundry 样例程序。

## 内容

- `knowledge/docs/`：7 篇结构化文档，覆盖 TradeTrust 核心概念、Token Registry、Document Store、W3C VC、验证机制、UUPS 可升级合约等。
- `knowledge/samples/hardhat-token-registry/`：可直接运行的 Hardhat 样例，演示本地部署 Token Registry、签名 W3C VC、铸造可转让记录与验证签名。
- `knowledge/samples/foundry-token-registry/`：Foundry 样例骨架与部署脚本。
- `knowledge/samples/hardhat-document-verification-transfer/`：UUPS 可升级文档验证与转移合约 Hardhat 样例。

## 快速开始

```bash
cd knowledge/samples/hardhat-token-registry
npm install
npm test
```

UUPS 样例：

```bash
cd knowledge/samples/hardhat-document-verification-transfer
npm install
npm test
```

更多说明见各子目录 `README.md` 与根目录 `AGENTS.md`。
