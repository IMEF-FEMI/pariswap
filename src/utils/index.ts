import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';

import { ParimutuelWeb3, MAINNET_CONFIG } from '@hxronetwork/parimutuelsdk';
import {
  getAssociatedTokenAddressSync,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from 'spl-token';
import { Route, TokenData } from '../types';

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SWAP_FEE_BPS = 50;
export const SWAP_FEE_WALLET = '5qxvvD5fJJK2xPBmifNV1cmbN6vMrncjTinmFWU1eRGs';

/**
 * Fetches a list of tokens swappable with USDC. (returns only validated tokens -- No unknown and banned tokens).
 *
 * @returns {Promise<TokenData[]>} - A promise that resolves to an array of TokenData objects representing the swappable tokens.
 */
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

  // const tokens = getPossiblePairsTokenInfo({ tokens: tokenList, routeMap: generatedRouteMap, inputTokenAddress: USDC_MINT })

  // console.log(tokens.l);

  // return Object.values(tokens).filter((token) => {
  //   if (token) return true
  //   else return false
  // });

  const swappableOutputForUSDC = generatedRouteMap[USDC_MINT];
  const getIndexInUSDCSwappableOutput = (mint: string) =>
    swappableOutputForUSDC.indexOf(mint);

  const filteredTokenList: TokenData[] = tokenList.filter(
    (token: TokenData) => getIndexInUSDCSwappableOutput(token.address) !== -1
  );

  return filteredTokenList;
}

// A helper function to help us find which output pair is possible
const getPossiblePairsTokenInfo = ({
  tokens,
  routeMap,
  inputTokenAddress,
}: {
  tokens: TokenData[];
  routeMap: { [key: string]: string[] };
  inputTokenAddress?: string;
}) => {
  try {
    const possiblePairs = routeMap[inputTokenAddress];
    var possiblePairsTokenInfo: { [key: string]: TokenData | undefined } = {};
    possiblePairs.forEach((address) => {
      possiblePairsTokenInfo[address] = tokens.find((t) => {
        return t.address == address;
      });
    });

    return possiblePairsTokenInfo;
  } catch (error) {
    throw error;
  }
};
export async function getExactOutQuote(amount: number, inputMint: string) {
  const { data } = await (
    await fetch(
      `https://quote-api.jup.ag/v4/quote?inputMint=${inputMint}&outputMint=${USDC_MINT}&amount=${amount}&slippageBps=50&feeBps=${SWAP_FEE_BPS}&swapMode=ExactOut`
    )
  ).json();
  return data;
}

export async function getExactInQuote(amount: number, inputMint: string) {
  const { data } = await (
    await fetch(
      `https://quote-api.jup.ag/v4/quote?inputMint=${inputMint}&outputMint=${USDC_MINT}&amount=${amount}&slippageBps=50&feeBps=${SWAP_FEE_BPS}&swapMode=ExactIn`
    )
  ).json();
  return data;
}

export async function getTokenPrice(inputMint: string) {
  const { data } = await (
    await fetch(
      `https://price.jup.ag/v4/price?ids=${inputMint}&vsToken=${USDC_MINT}`
    )
  ).json();

  if (!data[inputMint]) {
    return 0;
  }
  return Number(data[inputMint].price);
}

export async function getTokenValueInUSD(token: string, amount: number) {
  const { data } = await (
    await fetch(`https://price.jup.ag/v4/price?ids=${token}`)
  ).json();

  if (!data || Object.keys(data).length === 0) return 0;

  return amount * Number(data[token].price);
}

export async function getSwapTransaction(
  routes: Route[],
  wallet: string,
  swapType: string
) {
  let feeAccountATA: PublicKey;
  if (swapType === 'ExactIn') {
    feeAccountATA = await getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      new PublicKey(SWAP_FEE_WALLET)
    );
  } else {
    feeAccountATA = await getAssociatedTokenAddressSync(
      new PublicKey(routes[0].marketInfos[0].inputMint),
      new PublicKey(SWAP_FEE_WALLET)
    );
  }

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
        wrapUnwrapSOL: swapType === 'ExactOut',
        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
        // This is the ATA account for the output token where the fee will be sent to. If you are swapping from SOL->USDC then this would be the USDC ATA you want to collect the fee.
        feeAccount: feeAccountATA,
      }),
    })
  ).json();

  const { swapTransaction } = transactions;

  return swapTransaction;
}

export async function getParimutuelMarketTimeLeft(
  connection: Connection,
  parimutuelMarket: PublicKey
) {
  const parimutuelWeb3 = new ParimutuelWeb3(MAINNET_CONFIG, connection);
  const pariMarket = await parimutuelWeb3.getParimutuel(parimutuelMarket);
  const timeWindowStart = pariMarket.info.parimutuel.timeWindowStart.toNumber();
  const currentTime = new Date().getTime();
  return timeWindowStart - currentTime;
}

export async function getPlatformFeeAccounts(
  connection: Connection,
  feeAccountOwner: PublicKey
) {
  const _userTokens = await connection.getParsedTokenAccountsByOwner(
    feeAccountOwner,
    { programId: TOKEN_PROGRAM_ID }
  );

  const accounts = _userTokens.value.map((account) => {
    const publicKey = account.pubkey;
    const accountInfo = account.account.data.parsed.info;
    const mint = accountInfo.mint;
    const balance = accountInfo.tokenAmount.amount;

    return { publicKey, mint, balance };
  });

  const feeAccounts = accounts.filter((account) => account.mint === USDC_MINT);
  return feeAccounts;
}

export async function getCreateAccountInstruction(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  ATA: PublicKey
): Promise<TransactionInstruction | undefined> {
  try {
    // return null if account exists
    await getAccount(connection, ATA);
    return undefined;
  } catch (error: unknown) {
    return createAssociatedTokenAccountInstruction(payer, ATA, owner, mint);
  }
}
