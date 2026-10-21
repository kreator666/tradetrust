// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// 该文件仅用于确保 Hardhat 编译并生成以下 OpenZeppelin 合约的 artifact，
// 供后端 /api/deploy-escrow 在手动部署 UUPS 代理时使用。
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract Imports {}
