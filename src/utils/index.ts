import splToken from '@solana/spl-token';

import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  Transaction,
} from '@solana/web3.js';

import {
  WalletSigner,
  ParimutuelWeb3,
  MAINNET_CONFIG,
  PositionSideEnum,
} from '@hxronetwork/parimutuelsdk';

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const feeWallet = '5qxvvD5fJJK2xPBmifNV1cmbN6vMrncjTinmFWU1eRGs';
const SWAP_FEE_BPS = 50;

export interface TokenData {
  address: string;
  chainId: number;
  decimals: number;
  extensions: { coingeckoId: string };
  logoURI: string;
  name: string;
  symbol: string;
  tags: string[];
}

export async function fetchSwappableTokenList(): Promise<TokenData[]> {
  // Fetch token list
  const response = await fetch('https://token.jup.ag/strict');
  const tokenList: TokenData[] = (await response.json()) as Array<any>;

  // Retrieve indexed routed map
  const indexedRouteMapResponse = await fetch(
    'https://quote-api.jup.ag/v4/indexed-route-map'
  );
  const indexedRouteMap = await indexedRouteMapResponse.json();

  const getMint = (index): string => indexedRouteMap['mintKeys'][index];

  // Generate route map by replacing indexes with mint addresses
  const generatedRouteMap = {};

  Object.keys(indexedRouteMap['indexedRouteMap']).forEach((key) => {
    generatedRouteMap[getMint(key)] = indexedRouteMap['indexedRouteMap'][
      key
    ].map((index: string | number) => getMint(index));
  });

  const swappableOutputForUSDC = generatedRouteMap[USDC_MINT];
  const getIndexInUSDCSwappableOutput = (mint: string) =>
    swappableOutputForUSDC.indexOf(mint);

  const filteredTokenList: TokenData[] = tokenList.filter(
    (token: TokenData) => getIndexInUSDCSwappableOutput(token.address) !== -1
  );

  return filteredTokenList;
}

async function getQuote(amount: number, inputMint: string) {
  const { data } = await (
    await fetch(
      `https://quote-api.jup.ag/v4/quote?inputMint=${inputMint}&outputMint=${USDC_MINT}&amount=${amount}&slippageBps=50&feeBps=${SWAP_FEE_BPS}&swapMode=ExactOut`
    )
  ).json();
  return data;
}

async function getSwapTransaction(routes: {}[], wallet: string) {
  const usdcATA = await splToken.Token.getAssociatedTokenAddress(
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    splToken.TOKEN_PROGRAM_ID,
    new PublicKey(USDC_MINT),
    new PublicKey(feeWallet)
  );

  // get serialized transactions for the swap
  const transactions = await (
    await fetch('https://quote-api.jup.ag/v4/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // route from /quote api
        route: routes[0],
        // user public key to be used for the swap
        userPublicKey: wallet,
        // auto wrap and unwrap SOL. default is true
        wrapUnwrapSOL: true,
        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
        // This is the ATA account for the output token where the fee will be sent to. If you are swapping from SOL->USDC then this would be the USDC ATA you want to collect the fee.
        feeAccount: usdcATA,
      }),
    })
  ).json();

  const { swapTransaction } = transactions;

  return swapTransaction;
}

interface PlacePositionTransactionData {
  transaction: VersionedTransaction;
  paymentBreakdown: {
    swapFee: number;
    devFee: number;
    betAmount: number;
    total: number;
  };
}

export async function getPlacePositionTransactionData(
  connection: Connection,
  wallet: WalletSigner | Keypair,
  inputTokenMint: string,
  amount: number,
  parimutuelMarket: string,
  side: PositionSideEnum,
  feeUSDCAccount?: string,
  devFeeBps = 0
): Promise<PlacePositionTransactionData> {
  amount = amount * 1e6;

  const parimutuelWeb3 = new ParimutuelWeb3(MAINNET_CONFIG, connection);

  //get quote routes
  const routes = await getQuote(amount, inputTokenMint);
  const swapFee = amount * (SWAP_FEE_BPS / 10_000);
  const devFee = amount * (devFeeBps / 10_000);
  const betAmount = amount - swapFee - devFee;

  //get swap instruction
  const swapTransaction = await getSwapTransaction(
    routes,
    wallet.publicKey.toBase58()
  );
  const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
  var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  // get address lookup table accounts
  const addressLookupTableAccounts = await Promise.all(
    transaction.message.addressTableLookups.map(async (lookup) => {
      return new AddressLookupTableAccount({
        key: lookup.accountKey,
        state: AddressLookupTableAccount.deserialize(
          await connection.getAccountInfo(lookup.accountKey).then((res) => {
            return res.data;
          })
        ),
      });
    })
  );

  // decompile transaction message and add transfer instruction
  var message = TransactionMessage.decompile(transaction.message, {
    addressLookupTableAccounts: addressLookupTableAccounts,
  });

  if (feeUSDCAccount && devFeeBps > 0) {
    const userUsdcATA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      new PublicKey(USDC_MINT),
      new PublicKey(wallet.publicKey)
    );
    const transferInstruction = splToken.Token.createTransferInstruction(
      splToken.TOKEN_PROGRAM_ID,
      userUsdcATA,
      new PublicKey(feeUSDCAccount),
      wallet.publicKey,
      [],
      devFee
    );
    //transfer fee to dev wallet instruction
    message.instructions.push(transferInstruction);
  }
  let placePositionIx = await parimutuelWeb3.getPlacePositionInstruction(
    wallet as WalletSigner,
    new PublicKey(parimutuelMarket),
    betAmount,
    side,
    Date.now()
  );
  message.instructions.push(...placePositionIx);
  transaction.message = message.compileToV0Message(addressLookupTableAccounts);

  return {
    transaction,
    paymentBreakdown: {
      swapFee,
      devFee,
      betAmount,
      total: amount,
    },
  };
}
