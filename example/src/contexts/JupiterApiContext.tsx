
import { useLocalStorage } from '@solana/wallet-adapter-react';

import {
  createContext, 
  FC,
  ReactNode, 
  useContext,
  useEffect,
  useState,
} from 'react';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
interface Route {
  amount: string;
  inAmount: string;
  marketInfos: any[];
  otherAmountThreshold: string;
  outAmount: string;
  priceImpactPct: number;
  slippageBps: number;
  swapMode: string;
}
export interface JupiterApiContextState {
  swappableTokenList: Array<{ [key: string]: any }>;
  getQuote: (amount: number, inputMint: string) => any;
  getSwapTransaction: (routes: Route[], wallet: string) => any;
}

export const JupiterApiContext = createContext<JupiterApiContextState>(
  {} as JupiterApiContextState
);

export function useJupiterApi(): JupiterApiContextState {
  return useContext(JupiterApiContext);
}

export const JupiterApiProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [swappableTokenList, setSwappableTokenList] = useState([]);

  useEffect(() => {
    (async () => {
      //fetch token list,
      let tokenList = await fetch('https://token.jup.ag/strict').then(
        (response) => response.json()
      );

      // retrieve indexed routed map
      const indexedRouteMap = await (
        await fetch('https://quote-api.jup.ag/v4/indexed-route-map')
      ).json();

      const getMint = (index) => indexedRouteMap['mintKeys'][index];
 
      // generate route map by replacing indexes with mint addresses
      var generatedRouteMap = {};
      Object.keys(indexedRouteMap['indexedRouteMap']).forEach((key, index) => {
        generatedRouteMap[getMint(key)] = indexedRouteMap['indexedRouteMap'][
          key
        ].map((index) => getMint(index));
      });

      const swappableOutputForUSDC = generatedRouteMap[USDC_MINT];
      const getIndexInUSDCSwappableOutput = (mint) =>
        swappableOutputForUSDC.indexOf(mint);

        tokenList = tokenList.filter(
        (token) => getIndexInUSDCSwappableOutput(token.address) != -1
      );
      setSwappableTokenList(tokenList);
      console.log(tokenList);

    })();
  }, []);

  async function getQuote(amount: number, inputMint: string) {
    console.log(amount * 1e6);
    console.log(Math.ceil(amount * 1e6));
 
    const { data } = await (
      await fetch(
        `https://quote-api.jup.ag/v4/quote?inputMint=${inputMint}&outputMint=${USDC_MINT}&amount=${Math.ceil(
          amount * 1e6
        )}&slippageBps=50&swapMode=ExactOut`
      )
    ).json();
    return data;
  }

  async function getSwapTransaction(routes: {}[], wallet: string) {
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
          // feeAccount: "fee_account_public_key"
        }),
      })
    ).json();

    const { swapTransaction } = transactions;

    return swapTransaction;
  }
  
  return (
    <JupiterApiContext.Provider
      value={{
        swappableTokenList,
        getQuote,
        getSwapTransaction,
      }}
    >
      {children}
    </JupiterApiContext.Provider>
  );
};
