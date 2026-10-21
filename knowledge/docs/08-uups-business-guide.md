# TradeTrust UUPS 文档验证与转移：业务说明

## 一句话概括

这是一套基于区块链的「电子文档可信流转」最小演示系统：
- **签发方**把文档哈希写到链上，证明文档存在且未被篡改；
- **任何人**可以上传原文件，核验它是否被签发、是否被撤销；
- **权益方**可以通过链上合约把文档对应的权益/持有权转让给别人。

它对应现实世界中的电子提单、原产地证、仓单、学历证书等场景。

---

## 解决什么问题

传统纸质或 PDF 文档容易遇到三类风险：

| 风险 | 现实表现 | 这套方案如何应对 |
|------|----------|------------------|
| 篡改 | 文件被悄悄修改 | 用文件的哈希（数字指纹）上链，任何修改都会使验证失败 |
| 伪造来源 | 不知道签发方是谁 | 链上 Registry 只接受有 ISSUER_ROLE 的地址签发 |
| 转让难/易重复 | 把文档权益转给他人时无法唯一确权 | 每份文档对应一个 Escrow 合约，链上记录 beneficiary 与 holder |

---

## 三个核心动作

### 1. 签发（Issue）

- 上传文件，系统计算其 keccak256 哈希（64 位十六进制字符串）。
- 有 ISSUER_ROLE 的地址把该哈希写入 `DocumentRegistry`。
- 签发成功后，文档状态变为 `Issued`。

**业务含义**：签发方正式确认这份文件的真实性与有效性。

### 2. 验证（Verify）

- 任何人上传同一份文件，系统重新计算哈希。
- 到链上 `DocumentRegistry` 查询该哈希的状态：
  - `Issued`：已签发且有效；
  - `Revoked`：已被签发方撤销；
  - `None`：从未签发。

**业务含义**：接收方无需信任发送方，自己就能验证文件是否被签发、是否还有效。

### 3. 转移（Transfer）

- 对已签发的文档，创建 `DocumentEscrow` 合约，指定：
  - `beneficiary`：文档权益的实际所有者；
  - `holder`：文档的法律/托管持有人；
  - `admin`：可升级该 Escrow 合约的管理员。
- 通过提名（nominate）+ 确认（transfer）机制完成所有权转让。

**业务含义**：把「持有这份文档代表某种权益」这件事在链上确权并流转。

---

## 关键角色

| 角色 | 链上对应 | 能做什么 | 典型现实身份 |
|------|----------|----------|--------------|
| 签发方 Issuer | `ISSUER_ROLE` | 签发文档、批量签发 | 船公司、学校、海关、认证机构 |
| 撤销方 Revoker | `REVOKER_ROLE` | 撤销已签发文档 | 签发机构的风控/法务部门 |
| 管理员 Admin | `DEFAULT_ADMIN_ROLE` | 授权/撤销角色、升级 Registry、暂停签发 | 平台运营方 |
| 受益人 Beneficiary | Escrow.beneficiary | 提名新的受益人 | 货主、权利人 |
| 持有人 Holder | Escrow.holder | 确认受益人转让、转让持有人、归还文档 | 承运人、托管行、提单持有人 |
| 验证方 Verifier | 无需角色 | 上传文件即可验证 | 银行、海关、下游买家 |

---

## 典型业务流程：电子提单

```
1. 船公司（Issuer）上传提单 PDF → 签发
   ↓
2. 进口商/银行下载 PDF → 验证（确认真实有效）
   ↓
3. 进口商需要把提单权益转给下游买家
   a. 创建 DocumentEscrow，beneficiary=进口商，holder=银行
   b. 进口商提名 buyer 为新 beneficiary
   c. holder（银行）确认转让
   ↓
4. 下游买家验证文件 + 查询 Escrow，确认自己是当前 beneficiary
```

---

## 链上 Registry 记录 Escrow 映射

一份文档可能对应多个 Escrow（例如不同融资轮次、不同交易对手）。

- `DocumentRegistry` 维护 `documentHash → Escrow[]` 的映射；
- 创建 Escrow 后自动 `registerEscrow`，将 Escrow 地址登记到对应文档哈希下；
- 任何人输入文档哈希即可查询该文档的所有 Escrow 地址。

**业务价值**：解决「一份文档被重复抵押/多头转让」的透明度问题。

---

## 本工程与官方 TradeTrust 的关系

| | 本工程 | 官方 TradeTrust |
|---|---|---|
| 目的 | 教学演示，理解底层机制 | 生产级框架 |
| 合约 | 最小实现 `DocumentRegistry` + `DocumentEscrow` | `DocumentStore` / `TokenRegistry` + `TitleEscrow` |
| 标准 | 仅文档哈希 | OpenAttestation / W3C Verifiable Credentials |
| 身份 | 仅链上地址角色 | DNS-TXT、DNS-DID、`did:web` 等 |
| 升级 | UUPS 可升级 | 工厂 + 代理，支持更复杂的部署器 |

**生产环境建议**：直接使用官方 `@tradetrust-tt/token-registry`、`@tradetrust-tt/document-store` 或 `@trustvc/trustvc`。

---

## 当前 Sepolia 测试网部署（示例）

| 项目 | 地址 |
|---|---|
| DocumentRegistry Proxy | `0x7Bce249b5c645F294BABB7cd80E943b757b4f558` |
| DocumentEscrow Proxy | `0x966a180D82923ec8871F19B4176a96588B388b1A` |

本地前端：`http://localhost:3000`

---

## 使用入口

| 页面 | 功能 | 谁用 |
|---|---|---|
| 首页 `/` | 查看部署配置 | 所有人 |
| 签发 `/issue.html` | 上传文件 → 签发 | Issuer |
| 验证 `/verify.html` | 上传文件 → 验证状态 | Verifier |
| 转移 `/transfer.html` | 创建/加载 Escrow → 转让/归还 | Beneficiary / Holder |
| 权限 `/admin.html` | 授权/撤销 ISSUER_ROLE | Admin |
