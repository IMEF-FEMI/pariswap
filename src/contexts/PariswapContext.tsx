import React, { ChangeEvent, useEffect, useRef } from 'react';
import { FC, ReactNode, createContext, useContext, useState } from 'react';
import { fetchSwappableTokenList, getTokenValueInUSD } from '..';
import PariswapModal from '../components/ModalContainer/PariswapModal';
import { Connection, Keypair } from '@solana/web3.js';
import { PositionSideEnum, WalletSigner } from '@hxronetwork/parimutuelsdk';
import { TOKEN_PROGRAM_ID, NATIVE_MINT } from 'spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { TokenData, UserToken } from '../types';

export interface PariswapContextState {
  swappableTokenList: Array<TokenData>;
  placeBet(
    connection: Connection,
    wallet: WalletSigner | Keypair,
    betAmount: number,
    parimutuelMarket: string,
    side: PositionSideEnum,
    devUSDCATA?: string,
    devFeeBps?: number
  ): Promise<any>;
}

export const PariswapApiContext = createContext<PariswapContextState>(
  {} as PariswapContextState
);

export const PariswapProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [swappableTokenList, setSwappableTokenList] = useState<
    Array<TokenData>
  >([]);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [userTokens, setUserTokens] = useState<Array<UserToken>>();
  const [betAmount, setBetAmount] = useState<number>();
  const [parimutuelMarket, setParimutuelMarket] = useState<string>();
  const [side, setSide] = useState<PositionSideEnum>();
  const [devFeeBps, setDevFeeBps] = useState<number>(0);
  const [connection, setConnection] = useState<Connection>();
  const [wallet, setWallet] = useState<WalletContextState>();
  const [devUSDCATA, setDevUSDCATA] = useState<string>();
  const [txId, setTxId] = useState<string | undefined>(undefined);

  const onImportantStateChange = useRef<any>();

  useEffect(() => {
    fetchSwappableTokenList().then((tokens) => {
      setSwappableTokenList(tokens);
    });
  }, []);

  useEffect(() => {
    if (!onImportantStateChange.current) return;
    if (openPaymentModal === false) {
      onImportantStateChange.current(txId);
      onImportantStateChange.current = undefined;
    }
  }, [openPaymentModal]);

  async function placeBet(
    _connection: Connection,
    _wallet: WalletContextState,
    _betAmount: number,
    _parimutuelMarket: string,
    _side: PositionSideEnum,
    _devWallet?: string,
    _devFeeBps?: number
  ): Promise<any> {
    setTxId(undefined);

    const _userTokens = await _connection.getParsedTokenAccountsByOwner(
      _wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    // Extract the account data and balances
    const accounts = _userTokens.value.map((account) => {
      const publicKey = account.pubkey;
      const accountInfo = account.account.data.parsed.info;
      const mint = accountInfo.mint;
      const balance = accountInfo.tokenAmount.amount;

      return { publicKey, mint, balance };
    });
    const updatedTokenList = await Promise.all(
      swappableTokenList.map(async (token) => {
        if (token.address === NATIVE_MINT.toBase58()) {
          //SOL has to be handled differently
          //as exchanges only support wSOL and not SOL
          const balance = await _connection.getBalance(_wallet.publicKey);
          const usdValue = await getTokenValueInUSD(
            token.address,
            balance / 1e9
          );
          return { ...token, balance: balance / 1e9, usdValue };
        }
        const currentToken = accounts.filter(
          (userToken) => userToken.mint === token.address
        );
        if (currentToken.length > 0) {
          const balance =
            Number(currentToken[0].balance) / 10 ** token.decimals;
          const usdValue = await getTokenValueInUSD(token.address, balance);
          return { ...token, balance: balance.toFixed(5), usdValue };
        }

        return { ...token, balance: 0, usdValue: 0 };
      })
    );

    setSwappableTokenList(updatedTokenList);
    setConnection(_connection);
    setBetAmount(_betAmount);
    setParimutuelMarket(_parimutuelMarket);
    setSide(_side);
    setDevFeeBps(_devFeeBps);
    setDevUSDCATA(_devWallet);
    setUserTokens(accounts);
    setWallet(_wallet);

    return new Promise((resolve) => {
      onImportantStateChange.current = resolve;

      setOpenPaymentModal(true);
    });
  }

  return (
    <PariswapApiContext.Provider
      value={{
        swappableTokenList,
        placeBet,
      }}
    >
      {children}
      {openPaymentModal && (
        <PariswapModal
          swappableTokenList={swappableTokenList}
          setOpen={setOpenPaymentModal}
          setTxId={setTxId}
          userTokens={userTokens}
          betAmount={betAmount}
          parimutuelMarket={parimutuelMarket}
          devFeeBps={devFeeBps}
          wallet={wallet}
          devUSDCATA={devUSDCATA}
          side={side}
          connection={connection}
        />
      )}
    </PariswapApiContext.Provider>
  );
};

export function usePariswapApi(): PariswapContextState {
  const context = useContext(PariswapApiContext);

  if (!context) {
    throw new Error(
      'usePariswapApiContext must be used within a PariswapApiProvider'
    );
  }

  return context;
}
