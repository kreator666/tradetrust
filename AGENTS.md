# AGENTS.md

本仓库用于学习 [TradeTrust](https://www.tradetrust.io) 框架、整理知识库，并提供 Hardhat / Foundry 样例程序。

## 项目结构

```
.
├── AGENTS.md                           # 本文件
├── README.md                           # 仓库入口说明
└── knowledge/
    ├── README.md                       # 知识库导航
    ├── docs/                           # 结构化学习文档
    │   ├── 01-overview.md
    │   ├── 02-creator-tutorial.md
    │   ├── 03-token-registry.md
    │   ├── 04-document-store.md
    │   ├── 05-verification.md
    │   ├── 06-w3c-vc.md
    │   └── 07-uups-contracts.md        # UUPS 可升级文档验证与转移合约
    └── samples/
        ├── hardhat-token-registry/     # 可运行 Hardhat 样例
        ├── foundry-token-registry/     # Foundry 样例骨架
        └── hardhat-document-verification-transfer/  # UUPS 可升级文档验证与转移合约
```

## 构建与测试

### Hardhat 样例（Token Registry）

```bash
cd knowledge/samples/hardhat-token-registry
npm install
npm run build      # TypeScript 类型检查
npm test           # Hardhat Network 端到端测试
```

### Hardhat 样例（UUPS 文档验证与转移）

```bash
cd knowledge/samples/hardhat-document-verification-transfer
npm install
npm run build      # TypeScript 类型检查
npm test           # Hardhat Network 端到端测试（含 UUPS 升级）
```

### Foundry 样例

```bash
cd knowledge/samples/foundry-token-registry
forge install --no-commit foundry-rs/forge-std
forge install --no-commit TradeTrust/token-registry
forge install --no-commit OpenZeppelin/openzeppelin-contracts@v5.0.2
forge build
```

## 代码风格

- TypeScript 严格模式开启，使用 `import` / `export`。
- Token Registry 样例智能合约使用 Solidity `^0.8.20`。
- UUPS 文档验证与转移样例使用 Solidity `0.8.28`，并采用 OpenZeppelin UUPS 可升级代理模式。
- 样例代码优先使用官方推荐的 `@trustvc/trustvc` 与 `@tradetrust-tt/token-registry`。
- 配置文件、脚本、测试分目录存放。

## 安全与敏感信息

- 私钥、API Key、DID 私钥**不得**提交到 Git。
- 所有样例目录的 `.env` 已加入 `.gitignore`；按 `.env.example` 本地配置。
- 本地 Hardhat 网络测试使用自动生成的测试账户，无需真实私钥。

## 文档维护

- 新增核心概念或 API 变更时，同步更新 `knowledge/docs/` 下对应 Markdown。
- 样例代码变更后，必须保证 `npm test` 或 `forge build` 通过。

## 常用命令速查

```bash
# Hardhat Token Registry 样例
cd knowledge/samples/hardhat-token-registry
npm run deploy:local    # 在 Hardhat Network 部署 Token Registry
npm run mint:local      # 签名 W3C VC 并铸造可转让记录

# Hardhat UUPS 文档验证与转移样例
cd knowledge/samples/hardhat-document-verification-transfer
npx hardhat run scripts/deploy-registry.ts --network hardhat
npx hardhat run scripts/deploy-escrow.ts --network hardhat
npx hardhat run scripts/upgrade-registry.ts --network hardhat

# Sepolia 测试网部署 + 前端展示
npx hardhat run scripts/deploy-sepolia.ts --network sepolia
npm run verify:sepolia
npm run frontend        # 首页、签发、验证、转移四个页面

前端特性：
- 首页顶部提供「连接钱包」按钮，连接 MetaMask 后自动切换到 Sepolia 并签名验证。
- 钱包地址与 chainId 缓存到 localStorage，刷新页面后自动恢复。
- 签发页支持「钱包签名签发」与「本地部署账户代签」两种模式。
- 验证页默认使用公共 Sepolia RPC 进行只读查询，不依赖当前钱包网络。
- 转移页复用已连接钱包， beneficiary / holder 可执行提名、转让与归还。
- 权限管理页支持管理员授权 / 撤销其他地址的 ISSUER_ROLE。

# Foundry 样例
cd knowledge/samples/foundry-token-registry
forge script script/DeployTokenRegistry.s.sol --rpc-url $SEPOLIA_RPC --broadcast
```
