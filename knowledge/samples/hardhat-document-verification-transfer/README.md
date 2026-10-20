# UUPS 可升级文档验证与转移合约

本目录提供一套基于 **Solidity 0.8.28**、采用 **UUPS 可升级代理模式**的文档验证与文档转移合约样例。

## 合约说明

| 合约 | 作用 |
|------|------|
| `DocumentRegistry` | UUPS 可升级文档注册表。支持对文档哈希进行 `issue`、`revoke`、`verify`，并基于 `AccessControlUpgradeable` 进行角色管理。 |
| `DocumentRegistryV2` | V2 实现，仅新增 `version()` 用于演示 UUPS 升级，不修改存储布局。 |
| `DocumentEscrow` | UUPS 可升级文档转移托管合约。管理单份文档的 `beneficiary`（受益人）与 `holder`（持有人），支持提名转让、持有人转让、同时转让、归还（surrender）。 |
| `DocumentEscrowV2` | V2 实现，仅新增 `version()` 用于演示 UUPS 升级。 |
| `IDocumentRegistry` | 最小接口，供 Escrow 初始化时校验文档是否已签发。 |

## 快速开始

```bash
cd knowledge/samples/hardhat-document-verification-transfer
npm install
npm run build
npm test
```

## 脚本使用

### 1. 部署 DocumentRegistry 代理

```bash
npx hardhat run scripts/deploy-registry.ts --network hardhat
```

### 2. 部署 DocumentEscrow 代理

```bash
export REGISTRY_PROXY=<上一步输出的代理地址>
export DOCUMENT_HASH=<可选，默认使用 keccak256("demo-doc")>
npx hardhat run scripts/deploy-escrow.ts --network hardhat
```

### 3. 升级 DocumentRegistry 到 V2

```bash
export REGISTRY_PROXY=<代理地址>
npx hardhat run scripts/upgrade-registry.ts --network hardhat
```

## 设计要点

- **UUPS 升级**：`DocumentRegistry` 与 `DocumentEscrow` 均继承 `UUPSUpgradeable`，升级权限分别由 `DEFAULT_ADMIN_ROLE` 与 `admin` 地址控制。
- **角色管理**：Registry 使用 `ISSUER_ROLE` / `REVOKER_ROLE` 分离签发与撤销权限。
- **暂停机制**：Registry 集成 `PausableUpgradeable`，管理员可在紧急情况下暂停 `issue`/`revoke`。
- **Escrow 初始化校验**：Escrow 初始化时会调用 `IDocumentRegistry.isValid()`，确保只有已签发文档才能进入转移流程。
- **归还（Surrender）**：`surrender()` 将 Escrow 标记为已归还，后续所有转让操作将被禁止。

## Sepolia 测试网部署

1. 复制 `.env.example` 为 `.env` 并填入：
   - `SEPOLIA_RPC`：Sepolia RPC URL，例如 `https://ethereum-sepolia-rpc.publicnode.com`
   - `PRIVATE_KEY`：有 SepoliaETH 的账户私钥
   - `ETHERSCAN_API_KEY`：用于源码验证
   - （可选）`BENEFICIARY_ADDRESS`、`HOLDER_ADDRESS`

2. 执行部署脚本：

```bash
npm run deploy:sepolia
```

脚本会部署 `DocumentRegistry` 与 `DocumentEscrow` 的 UUPS 代理，签发一份示例文档，并将地址写入 `deployment.json`。

### 4. 验证实现合约源码（Etherscan Sepolia）

在 `.env` 中配置 `ETHERSCAN_API_KEY`，然后：

```bash
npm run verify:sepolia
```

该命令会自动获取两个代理背后的实现合约地址，并向 Etherscan 提交源码验证。

## 前端展示页面

基于 Node + Express 的多页面前端，包含：

- **首页** (`/`)：展示部署配置与功能入口。
- **签发文档** (`/issue.html`)：上传文件 → 计算 keccak256 哈希 → 通过本地部署账户写入 DocumentRegistry。
- **验证文档** (`/verify.html`)：上传文件 → 计算哈希 → 查询链上签发/撤销状态。
- **转移文档** (`/transfer.html`)：连接 MetaMask，对 DocumentEscrow 执行 beneficiary / holder 提名、转让与归还。

```bash
npm run frontend
```

打开 `http://localhost:3000`，然后选择对应功能页面。

## 测试覆盖

- Registry 的单条签发、批量签发、撤销、未签发撤销回滚、暂停/恢复、UUPS 升级到 V2。
- Escrow 的持有人转让、受益人提名转让、同时转让、归还、未签发文档创建回滚、UUPS 升级到 V2。
