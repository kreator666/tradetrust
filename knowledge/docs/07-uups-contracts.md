# UUPS 可升级文档验证与转移合约

在 TradeTrust 生态中，文档验证由 `Document Store` / `Token Registry` 完成，文档所有权转移由 `Title Escrow` 完成。本节提供一套**最小可运行**的 UUPS 可升级合约实现，帮助理解其底层设计。

## 合约关系

```
DocumentRegistry (UUPS proxy)
    ├── issue(documentHash)
    ├── revoke(documentHash)
    └── verify(documentHash)

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
