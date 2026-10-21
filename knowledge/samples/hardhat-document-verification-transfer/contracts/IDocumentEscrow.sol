// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IDocumentEscrow
 * @notice DocumentEscrow 对外暴露的最小接口，供 DocumentRegistry 在注册时校验。
 */
interface IDocumentEscrow {
    function registry() external view returns (address);
    function documentHash() external view returns (bytes32);
}
