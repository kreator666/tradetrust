# UUPS 可升级文档验证与转移合约

在 TradeTrust 生态中，文档验证由 `Document Store` / `Token Registry` 完成，文档所有权转移由 `Title Escrow` 完成。本节提供一套**最小可运行**的 UUPS 可升级合约实现，帮助理解其底层设计。

## 合约关系

```
DocumentRegistry (UUPS proxy)
    ├── issue(documentHash)
    ├── revoke(documentHash)
    ├── verify(documentHash)
    └── registerEscrow(escrow, documentHash)

DocumentEscrow (UUPS proxy)
    ├── 引用 DocumentRegistry
    ├── 管理 beneficiary / holder
    └── 提供 nominate / transfer / surrender 流程
```

## DocumentRegistry

- **UUPS 可升级**：管理员（`DEFAULT_ADMIN_ROLE`）可升级实现合约。
- **角色分离**：
  - `ISSUER_ROLE`：签发文档。
  - `REVOKER_ROLE`：撤销文档。
- **状态**：`None` / `Issued` / `Revoked`。
- **暂停**：集成 `PausableUpgradeable`。
- **Escrow 映射**：
  - `escrowsByDocument[documentHash]` 记录每份文档对应的所有 DocumentEscrow 地址。
  - `registerEscrow(escrow, documentHash)` 会校验 Escrow 指向本 Registry 且 documentHash 匹配，只有已签发文档才能注册 Escrow。

## DocumentEscrow

- **UUPS 可升级**：升级权限由初始化时传入的 `admin` 地址控制。
- **初始化校验**：创建 Escrow 时要求文档必须已在 Registry 中 `Issued`。
- **双角色模型**：
  - `beneficiary`：受益人，可提名新受益人。
  - `holder`：持有人，可确认受益人转让、转让持有人身份、归还文档。
- **转让流程**：
  - `nominateBeneficiary` → `transferBeneficiary`
  - `nominateHolder` → `transferHolder`
  - `transferOwners`（要求调用者同时是 beneficiary 与 holder）
- **归还**：`surrender()` 标记 Escrow 为已归还，禁止后续转让。

## 链上 Registry 记录 Escrow 映射

每一份可转让文档可以对应多个 Escrow（例如不同交易方、不同托管场景）。Registry 通过 `registerEscrow` 将 Escrow 地址与文档哈希绑定，任何人都可以通过 `escrowsByDocumentList(documentHash)` 查询该文档的所有 Escrow 地址。

部署脚本和前端 `/api/deploy-escrow` 在创建 Escrow 后会自动调用 `registerEscrow`，无需额外手动操作。

## 样例位置

`knowledge/samples/hardhat-document-verification-transfer/`

```bash
cd knowledge/samples/hardhat-document-verification-transfer
npm install
npm run build
npm test
```

## 与官方 TradeTrust 的区别

本样例是教学用途的最小实现；官方 `token-registry` 与 `document-store` 合约包含更完整的角色、事件、工厂与部署器，生产环境请优先使用官方合约。
