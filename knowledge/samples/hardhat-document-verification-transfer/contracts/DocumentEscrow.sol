// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IDocumentRegistry} from "./IDocumentRegistry.sol";

/**
 * @title DocumentEscrow
 * @notice UUPS 可升级文档转移托管合约。
 *         每一份文档对应一个 Escrow，管理 beneficiary（受益人）与 holder（持有人）的转让流程。
 */
contract DocumentEscrow is Initializable, UUPSUpgradeable {
    IDocumentRegistry public registry;
    bytes32 public documentHash;

    address public beneficiary;
    address public holder;
    address public beneficiaryNominee;
    address public holderNominee;
    address public admin;

    bool public surrendered;

    event BeneficiaryNominated(address indexed nominee);
    event HolderNominated(address indexed nominee);
    event BeneficiaryTransferred(address indexed from, address indexed to);
    event HolderTransferred(address indexed from, address indexed to);
    event OwnersTransferred(address indexed newBeneficiary, address indexed newHolder);
    event Surrendered(address indexed by);
    event UpgradeAuthorized(address indexed newImplementation);

    error OnlyBeneficiary();
    error OnlyHolder();
    error OnlyBeneficiaryAndHolder();
    error InvalidNominee();
    error AlreadySurrendered();
    error DocumentNotIssued();
    error OnlyAdmin();

    modifier onlyBeneficiary() {
        if (msg.sender != beneficiary) revert OnlyBeneficiary();
        _;
    }

    modifier onlyHolder() {
        if (msg.sender != holder) revert OnlyHolder();
        _;
    }

    modifier notSurrendered() {
        if (surrendered) revert AlreadySurrendered();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address registry_,
        bytes32 documentHash_,
        address beneficiary_,
        address holder_,
        address admin_
    ) public initializer {
        if (!IDocumentRegistry(registry_).isValid(documentHash_)) revert DocumentNotIssued();

        registry = IDocumentRegistry(registry_);
        documentHash = documentHash_;
        beneficiary = beneficiary_;
        holder = holder_;
        admin = admin_;
    }

    /**
     * @notice 受益人提名新的受益人候选人。
     */
    function nominateBeneficiary(address nominee) external onlyBeneficiary notSurrendered {
        beneficiaryNominee = nominee;
        emit BeneficiaryNominated(nominee);
    }

    /**
     * @notice 持有人确认受益人转让。被提名人必须等于 beneficiaryNominee。
     */
    function transferBeneficiary(address nominee) external onlyHolder notSurrendered {
        if (nominee != beneficiaryNominee) revert InvalidNominee();

        address prev = beneficiary;
        beneficiary = nominee;
        beneficiaryNominee = address(0);

        emit BeneficiaryTransferred(prev, nominee);
    }

    /**
     * @notice 持有人提名新的持有人候选人。
     */
    function nominateHolder(address nominee) external onlyHolder notSurrendered {
        holderNominee = nominee;
        emit HolderNominated(nominee);
    }

    /**
     * @notice 持有人确认持有人转让。被提名人必须等于 holderNominee。
     */
    function transferHolder(address nominee) external onlyHolder notSurrendered {
        if (nominee != holderNominee) revert InvalidNominee();

        address prev = holder;
        holder = nominee;
        holderNominee = address(0);

        emit HolderTransferred(prev, nominee);
    }

    /**
     * @notice 同时转让受益人与持有人。要求调用者同时是受益人与持有人。
     */
    function transferOwners(address newBeneficiary, address newHolder) external onlyHolder notSurrendered {
        if (msg.sender != beneficiary) revert OnlyBeneficiaryAndHolder();

        beneficiary = newBeneficiary;
        holder = newHolder;
        beneficiaryNominee = address(0);
        holderNominee = address(0);

        emit OwnersTransferred(newBeneficiary, newHolder);
    }

    /**
     * @notice 持有人将文档归还给签发方（surrender）。归还后不可再转让。
     */
    function surrender() external onlyHolder notSurrendered {
        surrendered = true;
        emit Surrendered(msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override {
        if (msg.sender != admin) revert OnlyAdmin();
        emit UpgradeAuthorized(newImplementation);
    }
}
