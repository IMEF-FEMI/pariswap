import {
  fetchSwappableTokenList,
  getPlacePositionTransactionData,
} from '../dist';
import {
  ParimutuelWeb3,
  MarketPairEnum,
  getMarketPubkeys,
  PositionSideEnum,
  MAINNET_CONFIG,
} from '@hxronetwork/parimutuelsdk';
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { BlockheightBasedTransactionConfirmationStrategy } from '@solana/web3.js';

require('dotenv').config();

describe('Pariswap functions', () => {
  it('fetches list of tokens that can be swapped with USDC', async () => {
    const tokenList = await fetchSwappableTokenList();
    expect(tokenList.length).toBeGreaterThan(0);
  });

  it.only('generates LONG/SHORT instruction', async () => {
    const user = Keypair.generate();
    const dev = Keypair.generate();
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const devFeeBps = 50; //0.50 percent
    const betAmount = 1;

    const devUsdcATA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      new PublicKey(USDC_MINT),
      new PublicKey(dev.publicKey)
    );
    const config = MAINNET_CONFIG;
    const desiredSeconds = 60; //1 minute
    let rpc = process.env.RPC_URL || '';
    const market = MarketPairEnum.BTCUSD;
    const side = PositionSideEnum.LONG;

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

    const placeBetData = await getPlacePositionTransactionData(
      connection,
      user,
      splToken.NATIVE_MINT.toBase58(),
      betAmount,
      pubkey,
      side,
      devUsdcATA.toBase58(),
      devFeeBps
    );

    const rawTransaction = placeBetData.transaction.serialize();

    // const signature = await connection.sendRawTransaction(rawTransaction)

    // const latestBlockHash = await connection.getLatestBlockhash()
    // const confirmStrategy: BlockheightBasedTransactionConfirmationStrategy = {
    //   blockhash: latestBlockHash.blockhash,
    //   lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    //   signature: signature
    // }
    // const result = await connection.confirmTransaction(confirmStrategy)

    // console.log(result)
  });
});
