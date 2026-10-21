# TradeTrust 文档验证与转移：业务说明（含最小实现与官方实现）

## 一句话概括

TradeTrust 是一套基于区块链的「电子文档可信流转」框架：
- **签发方**把文档哈希写到链上，证明文档存在且未被篡改；
- **任何人**可以上传原文件，核验它是否被签发、是否被撤销；
- **权益方**可以通过链上合约把文档对应的权益/持有权转让给别人。

本仓库同时提供两套实现：
- **最小 UUPS 实现**：自己写的 `DocumentRegistry` + `DocumentEscrow`，用于理解底层机制；
- **官方 Token Registry 实现**：基于 `@tradetrust-tt/token-registry` 的 ERC-721 SBT + TitleEscrow，更接近生产环境。

它们都对应电子提单、原产地证、仓单、学历证书等场景。

---

## 解决什么问题

传统纸质或 PDF 文档容易遇到三类风险：

| 风险 | 现实表现 | 链上方案如何应对 |
|------|----------|------------------|
| 篡改 | 文件被悄悄修改 | 用文件的哈希（数字指纹）上链，任何修改都会使验证失败 |
| 伪造来源 | 不知道签发方是谁 | 链上合约只接受有授权角色的地址签发 |
| 转让难/易重复 | 把文档权益转给他人时无法唯一确权 | 每份文档对应唯一的链上所有权记录，转让需双方确认 |

---

## 两套实现怎么选

| | 最小 UUPS 实现 | 官方 Token Registry 实现 |
|---|---|---|
| **目标** | 教学演示、快速理解机制 | 对接官方生态、生产使用 |
| **文档表达** | 文档哈希状态（Issued/Revoked） | ERC-721 Soulbound Token，每份文档一个 token |
| **所有权表达** | 独立 `DocumentEscrow` 记录 beneficiary/holder | `TitleEscrow` 持有 token 并记录 beneficiary/holder |
| **创建 Escrow** | 手动部署 + 注册到 Registry | `mint()` 时由 `TitleEscrowFactory` 自动创建 |
| **标准支持** | 仅文档哈希 | OpenAttestation / W3C Verifiable Credentials |
| **身份验证** | 仅链上地址角色 | DNS-TXT、DNS-DID、`did:web` |
| **前端端口** | http://localhost:3000 | http://localhost:3001 |

**建议**：想先理解原理，用最小实现；要做真实业务集成，用官方实现。

---

## 三个核心动作（两套实现对对照）

### 1. 签发（Issue）

**最小 UUPS 实现**
- 上传文件，系统计算其 keccak256 哈希。
- 有 `ISSUER_ROLE` 的地址调用 `DocumentRegistry.issue(documentHash)`。
- 状态变为 `Issued`。

**官方 Token Registry 实现**
- 上传文件，系统计算其 keccak256 哈希，作为 `tokenId`。
- 有 `MinterRole` 的地址调用 `TradeTrustToken.mint(beneficiary, holder, tokenId, remark)`。
- 铸造一个 ERC-721 SBT，并自动创建对应的 `TitleEscrow`。

**业务含义**：签发方正式确认这份文件的真实性与有效性。

### 2. 验证（Verify）

**最小 UUPS 实现**
- 上传文件重新计算哈希。
- 查询 `DocumentRegistry.verify(documentHash)`：
  - `Issued`：已签发且有效；
  - `Revoked`：已被撤销；
  - `None`：从未签发。

**官方 Token Registry 实现**
- 上传文件重新计算 `tokenId`。
- 查询 `TradeTrustToken.ownerOf(tokenId)` 找到 TitleEscrow。
- 再查询 TitleEscrow 的 `beneficiary`、`holder`，并可读取 Endorsement Chain 事件历史。

**业务含义**：接收方无需信任发送方，自己就能验证文件是否被签发、当前权益归属是谁。

### 3. 转移（Transfer）

两套实现都使用 **beneficiary / holder 双角色模型**：
- `beneficiary`：文档权益的实际所有者，可提名新受益人。
- `holder`：文档的法律/托管持有人，可确认受益人转让、转让持有人、归还文档。

**最小 UUPS 实现**
- 对已签发文档，手动部署 `DocumentEscrow`。
- 通过 `nominateBeneficiary` + `transferBeneficiary` 等流程转让。

**官方 Token Registry 实现**
- 铸造时已自动创建 `TitleEscrow`。
- 通过 TitleEscrow 的 `nominate`、`transferBeneficiary`、`transferHolder`、`transferOwners` 等流程转让。
- 额外支持 `rejectTransferBeneficiary`、`rejectTransferHolder`、`returnToIssuer` 等官方特性。

**业务含义**：把「持有这份文档代表某种权益」这件事在链上确权并流转。

---

## 关键角色

