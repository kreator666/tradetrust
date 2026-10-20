# Foundry Token Registry 样例

本目录提供基于 Foundry 的 TradeTrust Token Registry 部署与交互脚本骨架。

## 前置要求

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- RPC URL 与私钥（测试网/主网）

## 初始化依赖

```bash
cd knowledge/samples/foundry-token-registry
forge install --no-commit foundry-rs/forge-std
forge install --no-commit TradeTrust/token-registry
forge install --no-commit OpenZeppelin/openzeppelin-contracts@v5.0.2
```

## 部署

```bash
source .env
forge script script/DeployTokenRegistry.s.sol --rpc-url $SEPOLIA_RPC --broadcast --verify
```

## 铸造

将 `TOKEN_REGISTRY_ADDRESS` 填入 `.env` 后：

```bash
source .env
forge script script/MintTransferable.s.sol --rpc-url $SEPOLIA_RPC --broadcast
```

## 说明

- 本地 `anvil` 测试时，可使用 `--fork-url` 或直接运行 `anvil` 后指定 `http://localhost:8545`。
- 本样例为骨架，未包含 W3C VC 签名逻辑；签名建议在 TypeScript/Node 侧使用 `@trustvc/trustvc` 完成后，将 `tokenId` 传入 Foundry 脚本。
