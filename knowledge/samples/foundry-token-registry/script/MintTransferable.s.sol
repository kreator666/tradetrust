// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "token-registry/TradeTrustToken.sol";

contract MintTransferable is Script {
    function run() external {
        uint256 minterPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddress = vm.envAddress("TOKEN_REGISTRY_ADDRESS");
        bytes32 tokenId = vm.envBytes32("TOKEN_ID");
        address beneficiary = vm.envAddress("BENEFICIARY");
        address holder = vm.envAddress("HOLDER");

        TradeTrustToken registry = TradeTrustToken(registryAddress);

        vm.startBroadcast(minterPrivateKey);
        registry.mint(beneficiary, holder, uint256(tokenId), "0x");
        vm.stopBroadcast();

        console.log("Minted tokenId:", uint256(tokenId));
        console.log("TitleEscrow:", registry.ownerOf(uint256(tokenId)));
    }
}
