# TradeTrust Token Registry Hardhat 样例

本目录提供基于 Hardhat 的官方 TradeTrust Token Registry 部署与交互样例，展示如何在 Sepolia 测试网部署 `TradeTrustToken`（Token Registry）与 `TitleEscrowFactory`，并铸造一份可转让记录（Transferable Record）。

## 合约关系

```
TradeTrustToken (Token Registry)
    └── mint(beneficiary, holder, tokenId)
            └── TitleEscrowFactory 自动创建 TitleEscrow
                    └── TitleEscrow 管理 beneficiary / holder
```

- `TradeTrustToken`：基于 ERC-721 Soulbound Token，每份文档对应一个 token。
- `TitleEscrowFactory`：工厂合约，负责为每个 token 创建对应的 `TitleEscrow`。
- `TitleEscrow`：管理单份文档的 `beneficiary`（受益人）与 `holder`（持有人），支持提名、转让、归还等操作。

## 前置要求

```bash
cd knowledge/samples/hardhat-token-registry
npm install
```

复制 `.env.example` 为 `.env` 并填入：

```
PRIVATE_KEY=...
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=...
```

## 本地测试

```bash
npm run build
npm test
```

## Sepolia 部署官方 Token Registry

```bash
npx hardhat run scripts/deploy-token-registry-sepolia.ts --network sepolia
```

输出会写入 `deployment-official.json`。

当前示例部署结果：

| 项目 | 地址 |
|---|---|
| TitleEscrowFactory | `0x1a042Cd4e71a958c62B86c76e4A3FE010EF7d3f7` |
| TradeTrustToken (Token Registry) | `0x33F0Bfd8Ce215e34EA6776f3312a3428A8752570` |

## 铸造可转让记录

```bash
npx hardhat run scripts/mint-official-sepolia.ts --network sepolia
```

当前示例铸造结果：

| 项目 | 值 |
|---|---|
| Token Registry | `0x33F0Bfd8Ce215e34EA6776f3312a3428A8752570` |
| Token ID (文档哈希) | `0x8960dd73b2d1bd3476ddee6cf0a26515675ba279cfbf32711e4ec329a40fb1d6` |
| TitleEscrow | `0xAf0762951E3B5ce6914D48d4778b919C564184c4` |

## 源码验证

TitleEscrowFactory 已在 Etherscan Sepolia 自动验证。

TradeTrustToken 由于 npm 发布包与 GitHub tag 的依赖版本差异，hardhat-verify 自动匹配未成功；其完整源码已公开在 [TradeTrust/token-registry](https://github.com/TradeTrust/token-registry)，可通过 Etherscan 的 "Verify via flattened source" 手动提交验证。

## 与最小 UUPS 实现的对比

详见 `knowledge/docs/09-official-vs-custom.md`。

核心差异一句话：

- **官方 Token Registry**：每份文档是一个 ERC-721 SBT token，由 Registry 自动创建 TitleEscrow；身份验证依赖 DNS/DID；功能完整、生产级。
- **本工程最小 UUPS 实现**：用独立的 `DocumentRegistry` 记录文档签发状态，用独立的 `DocumentEscrow` 管理 beneficiary/holder；无 SBT、无 DNS/DID，仅用于理解底层机制。
