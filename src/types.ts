import { PublicKey } from '@solana/web3.js';

export interface TokenData {
  balance?: number | string;
  usdValue?: number;
  address: string;
  chainId: number;
  decimals: number;
  extensions: { coingeckoId: string };
  logoURI: string;
  name: string;
  symbol: string;
  tags: string[];
}

export interface UserToken {
  balance: string;
  mint: string;
  publicKey: PublicKey;
}
export interface Route {
  [key: string]: any;
}
