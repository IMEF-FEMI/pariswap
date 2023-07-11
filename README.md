
## Pariswap Documentation

Welcome to the Pariswap documentation! This guide will provide you with all the information you need to integrate Pariswap, a dev tool built on top of the Hxro Parimutuel Protocol, into your application. Pariswap allows users to place bets or positions using any SPL token they hold, while developers can take fees in a single transaction. Pariswap also takes advantage of versioned transactions in Solana, ensuring efficiency and scalability in transaction processing.

---
![PlaceBet Popup](/placebet_screenshot.png)
---

### Table of Contents
1. Introduction
2. Getting Started
   - Installation
   - Usage Requirements
3. API Reference
   - `getPlacePositionTransaction`
   - `fetchSwappableTokenList`
4. React Hook Component
   - `usePariswapApi`
   - `PariswapProvider`
5. Usage Examples
   - Placing a Position
   - Using the React Hook Component
6. Additional Resources
   - Support
   - Examples

---

### 1. Introduction
Pariswap is a development tool that enhances the capabilities of the Hxro Parimutuel Protocol. With Pariswap, developers can create applications that enable users to engage in peer-to-peer, floating strike options. These options have a pool-based, parimutuel payoff, allowing users to deposit funds into pools representing various outcomes. When a winning outcome is determined, users receive a pro-rata distribution of the total funds in the winning pool.

Built on the Solana blockchain, Pariswap offers seamless integration through the @hxronetwork/parimutuelsdk library. This library provides a range of functions and a React hook component, simplifying the integration process for developers.

### 2. Getting Started

#### Installation
To get started with Pariswap, you need to install the required dependencies:

```bash
npm install @hxronetwork/parimutuelsdk or yarn add @hxronetwork/parimutuelsdk
```

Then, install Pariswap:

```bash
npm install pariswap or yarn add pariswap 
```

#### Usage Requirements
Before using Pariswap, ensure you have the following prerequisites:
- Knowledge of Solana blockchain and smart contract development.
- A Solana wallet and connection to a Solana network.
- Basic understanding of the Hxro Parimutuel Protocol.

### 3. API Reference
This section provides an overview of the available functions in the Pariswap API.

#### `getPlacePositionTransaction`
The `getPlacePositionTransaction` function retrieves a versioned transaction for placing a position in a parimutuel market. It can be used independently without the React hook component.

```typescript
async function getPlacePositionTransaction(
  connection: Connection,
  wallet: WalletSigner | Keypair,
  inputTokenAddress: string,
  amount: number,
  parimutuelMarket: string,
  side: PositionSideEnum,
  devUsdcATA?: string,
  devFeeBps: number = 0,
): Promise<VersionedTransaction>
```

- `connection`: The connection object for interacting with the Solana blockchain.
- `wallet`: The wallet used for signing the transaction.
- `inputTokenAddress`: The mint address of the token the user wants to use.
- `amount`: The amount in USD to be placed for the bet.
- `parimutuelMarket`: The parimutuel market where the position will be placed.
- `side`: The side of the position (e.g., `PositionSideEnum.LONG` or `PositionSideEnum.SHORT`).
- `devUsdcATA` (optional): An optional dev USDC ATA address (should be already initialized).
- `devFeeBps` (optional): Optional developer fee basis points (e.g., 50 for 0.5%, 100 for 1%, 10000 for 100%).

Returns a promise that resolves to the versioned transaction.

#### `fetchSwappableTokenList`
The `fetchSwappableTokenList` function is a helper function that fetches a list of tokens swappable with USDC. It returns only validated tokens, excluding unknown and banned tokens.

```typescript
async function fetchSwappableTokenList(): Promise<TokenData[]>
```

Returns a promise that resolves to an array of `TokenData` objects representing the swappable tokens.

### 4. React Hook Component
Pariswap provides a React hook component and a provider component to simplify the integration process.

#### `usePariswapApi`
The `usePariswapApi` hook provides a convenient way to access the Pariswap API functions within a React component.

```typescript
import { usePariswapApi } from 'pariswap';

function YourComponent() {
  const { placeBet, fetchSwappableTokenList } = usePariswapApi();
  // Your component code...
}
```

#### `PariswapProvider`
The `PariswapProvider` component wraps your main React component and provides the necessary context for using Pariswap.

```typescript
import { PariswapProvider } from 'pariswap';

function App() {
  return (
    <PariswapProvider>
      <YourContainerComponentOrMainContainer />
    </PariswapProvider>
  );
}

export default App;
```

Ensure that the `PariswapProvider` component is placed at the root level of your application.

### 5. Usage Examples

#### Placing a Position
The following example demonstrates how to use the `getPlacePositionTransaction` function to place a position in a parimutuel market.

```typescript
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';

import {
  ParimutuelWeb3,
  MarketPairEnum,
  PositionSideEnum,
  getMarketPubkeys,
  MAINNET_CONFIG,
} from '@hxronetwork/parimutuelsdk';

import

 { getAssociatedTokenAddressSync } from "@solana/spl-token";

const user = Keypair.generate();
const dev = Keypair.generate();
const devFeeBps = 50; // 0.50 percent
const betAmount = 1;

const config = MAINNET_CONFIG;
const desiredSeconds = 60; // 1 minute
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

// Dev USDC Account (must've been initialized)
const devUsdcATA = await getAssociatedTokenAddressSync(
  new PublicKey(USDC_MINT),
  dev.publicKey
);

const placeBetTransaction = await getPlacePositionTransaction(
  connection,
  user,
  "So11111111111111111111111111111111111111112",
  betAmount,
  pubkey,
  side,
  devUsdcATA.toBase58(),
  devFeeBps
);

placeBetTransaction.sign([user]);
const txId = await connection.sendTransaction(placeBetTransaction);
console.log(`https://explorer.solana.com/tx/${txId}`);
```

#### Using the React Hook Component
The following example demonstrates how to use the `placeBet` function from the `usePariswapApi` hook to place a bet using the React hook component approach.

```typescript
import { usePariswapApi } from 'pariswap';
import { useWallet } from '@solana/wallet-adapter-react';

function YourComponent() {
  const { placeBet } = usePariswapApi();
  const wallet = useWallet();
  const amount = 1;
  const parimutuelMarket = 'parimutuel-market-address';

  const handlePlaceBet = async () => {
    // Dev USDC Account (must've been initialized)
    const devUsdcATA = await getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      dev.publicKey
    );

    placeBet(
      connection,
      wallet,
      amount,
      parimutuelMarket,
      PositionSideEnum.LONG,
      devUsdcATA.toBase58(),
      50 // 0.5% developer fee
    ).then((txId) => {
      if (txId) {
        console.log(`https://explorer.solana.com/tx/${txId}`);
        notify({
          type: 'success',
          message: `Placed ${
            side === PositionSideEnum.LONG ? 'LONG' : 'SHORT'
          } Position`,
          txid: txId,
        });
      }
    });
  };

  // Your component code...

  return (
    <div>
      <button onClick={handlePlaceBet}>Place Bet</button>
    </div>
  );
}
```

### 6. Additional Resources

#### Support
If you have any questions or need assistance with Pariswap, feel free to reach out to me on [Twitter](https://www.twitter.com/femi_0x).

#### Examples
To explore more examples and usage scenarios, please refer to the [Pariswap Examples repository](https://github.com/IMEF-FEMI/pariswap/tree/main/example).

---

That's it! You should now have a good understanding of how to integrate Pariswap into your application. Happy coding!