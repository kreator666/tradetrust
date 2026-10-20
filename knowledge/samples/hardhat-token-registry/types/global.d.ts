declare module "hardhat" {
  export const ethers: any;
  export const network: { provider: any };
}

declare module "@tradetrust-tt/token-registry/contracts" {
  export class TitleEscrowFactory__factory {
    constructor(signer: any);
    deploy(): Promise<any>;
  }

  export class TradeTrustToken__factory {
    constructor(signer: any);
    deploy(name: string, symbol: string, titleEscrowFactory: string): Promise<any>;
    static connect(address: string, signer: any): any;
  }

  export class TitleEscrow__factory {
    constructor(address: string, signer: any);
    static connect(address: string, signer: any): any;
  }
}
