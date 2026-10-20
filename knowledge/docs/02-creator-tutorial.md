# Creator Tutorial 要点总结

官方教程：
- 文档地址：[TradeTrust Creator Tutorial](https://docs.tradetrust.io/docs/tutorial/creator/)
- 完整代码：[TradeTrust/creator-tutorial](https://github.com/TradeTrust/creator-tutorial)

该教程演示如何用 Node.js + Express 搭建一个后端服务，完成可转让电子提单（eBL）的创建与上链。

## 环境与依赖

- Node.js ≥ 20
- npm / yarn
- 核心依赖：`express`、`ethers`、`@trustvc/trustvc`、`dotenv`、`@ngrok/ngrok`
- 开发依赖：`typescript`、`ts-node`、`nodemon`、`cross-env`、`@types/express`

## 关键步骤

### 1. 初始化项目

```bash
mkdir creator-tutorial && cd creator-tutorial
npm init -y
npm install @ngrok/ngrok @trustvc/trustvc dotenv ethers express
npm install --save-dev @types/express @types/node concurrently cross-env dotenv-cli nodemon ts-node tsc-alias typescript
npx tsc --init
```

### 2. 配置 `.env`

```bash
DOMAIN=                          # 托管 did.json 的域名
WALLET_PRIVATE_KEY=              # 部署 Token Registry 的钱包私钥
NET=80002                        # 目标网络（如 Polygon Amoy）
NGROK_AUTHTOKEN=                 # 本地测试时暴露公网用（可选）
DID_KEY_PAIRS=                   # 脚本生成后写入
TOKEN_REGISTRY_ADDRESS=          # 脚本部署后写入
```

### 3. 生成 `did:web`

使用脚本生成密钥对，并将公钥写入 `did.json`，私钥写入 `.env` 的 `DID_KEY_PAIRS`。

Express 中需暴露：

```ts
app.get("/.well-known/did.json", (req, res) => {
  res.json(JSON.parse(fs.readFileSync("did.json", "utf-8")));
});
```

### 4. 部署 Token Registry

通过 `@trustvc/trustvc` 或 `@tradetrust-tt/tradetrust-core` 部署 Token Registry，地址写入 `.env`。

### 5. 创建可转让文档接口

```ts
app.post("/create/bill_of_lading", async (req, res) => {
  // 使用 @trustvc/trustvc 的 DocumentBuilder 构造 BILL_OF_LADING
  // 签名后上链 mint
  res.json({ signedW3CDocument, txHash });
});
```

### 6. 本地测试

```bash
npm run dev
curl --location 'http://localhost:3000/create/bill_of_lading' \
  --header 'Content-Type: application/json' \
  --data '{
    "credentialSubject": { "type": ["BillOfLading"], "blNumber": "20250107" },
    "owner": "0x...",
    "holder": "0x..."
  }'
```

返回结果中的 `signedW3CDocument` 可保存为 `.tt` 文件，上传至 [testnet.tradetrust.io](https://testnet.tradetrust.io) 进行可视化验证。

## 注意事项

- `did:web` 需要公网可访问，本地测试建议使用 ngrok 暴露。
- 私钥与 DID 私钥应安全存储，生产环境不要写入 `.env` 直接提交。
- 大文档附带附件时需调高 Express body parser 限制。
