## Pariswap Documentation

Welcome to the Pariswap documentation! This guide will provide you with all the information you need to integrate Pariswap, a dev tool built on top of the Hxro Parimutuel Protocol, into your application. Pariswap allows users to place bets or positions using any SPL token they hold.
---

![PlaceBet Popup](/images/sc.png)
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
   - `PariswapProvider`
5. Additional Resources
   - Support
   - Examples

---

### 1. Introduction
Pariswap is a development tool that extends the functionality of the Hxro Parimutuel Protocol. It enables developers to build applications that allow users to participate in peer-to-peer, floating strike options with a pool-based, parimutuel payoff. This means that users can deposit funds into pools representing different outcomes and receive a pro-rata distribution of the total funds in the winning pool.

Pariswap is built on the Solana blockchain and can be accessed using the `@hxronetwork/parimutuelsdk` library. It provides a set of functions and a React hook component to simplify the integration process.

### 2. Getting Started

#### Installation
To get started with Pariswap, you need to install the required dependencies:

```bash
npm install @hxronetwork/parimutuelsdk or yarn add @hxronetwork/parimutuelsdk
```

then install pariswap 

```
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
This function retrieves a versioned transaction for placing a position in a parimutuel market.

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
This function fetches a list of tokens swappable with USDC. It returns only validated tokens, excluding unknown and banned tokens.

```typescript
async function fetchSwappableTokenList(): Promise<TokenData[]>
```

Returns a promise that resolves to an array of `TokenData` objects representing the swappable tokens.

### 4. React Hook Component
Pariswap provides a

 React hook component, `PariswapProvider`, that simplifies the integration process by handling the necessary context and state management.

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

#### Usage Example
To use the Pariswap React hook component, follow these steps:

1. Import the required dependencies:
```typescript
import { USDC_MINT, usePariswapApi } from 'pariswap';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
```

2. Initialize the necessary variables and contexts:
```typescript
const wallet = useWallet();
const rpc = process.env.NEXT_PUBLIC_RPC_URL;
const connection = new Connection(rpc, {
  commitment: 'confirmed',
});
const devAcct = 'your_dev_wallet';
```

3. Obtain the dev USDC associated token address:
```typescript
const devUSDCATA = await getAssociatedTokenAddress(
  new PublicKey(USDC_MINT),
  new PublicKey(devAcct)
);
```

4. Place a bet using the `placeBet` function from the `usePariswapApi` hook:
```typescript
placeBet(
  connection,
  wallet,
  Number(amount),
  parimutuelMarket,
  PositionSideEnum.LONG,
  devUSDCATA.toBase58(),
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
```

### 5. Additional Resources

#### Support
If you have any questions or need assistance with Pariswap, feel free to reach out to me on [Twitter](https://www.twitter.com/femi_0x)

#### Examples
To explore more examples and usage scenarios, please refer to the [Pariswap Examples repository](https://github.com/IMEF-FEMI/pariswap/tree/main/example).

#### Note: Swap Fee
Please note that Pariswap charges a 0.5% swap fee on all swap transactions. This fee is automatically deducted from the transaction amount.



That's it! You should now have a good understanding of how to integrate Pariswap into your application. Happy coding!