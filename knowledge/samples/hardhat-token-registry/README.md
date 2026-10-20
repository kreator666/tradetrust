# Hardhat Token Registry 样例

基于 `@tradetrust-tt/token-registry` 与 `@trustvc/trustvc`，演示如何在本地 Hardhat 网络：

1. 部署 `TitleEscrowFactory` 与 `TradeTrustToken` Token Registry。
2. 使用 `did:web` + `ecdsa-sd-2023` 签名 W3C VC。
3. 提取 `tokenId` 并在链上铸造可转让记录。
4. 验证 W3C 签名（说明）。

## 说明

- Token Registry v5 的 TypeChain 绑定基于 **ethers v6**。
- Hardhat v2 默认注入 **ethers v5**，因此本样例通过 `ethers6` 别名安装 ethers v6，并使用 `BrowserProvider(hre.network.provider)` 获取 v6 signer。

## 安装

```bash
npm install
```

## 测试

```bash
npm test
```

该命令会在 Hardhat Network 上跑完整端到端测试，无需真实网络。

## 本地一键演示

```bash
npm run demo:local
```

该脚本在同一个 Hardhat Network 会话中完成部署 + 签名 + 铸造。

## 单独脚本（用于持久网络）

```bash
# 1. 部署 Token Registry
npx hardhat run scripts/deploy-token-registry.ts --network sepolia
# 输出 TitleEscrowFactory 与 TokenRegistry 地址

# 2. 将 TokenRegistry 地址填入 .env
# TOKEN_REGISTRY_ADDRESS=0x...

# 3. 铸造可转让记录
npx hardhat run scripts/mint-transferable.ts --network sepolia
```

> 注意：`hardhat run --network hardhat` 每次都会启动一个全新的临时网络，因此本地分步执行时地址会失效；请使用 `demo:local` 或启动 `hardhat node`。

## Sepolia 测试网

```bash
# 配置 .env
PRIVATE_KEY=0x...
SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY

npx hardhat run scripts/deploy-token-registry.ts --network sepolia
# 填入 TOKEN_REGISTRY_ADDRESS 后继续
npx hardhat run scripts/mint-transferable.ts --network sepolia
```

## 关键文件

- `scripts/deploy-token-registry.ts`：部署 Token Registry。
- `scripts/mint-transferable.ts`：签名 W3C VC 并 mint（需已部署地址）。
- `scripts/deploy-and-mint.ts`：部署 + 铸造一键脚本。
- `scripts/verify-document.ts`：W3C 签名验证示例（需要可解析的 DID 或自定义 documentLoader）。
- `test/TokenRegistry.test.ts`：端到端测试。
