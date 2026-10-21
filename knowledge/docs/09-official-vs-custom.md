# 官方 TradeTrust 合约 vs 本工程最小 UUPS 实现

本页对比在 Sepolia 测试网部署的官方 TradeTrust Token Registry（`@tradetrust-tt/token-registry` v5.5.2）与本工程自研的最小 UUPS 文档验证/转移实现。

## 当前 Sepolia 部署地址

### 官方 Token Registry

| 项目 | 地址 |
|---|---|
| TitleEscrowFactory | `0x1a042Cd4e71a958c62B86c76e4A3FE010EF7d3f7` |
| TradeTrustToken (Token Registry) | `0x33F0Bfd8Ce215e34EA6776f3312a3428A8752570` |
| 示例 TitleEscrow | `0xAf0762951E3B5ce6914D48d4778b919C564184c4` |

### 本工程 UUPS 实现

| 项目 | 地址 |
|---|---|
| DocumentRegistry Proxy | `0x7Bce249b5c645F294BABB7cd80E943b757b4f558` |
| DocumentEscrow Proxy | `0x966a180D82923ec8871F19B4176a96588B388b1A` |

## 架构差异

```
官方 Token Registry (ERC-721 SBT)
├─ TradeTrustToken
│   ├─ 每个 tokenId 对应一份文档哈希
│   ├─ mint() 自动创建 TitleEscrow 并持有 token
│   └─ 角色：DefaultAdmin / MinterRole / AccepterRole / RestorerRole
└─ TitleEscrow
    ├─ beneficiary / holder 双角色
    └─ 管理提名、转让、归还

本工程最小 UUPS 实现
├─ DocumentRegistry
│   ├─ 记录 documentHash → Status (None/Issued/Revoked)
│   ├─ 记录 documentHash → Escrow[] 映射
│   └─ 角色：DEFAULT_ADMIN_ROLE / ISSUER_ROLE / REVOKER_ROLE
└─ DocumentEscrow
    ├─ 引用 DocumentRegistry
    ├─ beneficiary / holder 双角色
    └─ 管理提名、转让、归还
```

## 核心能力对比

| 能力 | 官方 Token Registry | 本工程 UUPS 实现 |
|---|---|---|
| **文档表达** | ERC-721 Soulbound Token，每份文档一个 token | 无 token，仅文档哈希状态 |
| **所有权表达** | token 由 TitleEscrow 持有，TitleEscrow 记录 beneficiary/holder | DocumentEscrow 直接记录 beneficiary/holder |
| **创建 Escrow/TitleEscrow** | `mint()` 时由 `TitleEscrowFactory` 自动创建 | 单独部署 `DocumentEscrow` 代理，再 `registerEscrow` |
| **签发方式** | `mint(beneficiary, holder, tokenId, remark)` | `issue(documentHash)` |
| **验证方式** | 查询 token owner + tokenURI + endorsement chain | 查询 `DocumentRegistry.verify(documentHash)` |
| **链上映射** | tokenId → TitleEscrow（通过 ERC-721 ownerOf） | documentHash → Escrow[]（自定义映射） |
| **身份验证** | 支持 DNS-TXT / DNS-DID / `did:web` | 仅链上地址角色 |
| **文档格式** | OpenAttestation v2/v3、W3C VC | 仅原始文件 keccak256 哈希 |
| **升级模式** | UUPS 可升级 | UUPS 可升级 |
| **生产就绪** | 是，官方维护 | 教学/演示用途 |

## 角色对比

| 角色 | 官方 Token Registry | 本工程 UUPS 实现 |
|---|---|---|
| 管理员 | `DefaultAdmin` | `DEFAULT_ADMIN_ROLE` |
| 签发方 | `MinterRole` | `ISSUER_ROLE` |
| 撤销方 | `RestorerRole` + `AccepterRole` | `REVOKER_ROLE` |
| 受益人 | `TitleEscrow.beneficiary` | `DocumentEscrow.beneficiary` |
| 持有人 | `TitleEscrow.holder` | `DocumentEscrow.holder` |

## 使用流程对比

### 官方 Token Registry

1. 部署 `TitleEscrowFactory` 和 `TradeTrustToken`。
2. 签发方调用 `mint(beneficiary, holder, tokenId, remark)`：
   - tokenId 即文档哈希；
   - 自动创建 TitleEscrow 并持有 token。
3. 验证方通过 `ownerOf(tokenId)` 找到 TitleEscrow，再查询 beneficiary/holder。
4. 转让在 TitleEscrow 上执行 nominate / transfer / surrender。

### 本工程 UUPS 实现

1. 部署 `DocumentRegistry` 和 `DocumentEscrow`。
2. 签发方调用 `issue(documentHash)`，将文档哈希状态标记为 Issued。
3. 需要转让时，单独部署 `DocumentEscrow` 代理并传入 documentHash；
   - 部署完成后调用 `DocumentRegistry.registerEscrow(escrow, documentHash)`。
4. 验证方调用 `DocumentRegistry.verify(documentHash)` 查询签发/撤销状态。
5. 转让在 DocumentEscrow 上执行 nominate / transfer / surrender。

## 各自优势

| 场景 | 推荐方案 |
|---|---|
| 生产环境、需要与现有 TradeTrust 生态互操作 | 官方 Token Registry |
| 需要 W3C VC / OpenAttestation 标准、DNS/DID 身份绑定 | 官方 Token Registry |
| 学习底层机制、快速原型验证 | 本工程最小 UUPS 实现 |
| 只需要「签发 + 验证 + 简单转让」三件套，不依赖 SBT | 本工程最小 UUPS 实现 |

## 一句话总结

官方实现用 **ERC-721 SBT + TitleEscrow** 表达「一份可转让文档及其所有权」，生态完整但较重；本工程用 **Registry 状态 + 独立 Escrow** 做了最小化教学实现，核心思想一致但去掉了 SBT、标准文档格式和 DID 身份层。
