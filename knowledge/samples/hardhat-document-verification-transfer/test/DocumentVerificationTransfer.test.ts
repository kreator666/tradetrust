import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { ContractFactory } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("UUPS Document Verification & Transfer", function () {
  async function deployFixture() {
    const [admin, issuer, revoker, beneficiary, holder, newBeneficiary, newHolder] =
      await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("DocumentRegistry");
    const registry = (await upgrades.deployProxy(
      RegistryFactory,
      [admin.address],
      { kind: "uups" }
    )) as any;
    await registry.waitForDeployment();

    await (
      await registry.connect(admin).grantRole(await registry.ISSUER_ROLE(), issuer.address)
    ).wait();
    await (
      await registry.connect(admin).grantRole(await registry.REVOKER_ROLE(), revoker.address)
    ).wait();

    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc-1"));
    await (await registry.connect(issuer).issue(documentHash)).wait();

    const EscrowFactory = await ethers.getContractFactory("DocumentEscrow");
    const escrow = (await upgrades.deployProxy(
      EscrowFactory,
      [
        await registry.getAddress(),
        documentHash,
        beneficiary.address,
        holder.address,
        admin.address,
      ],
      { kind: "uups" }
    )) as any;
    await escrow.waitForDeployment();

    return {
      registry,
      escrow,
      admin,
      issuer,
      revoker,
      beneficiary,
      holder,
      newBeneficiary,
      newHolder,
      documentHash,
    };
  }

  describe("DocumentRegistry", () => {
    it("should issue and verify a document", async () => {
      const { registry, documentHash } = await loadFixture(deployFixture);
      expect(await registry.isValid(documentHash)).to.equal(true);

      const status = await registry.verify(documentHash);
      expect(status[0]).to.equal(1); // Status.Issued
      expect(status[3]).to.not.equal(ethers.ZeroAddress);
    });

    it("should batch issue documents", async () => {
      const { registry, issuer } = await loadFixture(deployFixture);
      const h1 = ethers.keccak256(ethers.toUtf8Bytes("batch-a"));
      const h2 = ethers.keccak256(ethers.toUtf8Bytes("batch-b"));

      await expect(registry.connect(issuer).issueBatch([h1, h2]))
        .to.emit(registry, "DocumentIssued");

      expect(await registry.isValid(h1)).to.equal(true);
      expect(await registry.isValid(h2)).to.equal(true);
    });

    it("should revoke a document", async () => {
      const { registry, revoker, documentHash } = await loadFixture(deployFixture);
      await (await registry.connect(revoker).revoke(documentHash)).wait();

      expect(await registry.isValid(documentHash)).to.equal(false);
      const status = await registry.verify(documentHash);
      expect(status[0]).to.equal(2); // Status.Revoked
    });

    it("should reject revoke if document is not issued", async () => {
      const { registry, revoker } = await loadFixture(deployFixture);
      const hash = ethers.keccak256(ethers.toUtf8Bytes("not-issued"));
      await expect(registry.connect(revoker).revoke(hash)).to.be.revertedWithCustomError(
        registry,
        "DocumentNotIssued"
      );
    });

    it("should pause and unpause issuing", async () => {
      const { registry, admin, issuer } = await loadFixture(deployFixture);
      await (await registry.connect(admin).pause()).wait();

      const hash = ethers.keccak256(ethers.toUtf8Bytes("paused-doc"));
      await expect(registry.connect(issuer).issue(hash)).to.be.revertedWithCustomError(
        registry,
        "EnforcedPause"
      );

      await (await registry.connect(admin).unpause()).wait();
      await expect(registry.connect(issuer).issue(hash))
        .to.emit(registry, "DocumentIssued");
    });

    it("should upgrade to V2 and preserve state", async () => {
      const { registry, documentHash } = await loadFixture(deployFixture);
      const V2Factory = await ethers.getContractFactory("DocumentRegistryV2");
      const upgraded = await upgrades.upgradeProxy(
        await registry.getAddress(),
        V2Factory,
        { kind: "uups" }
      );
      await upgraded.waitForDeployment();

      expect(await upgraded.version()).to.equal("2.0.0");
      expect(await upgraded.isValid(documentHash)).to.equal(true);
    });
  });

  describe("DocumentEscrow", () => {
    it("should initialize with beneficiary and holder", async () => {
      const { escrow, beneficiary, holder, documentHash } = await loadFixture(deployFixture);
      expect(await escrow.beneficiary()).to.equal(beneficiary.address);
      expect(await escrow.holder()).to.equal(holder.address);
      expect(await escrow.documentHash()).to.equal(documentHash);
      expect(await escrow.surrendered()).to.equal(false);
    });

    it("should transfer holder via nomination", async () => {
      const { escrow, holder, newHolder } = await loadFixture(deployFixture);
      await (await escrow.connect(holder).nominateHolder(newHolder.address)).wait();

      await expect(escrow.connect(holder).transferHolder(newHolder.address))
        .to.emit(escrow, "HolderTransferred")
        .withArgs(holder.address, newHolder.address);

      expect(await escrow.holder()).to.equal(newHolder.address);
    });

    it("should transfer beneficiary via nomination", async () => {
      const { escrow, beneficiary, holder, newBeneficiary } = await loadFixture(deployFixture);
      await (await escrow.connect(beneficiary).nominateBeneficiary(newBeneficiary.address)).wait();

      await expect(escrow.connect(holder).transferBeneficiary(newBeneficiary.address))
        .to.emit(escrow, "BeneficiaryTransferred")
        .withArgs(beneficiary.address, newBeneficiary.address);

      expect(await escrow.beneficiary()).to.equal(newBeneficiary.address);
    });

    it("should transfer owners when caller is both beneficiary and holder", async () => {
      const { registry, escrow, beneficiary, holder, newBeneficiary, newHolder, documentHash } =
        await loadFixture(deployFixture);

      // 先让 holder 也成为 beneficiary
      await (await escrow.connect(beneficiary).nominateBeneficiary(holder.address)).wait();
      await (await escrow.connect(holder).transferBeneficiary(holder.address)).wait();
      expect(await escrow.beneficiary()).to.equal(holder.address);

      await expect(
        escrow.connect(holder).transferOwners(newBeneficiary.address, newHolder.address)
      )
        .to.emit(escrow, "OwnersTransferred")
        .withArgs(newBeneficiary.address, newHolder.address);

      expect(await escrow.beneficiary()).to.equal(newBeneficiary.address);
      expect(await escrow.holder()).to.equal(newHolder.address);
    });

    it("should surrender and block further transfers", async () => {
      const { escrow, holder, newHolder } = await loadFixture(deployFixture);
      await expect(escrow.connect(holder).surrender())
        .to.emit(escrow, "Surrendered")
        .withArgs(holder.address);

      expect(await escrow.surrendered()).to.equal(true);
      await expect(
        escrow.connect(holder).nominateHolder(newHolder.address)
      ).to.be.revertedWithCustomError(escrow, "AlreadySurrendered");
    });

    it("should reject escrow creation for unissued document", async () => {
      const { registry, admin, beneficiary, holder } = await loadFixture(deployFixture);
      const EscrowFactory = (await ethers.getContractFactory(
        "DocumentEscrow"
      )) as unknown as ContractFactory;
      const hash = ethers.keccak256(ethers.toUtf8Bytes("not-issued"));

      await expect(
        upgrades.deployProxy(
          EscrowFactory,
          [await registry.getAddress(), hash, beneficiary.address, holder.address, admin.address],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(EscrowFactory, "DocumentNotIssued");
    });

    it("should register escrow in registry and query by document hash", async () => {
      const { registry, escrow, documentHash } = await loadFixture(deployFixture);
      const escrowAddr = await escrow.getAddress();

      await expect(registry.registerEscrow(escrowAddr, documentHash))
        .to.emit(registry, "EscrowRegistered")
        .withArgs(documentHash, escrowAddr);

      expect(await registry.registeredEscrow(escrowAddr)).to.equal(true);
      const list = await registry.escrowsByDocumentList(documentHash);
      expect(list).to.include(escrowAddr);
    });

    it("should reject registerEscrow for unissued document", async () => {
      const { registry, escrow } = await loadFixture(deployFixture);
      const escrowAddr = await escrow.getAddress();
      const hash = ethers.keccak256(ethers.toUtf8Bytes("not-issued"));

      await expect(registry.registerEscrow(escrowAddr, hash)).to.be.revertedWithCustomError(
        registry,
        "DocumentNotIssued"
      );
    });

    it("should reject duplicate escrow registration", async () => {
      const { registry, escrow, documentHash } = await loadFixture(deployFixture);
      const escrowAddr = await escrow.getAddress();
      await (await registry.registerEscrow(escrowAddr, documentHash)).wait();

      await expect(registry.registerEscrow(escrowAddr, documentHash)).to.be.revertedWithCustomError(
        registry,
        "EscrowAlreadyRegistered"
      );
    });

    it("should reject escrow pointing to wrong registry", async () => {
      const { admin, beneficiary, holder } = await loadFixture(deployFixture);
      const OtherRegistryFactory = await ethers.getContractFactory("DocumentRegistry");
      const otherRegistry = (await upgrades.deployProxy(
        OtherRegistryFactory,
        [admin.address],
        { kind: "uups" }
      )) as any;
      await otherRegistry.waitForDeployment();

      const hash = ethers.keccak256(ethers.toUtf8Bytes("other-doc"));
      await (await otherRegistry.connect(admin).grantRole(await otherRegistry.ISSUER_ROLE(), admin.address)).wait();
      await (await otherRegistry.connect(admin).issue(hash)).wait();

      const EscrowFactory = await ethers.getContractFactory("DocumentEscrow");
      const escrow = (await upgrades.deployProxy(
        EscrowFactory,
        [await otherRegistry.getAddress(), hash, beneficiary.address, holder.address, admin.address],
        { kind: "uups" }
      )) as any;
      await escrow.waitForDeployment();

      const { registry, documentHash } = await loadFixture(deployFixture);
      await expect(registry.registerEscrow(await escrow.getAddress(), documentHash)).to.be.reverted;
    });

    it("should upgrade to V2 and preserve state", async () => {
      const { escrow, beneficiary, holder } = await loadFixture(deployFixture);
      const V2Factory = await ethers.getContractFactory("DocumentEscrowV2");
      const upgraded = await upgrades.upgradeProxy(await escrow.getAddress(), V2Factory, {
        kind: "uups",
      });
      await upgraded.waitForDeployment();

      expect(await upgraded.version()).to.equal("2.0.0");
      expect(await upgraded.beneficiary()).to.equal(beneficiary.address);
      expect(await upgraded.holder()).to.equal(holder.address);
    });
  });
});
