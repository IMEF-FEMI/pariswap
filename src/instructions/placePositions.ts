import {
  MAINNET_CONFIG,
  ParimutuelWeb3,
  PositionSideEnum,
  WalletSigner,
} from '@hxronetwork/parimutuelsdk';
import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  SWAP_FEE_WALLET,
  USDC_MINT,
  getCreateAccountInstruction,
  getExactInQuote,
  getExactOutQuote,
  getSwapTransaction,
  getTokenPrice,
} from '../utils';
import {
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from 'spl-token';
import { TokenData } from '../types';

/**
 * Retrieves a versioned transaction for placing a position in a parimutuel market.
 *
 * @param {Connection} connection - The connection object for interacting with Solana blockchain.
 * @param {WalletSigner | Keypair} wallet - The wallet used for signing the transaction.
 * @param {string} inputTokenAddress - The mint address of the token the user wants to use.
 * @param {number} amount - The amount in USD to be placed for the Bet.
 * @param {string} parimutuelMarket - The parimutuel market where the position will be placed.
 * @param {PositionSideEnum} side - The side of the position (e.g., PositionSideEnum.LONG orPositionSideEnum.SHORT).
 * @param {string} [devUsdcATA] - An Optional dev USDC ATA address (should be already initialized).
 * @param {number} [devFeeBps=0] - Optional developer fee basis points (e.g. 50 for 0.5%, 100 for 1% ... 10000 for 100%).
 * @returns {Promise<VersionedTransaction>} - A promise that resolves to the versioned transaction.
 */
export async function getPlacePositionTransaction(
  connection: Connection,
  wallet: WalletSigner | Keypair,
  inputTokenAddress: string,
  amount: number,
  parimutuelMarket: string,
  side: PositionSideEnum,
  devUsdcATA?: string,
  devFeeBps: number = 0
): Promise<VersionedTransaction> {
  amount = amount * 1e6;

  const userUsdcATA = await getAssociatedTokenAddressSync(
    new PublicKey(USDC_MINT),
    wallet.publicKey
  );
  if (inputTokenAddress === USDC_MINT) {
    await ensureAccountHasBeenInitialized(connection, userUsdcATA);

    const balance = await connection.getTokenAccountBalance(userUsdcATA);
    if (Number(balance.value.amount) < amount) {
      throw new Error('Insufficient funds');
    }

    return await getPlacePositionTransactionWithoutSwap(
      connection,
      wallet,
      amount,
      parimutuelMarket,
      side,
      devUsdcATA,
      devFeeBps
    );
  } else {
    return await getPlacePositionTransactionWithSwap(
      connection,
      wallet,
      inputTokenAddress,
      amount,
      parimutuelMarket,
      side,
      devUsdcATA,
      devFeeBps
    );
  }
}
async function getPlacePositionTransactionWithoutSwap(
  connection: Connection,
  wallet: WalletSigner | Keypair,
  amount: number,
  parimutuelMarket: string,
  side: PositionSideEnum,
  devUsdcATA?: string,
  devFeeBps: number = 0
): Promise<VersionedTransaction> {
  const parimutuelWeb3 = new ParimutuelWeb3(MAINNET_CONFIG, connection);

  const devFee = amount * (devFeeBps / 10_000);
  const betAmount = amount - devFee;

  const instructions: TransactionInstruction[] = [];

  //HANDLE DEV FEE TRANSFER
  if (devUsdcATA && devFeeBps > 0) {
    const userUsdcATA = await getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      wallet.publicKey
    );

    const transferInstruction = createTransferInstruction(
      userUsdcATA,
      new PublicKey(devUsdcATA),
      wallet.publicKey,
      devFee,
      []
    );
    //transfer fee to dev wallet instruction
    instructions.push(transferInstruction);
  }

  let placePositionIx = await parimutuelWeb3.getPlacePositionInstruction(
    wallet as WalletSigner,
    new PublicKey(parimutuelMarket),
    betAmount,
    side,
    Date.now()
  );
  instructions.push(...placePositionIx);

  //convert to VersionedTransaction
  //
  // Fetch Latest Blockhash
  let latestBlockhash = await connection.getLatestBlockhash('confirmed');

  //Generate Transaction Message
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

async function getPlacePositionTransactionWithSwap(
  connection: Connection,
  wallet: WalletSigner | Keypair,
  inputTokenAddress: string,
  amount: number,
  parimutuelMarket: string,
  side: PositionSideEnum,
  devUsdcATA?: string,
  devFeeBps: number = 0
): Promise<VersionedTransaction> {
  const parimutuelWeb3 = new ParimutuelWeb3(MAINNET_CONFIG, connection);

  //get quote routes
  const exactOutRoutes = await getExactOutQuote(amount, inputTokenAddress);
  if (exactOutRoutes.length > 0) {
    return getPlacePositionTransactionWithSwapExactOut(
      connection,
      parimutuelWeb3,
      wallet,
      exactOutRoutes,
      amount,
      parimutuelMarket,
      side,
      devUsdcATA,
      devFeeBps
    );
  } else {
    return getPlacePositionTransactionWithSwapExactIn(
      connection,
      parimutuelWeb3,
      wallet,
      inputTokenAddress,
      amount,
      parimutuelMarket,
      side,
      devUsdcATA,
      devFeeBps
    );
  }
}

async function getPlacePositionTransactionWithSwapExactIn(
  connection: Connection,
  parimutuelWeb3: ParimutuelWeb3,
  wallet: WalletSigner | Keypair,
  inputTokenAddress: string,
  amount: number,
  parimutuelMarket: string,
  side: PositionSideEnum,
  devUsdcATA?: string,
  devFeeBps: number = 0
) {
  const devFee = amount * (devFeeBps / 10_000);
  const betAmount = amount - devFee;

  //price
  const tokenPrice = await getTokenPrice(inputTokenAddress);
  const amountOfInput = amount / tokenPrice;
  const padding = (amount / tokenPrice) * 0.05;
  // console.log(Math.ceil(amountOfInput + padding));
  const routes = await getExactInQuote(
    Math.ceil(amountOfInput + padding),
    inputTokenAddress
  );

  const swapTransaction = await getSwapTransaction(
    routes,
    wallet.publicKey.toBase58(),
    'ExactIn'
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

  //HANDLE DEV FEE TRANSFER
  if (devUsdcATA && devFeeBps > 0) {
    const userUsdcATA = await getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      wallet.publicKey
    );

    const transferInstruction = createTransferInstruction(
      userUsdcATA,
      new PublicKey(devUsdcATA),
      wallet.publicKey,
      devFee,
      []
    );

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

  return transaction;
}
async function getPlacePositionTransactionWithSwapExactOut(
  connection: Connection,
  parimutuelWeb3: ParimutuelWeb3,
  wallet: WalletSigner | Keypair,
  routes: any[],
  amount: number,
  parimutuelMarket: string,
  side: PositionSideEnum,
  devUsdcATA?: string,
  devFeeBps: number = 0
) {
  const devFee = amount * (devFeeBps / 10_000);
  const betAmount = amount - devFee;

  //get swap instruction
  const swapTransaction = await getSwapTransaction(
    routes,
    wallet.publicKey.toBase58(),
    'ExactOut'
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

  //add instruction to create fee ATA if none exists
  const feeATA = getAssociatedTokenAddressSync(
    new PublicKey(routes[0].marketInfos[0].inputMint),
    new PublicKey(SWAP_FEE_WALLET)
  );
  const feeATACreateInstruction = await getCreateAccountInstruction(
    connection,
    wallet.publicKey,
    new PublicKey(routes[0].marketInfos[0].inputMint),
    new PublicKey(SWAP_FEE_WALLET),
    feeATA
  );
  if (feeATACreateInstruction) {
    message.instructions.unshift(feeATACreateInstruction);
  }
  //HANDLE DEV FEE TRANSFER
  if (devUsdcATA && devFeeBps > 0) {
    const userUsdcATA = await getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      wallet.publicKey
    );

    const transferInstruction = createTransferInstruction(
      userUsdcATA,
      new PublicKey(devUsdcATA),
      wallet.publicKey,
      devFee,
      []
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

  return transaction;
}

async function ensureAccountHasBeenInitialized(
  connection: Connection,
  account: PublicKey
) {
  try {
    return await connection.getAccountInfo(account);
  } catch (error) {
    throw new Error('Account Has not been initialized');
  }
}
