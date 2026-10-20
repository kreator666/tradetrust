# Token Registry 与可转让记录

Token Registry 是 TradeTrust 中用于表示**可转让记录（Transferable Records）**所有权的智能合约。每一份文档的哈希（tokenId / Merkle root）会映射到一个 Title Escrow 合约地址，由 Title Escrow 管理受益人（beneficiary）与持有人（holder）。

## 核心合约

### TradeTrustToken

- 基于 ERC-721 的 Soulbound Token（SBT），token 与 Title Escrow 绑定。
- 主要函数：
  - `mint(beneficiary, holder, tokenId, remark)`：铸造并创建 Title Escrow。
  - `restore(tokenId, remark)`：拒绝归还。
  - `burn(tokenId, remark)`：接受归还并销毁 token。
  - `grantRole(role, account)` / `revokeRole(role, account)`：角色管理。

### TitleEscrow

- 管理单个 token 的所有权。
- 主要函数：
  - `nominate(beneficiaryNominee, remark)`：当前受益人提名新受益人。
  - `transferBeneficiary(nominee, remark)`：持有人确认受益人转让。
  - `transferHolder(newHolder, remark)`：持有人转让持有人身份。
  - `transferOwners(newBeneficiary, newHolder, remark)`：同时转让受益人与持有人（需当前地址兼具两者身份）。
  - `rejectTransferBeneficiary / rejectTransferHolder / rejectTransferOwners`：拒绝被提名的转让。
  - `returnToIssuer(remark)`：将文档归还给签发方（surrender）。
  - `beneficiary()` / `holder()` / `nominee()`：查询当前地址。

### TitleEscrowFactory

- 工厂合约，负责以确定性方式克隆 TitleEscrow 实现。
- `TradeTrustToken` 构造函数需要传入 TitleEscrowFactory 地址。

## 角色（Token Registry v5）

| 角色 | 权限 |
|------|------|
| `DefaultAdmin` | 可执行所有操作 |
| `MinterRole` | 可铸造新 token |
| `AccepterRole` | 可接受归还的 token（burn） |
| `RestorerRole` | 可恢复/拒绝归还的 token |

角色哈希可通过 `@tradetrust-tt/token-registry` 的 `constants.roleHash` 或 `@trustvc/trustvc` 的 `v5RoleHash` 获取。

## 部署方式

### 方式一：通过 TDocDeployer（推荐，成本低）

链上已有 TDocDeployer 与默认实现，直接调用 `deploy()` 克隆合约。

```ts
import {
  TDocDeployer__factory,
  TOKEN_REG_CONSTS,
  encodeInitParams,
  getEventFromReceipt,
} from "@tradetrust-tt/tradetrust-core";

const { TokenImplementation, Deployer } = TOKEN_REG_CONSTS.contractAddress;
const deployerContract = TDocDeployer__factory.connect(Deployer[chainId], wallet);
const initParam = encodeInitParams({ name: "Demo", symbol: "DTR", deployer: walletAddress });
const tx = await deployerContract.deploy(TokenImplementation[chainId], initParam);
const receipt = await tx.wait();
const registryAddress = getEventFromReceipt(receipt, deployerContract.interface.getEventTopic("Deployment")).args.deployed;
```

### 方式二：独立部署（本地测试常用）

```ts
import {
  TitleEscrowFactory__factory,
  TradeTrustToken__factory,
} from "@tradetrust-tt/token-registry/contracts";

const factory = await new TitleEscrowFactory__factory(deployer).deploy();
const registry = await new TradeTrustToken__factory(deployer).deploy("Demo", "DTR", factory.address);
```

## 铸造可转让记录

```ts
import { signW3C } from "@trustvc/trustvc";
import { getTokenId } from "@trustvc/trustvc";

// 1. 构造并签名 W3C VC
const { signed: signedDocument } = await signW3C(rawDocument, keyPair);
const tokenId 
