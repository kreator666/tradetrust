// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DocumentEscrow} from "./DocumentEscrow.sol";

/**
 * @title DocumentEscrowV2
 * @notice DocumentEscrow 的 V2 实现，仅新增版本查询函数，用于演示 UUPS 升级。
 *         不新增存储变量，保持与 V1 的存储布局兼容。
 */
contract DocumentEscrowV2 is DocumentEscrow {
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
