import {
  USDC_MINT,
  fetchSwappableTokenList,
  getParimutuelMarketTimeLeft,
  getPlacePositionTransaction,
  getTokenValueInUSD,
} from '../dist';

import {
  ParimutuelWeb3,
  MarketPairEnum,
  getMarketPubkeys,
  PositionSideEnum,
  MAINNET_CONFIG,
} from '@hxronetwork/parimutuelsdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from 'spl-token';

require('dotenv').config();

describe('Pariswap functions', () => {
  it('fetches list of tokens that can be swapped with USDC', async () => {
    const tokenList = await fetchSwappableTokenList();
    console.log({ tokenList });

    expect(tokenList.length).toBeGreaterThan(0);
  });

  it('gets token value in USDC', async () => {
    const usdValue = await getTokenValueInUSD('SOL', 0.234);
    expect(usdValue).toBeGreaterThan(0);
  });
  it.only('generates LONG/SHORT instruction', async () => {
    const user = Keypair.generate();
    const dev = Keypair.generate();
    const devFeeBps = 50; //0.50 percent
    const betAmount = 1;

    const config = MAINNET_CONFIG;
    const desiredSeconds = 60; //1 minute
    const market = MarketPairEnum.BTCUSD;
    const side = PositionSideEnum.LONG;
    let rpc = process.env.RPC_URL || '';

    const connection = new Connection(rpc, 'confirmed');
    const parimutuelWeb3 = new ParimutuelWeb3(config, connection);
    const markets = getMarketPubkeys(config, market);

    const marketsByTime = markets.filter(
      (market) => market.duration === desiredSeconds
    );

    const parimutuels = await parimutuelWeb3.getParimutuels(marketsByTime);

    const pari_markets = parimutuels.filter(
      (account) =>
        account.info.parimutuel.timeWindowStart.toNumber() > Date.now() &&
        account.info.parimutuel.timeWindowStart.toNumber() <
          Date.now() + desiredSeconds * 1000
    );

    const pubkey = pari_markets[0].pubkey.toString();

    //dev usdc Account (must've been initialized)
    const devUsdcATA = await getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      dev.publicKey
    );
    const placeBetTransaction = await getPlacePositionTransaction(
      connection,
      user,
      'GzpRsvnKXKz586kRLkjdppR4dUCFwHa2qaszKkPUQx6g',
      betAmount,
      pubkey,
      side,
      devUsdcATA.toBase58(),
      devFeeBps
    );

    placeBetTransaction.sign([user]);
    const txId = await connection.sendTransaction(placeBetTransaction);
    console.log(`https://explorer.solana.com/tx/${txId}`);
  });

  it('gets time left for parimutuel market', async () => {
    const config = MAINNET_CONFIG;
    const desiredSeconds = 60; //1 minute
    const market = MarketPairEnum.BTCUSD;
    const side = PositionSideEnum.LONG;
    let rpc = process.env.RPC_URL || '';

    const connection = new Connection(rpc, 'confirmed');
    const parimutuelWeb3 = new ParimutuelWeb3(config, connection);
    const markets = getMarketPubkeys(config, market);

    const marketsByTime = markets.filter(
      (market) => market.duration === desiredSeconds
    );

    const parimutuels = await parimutuelWeb3.getParimutuels(marketsByTime);

    const pari_markets = parimutuels.filter(
      (account) =>
        account.info.parimutuel.timeWindowStart.toNumber() > Date.now() &&
        account.info.parimutuel.timeWindowStart.toNumber() <
          Date.now() + desiredSeconds * 1000
    );

    const pubkey = pari_markets[0].pubkey.toString();
    const timeLeft = await getParimutuelMarketTimeLeft(
      connection,
      new PublicKey(pubkey)
    );
    expect(timeLeft).toBeTruthy();
  });
});