| 角色 | 最小实现对应 | 官方实现对应 | 能做什么 | 典型现实身份 |
|------|--------------|--------------|----------|--------------|
| 签发方 | `ISSUER_ROLE` | `MinterRole` | 签发/铸造文档 | 船公司、学校、海关、认证机构 |
| 撤销方 | `REVOKER_ROLE` | `RestorerRole` / `AccepterRole` | 撤销/恢复文档 | 签发机构的风控/法务部门 |
| 管理员 | `DEFAULT_ADMIN_ROLE` | `DefaultAdmin` | 授权角色、升级合约、暂停 | 平台运营方 |
| 受益人 | `DocumentEscrow.beneficiary` | `TitleEscrow.beneficiary` | 提名新的受益人 | 货主、权利人 |
| 持有人 | `DocumentEscrow.holder` | `TitleEscrow.holder` | 确认转让、转让持有人、归还 | 承运人、托管行、提单持有人 |
| 验证方 | 无需角色 | 无需角色 | 上传文件即可验证 | 银行、海关、下游买家 |

---

## 典型业务流程：电子提单

```
1. 船公司签发提单
   - 最小实现：DocumentRegistry.issue(documentHash)
   - 官方实现：TradeTrustToken.mint(进口商, 银行, documentHash, remark)
   ↓
2. 进口商/银行下载 PDF → 验证
   - 最小实现：查询 DocumentRegistry 状态
   - 官方实现：查询 ownerOf → TitleEscrow → beneficiary/holder
   ↓
3. 进口商将提单权益转给下游买家
   - 最小实现：DocumentEscrow 提名 + 确认
   - 官方实现：TitleEscrow 提名 + 确认
   ↓
4. 下游买家验证文件 + 查询 Escrow，确认自己是当前 beneficiary
```

---

## 链上所有权与映射

**最小 UUPS 实现**
- `DocumentRegistry` 维护 `documentHash → Escrow[]` 映射。
- 一份文档可对应多个 Escrow，解决重复抵押/多头转让的透明度问题。

**官方 Token Registry 实现**
- 每份文档是一个 ERC-721 SBT，token owner 即 TitleEscrow 地址。
- 通过 `ownerOf(tokenId)` 即可唯一确定当前 TitleEscrow。
- Endorsement Chain 记录完整的转让历史。

---

## 当前 Sepolia 测试网部署（示例）

### 最小 UUPS 实现

| 项目 | 地址 |
|---|---|
| DocumentRegistry Proxy | `0x7Bce249b5c645F294BABB7cd80E943b757b4f558` |
| DocumentEscrow Proxy | `0x966a180D82923ec8871F19B4176a96588B388b1A` |

### 官方 Token Registry 实现

| 项目 | 地址 |
|---|---|
| TradeTrustToken (Token Registry) | `0x33F0Bfd8Ce215e34EA6776f3312a3428A8752570` |
| TitleEscrowFactory | `0x1a042Cd4e71a958c62B86c76e4A3FE010EF7d3f7` |

---

## 使用入口

### 最小 UUPS 实现（http://localhost:3000）

| 页面 | 功能 | 谁用 |
|---|---|---|
| 首页 `/` | 查看部署配置 | 所有人 |
| 签发 `/issue.html` | 上传文件 → 签发 | Issuer |
| 验证 `/verify.html` | 上传文件 → 验证状态 | Verifier |
| 转移 `/transfer.html` | 创建/加载 Escrow → 转让/归还 | Beneficiary / Holder |
| 权限 `/admin.html` | 授权/撤销 ISSUER_ROLE | Admin |

### 官方 Token Registry 实现（http://localhost:3001）

| 页面 | 功能 | 谁用 |
|---|---|---|
| 首页 `/` | 查看官方部署配置与示例 | 所有人 |
| 签发/铸造 `/issue.html` | 上传文件 → 铸造 SBT + 自动创建 TitleEscrow | MinterRole |
| 验证 `/verify.html` | 查询 token owner、beneficiary、holder、Endorsement Chain | Verifier |
| 转让 `/transfer.html` | TitleEscrow 提名/转让/拒绝/归还 | Beneficiary / Holder |
| 权限 `/admin.html` | 授权/撤销 MinterRole/AccepterRole/RestorerRole | DefaultAdmin |

---

## 生产环境建议

- **直接使用官方 SDK/CLI**：`@trustvc/trustvc`、`@tradetrust-tt/tradetrust-cli`。
- **身份绑定**：配置 DNS-TXT 或 `did:web`，让验证方能确认签发方身份。
- **文档格式**：使用 OpenAttestation v2/v3 或 W3C Verifiable Credentials，不要只用原始文件哈希。
- **本仓库的最小实现**：仅用于学习和原型验证，不建议直接用于生产。
