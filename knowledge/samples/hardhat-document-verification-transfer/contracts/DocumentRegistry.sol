// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IDocumentEscrow} from "./IDocumentEscrow.sol";

/**
 * @title DocumentRegistry
 * @notice UUPS 可升级文档注册表。
 *         支持对文档 Merkle root / 哈希进行签发（issue）、撤销（revoke）与链上验证，
 *         并记录每个文档哈希对应的 DocumentEscrow 合约地址。
 */
contract DocumentRegistry is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    enum Status {
        None,
        Issued,
        Revoked
    }

    struct Document {
        Status status;
        uint64 issuedAt;
        uint64 revokedAt;
        address issuer;
    }

    mapping(bytes32 => Document) public documents;

    /// @notice 每个文档哈希对应的 DocumentEscrow 地址列表
    mapping(bytes32 => address[]) public escrowsByDocument;

    /// @notice 已注册的 Escrow 地址，防止重复注册
    mapping(address => bool) public registeredEscrow;

    event DocumentIssued(bytes32 indexed documentHash, address indexed issuer, uint256 issuedAt);
    event DocumentRevoked(bytes32 indexed documentHash, address indexed revoker, uint256 revokedAt);
    event EscrowRegistered(bytes32 indexed documentHash, address indexed escrow);
    event UpgradeAuthorized(address indexed newImplementation);

    error DocumentAlreadyIssued(bytes32 documentHash);
    error DocumentNotIssued(bytes32 documentHash);
    error DocumentAlreadyRevoked(bytes32 documentHash);
    error EscrowAlreadyRegistered(address escrow);
    error InvalidEscrow();
    error EscrowDocumentMismatch();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setRoleAdmin(ISSUER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(REVOKER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
     * @notice 签发一份文档。documentHash 通常为 OpenAttestation / W3C VC 的 Merkle root。
     */
    function issue(bytes32 documentHash) external onlyRole(ISSUER_ROLE) whenNotPaused {
        _issue(documentHash);
    }

    /**
     * @notice 批量签发文档。
     */
    function issueBatch(bytes32[] calldata documentHashes) external onlyRole(ISSUER_ROLE) whenNotPaused {
        for (uint256 i = 0; i < documentHashes.length; ++i) {
            _issue(documentHashes[i]);
        }
    }

    function _issue(bytes32 documentHash) internal {
        Document storage doc = documents[documentHash];
        if (doc.status != Status.None) revert DocumentAlreadyIssued(documentHash);

        doc.status = Status.Issued;
        doc.issuedAt = uint64(block.timestamp);
        doc.issuer = msg.sender;

        emit DocumentIssued(documentHash, msg.sender, block.timestamp);
    }

    /**
     * @notice 撤销一份已签发文档。
     */
    function revoke(bytes32 documentHash) external onlyRole(REVOKER_ROLE) whenNotPaused {
        Document storage doc = documents[documentHash];
        if (doc.status != Status.Issued) revert DocumentNotIssued(documentHash);

        doc.status = Status.Revoked;
        doc.revokedAt = uint64(block.timestamp);

        emit DocumentRevoked(documentHash, msg.sender, block.timestamp);
    }

    /**
     * @notice 查询文档状态。
     */
    function verify(bytes32 documentHash) external view returns (Status status, uint64 issuedAt, uint64 revokedAt, address issuer) {
        Document storage doc = documents[documentHash];
        return (doc.status, doc.issuedAt, doc.revokedAt, doc.issuer);
    }

    /**
     * @notice 快速判断文档是否仍然有效（已签发且未被撤销）。
     */
    function isValid(bytes32 documentHash) external view returns (bool) {
        return documents[documentHash].status == Status.Issued;
    }

    /**
     * @notice 查询某文档哈希对应的所有已注册 Escrow 地址。
     */
    function escrowsByDocumentList(bytes32 documentHash) external view returns (address[] memory) {
        return escrowsByDocument[documentHash];
    }

    /**
     * @notice 注册一个已部署的 DocumentEscrow 到本 Registry。
     *         调用者需提供 Escrow 地址，Registry 会校验该 Escrow 指向本 Registry 且文档哈希已签发。
     */
    function registerEscrow(address escrow, bytes32 documentHash) external {
        if (documents[documentHash].status != Status.Issued) revert DocumentNotIssued(documentHash);
        if (registeredEscrow[escrow]) revert EscrowAlreadyRegistered(escrow);

        IDocumentEscrow escrowContract = IDocumentEscrow(escrow);
        if (escrowContract.registry() != address(this)) revert InvalidEscrow();
        if (escrowContract.documentHash() != documentHash) revert EscrowDocumentMismatch();

        registeredEscrow[escrow] = true;
        escrowsByDocument[documentHash].push(escrow);
        emit EscrowRegistered(documentHash, escrow);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {
        emit UpgradeAuthorized(newImplementation);
    }
}
