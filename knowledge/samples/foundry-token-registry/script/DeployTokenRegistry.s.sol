// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "token-registry/TitleEscrowFactory.sol";
import "token-registry/TradeTrustToken.sol";

contract DeployTokenRegistry is Script {
    function run() external returns (address factoryAddress, address registryAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        TitleEscrowFactory factory = new TitleEscrowFactory();
        TradeTrustToken registry = new TradeTrustToken("Demo Token Registry", "DTR", address(factory));
        vm.stopBroadcast();

        factoryAddress = address(factory);
        registryAddress = address(registry);

        console.log("TitleEscrowFactory:", factoryAddress);
        console.log("TokenRegistry:", registryAddress);
    }
}
