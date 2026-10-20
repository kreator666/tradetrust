// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IDocumentRegistry
 * @notice DocumentRegistry 对外暴露的最小接口，供 DocumentEscrow 在初始化时校验文档状态。
 */
interface IDocumentRegistry {
    function isValid(bytes32 documentHash) external view returns (bool);
}
