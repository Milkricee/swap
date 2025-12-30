// Type declarations for monero-javascript
declare module 'monero-javascript' {
  export class MoneroWalletFull {
    static createWallet(config: {
      networkType: any;
      password?: string;
      mnemonic?: string;
      restoreHeight?: number;
      serverUri?: string;
    }): Promise<MoneroWalletFull>;

    getMnemonic(): Promise<string>;
    getPrimaryAddress(): Promise<string>;
    getPublicViewKey(): Promise<string>;
    getPublicSpendKey(): Promise<string>;
    getBalance(): Promise<bigint>;
    sync(): Promise<void>;
    close(): Promise<void>;
    createTx(config: {
      accountIndex: number;
      address: string;
      amount: string;
      relay: boolean;
    }): Promise<any>;
    relayTx(tx: any): Promise<void>;
  }

  export const MoneroNetworkType: {
    MAINNET: any;
    TESTNET: any;
    STAGENET: any;
  };
}
