import React, { ChangeEvent, useEffect } from 'react';
import { FC, ReactNode, createContext, useContext, useState } from 'react';
import { TokenData, fetchSwappableTokenList } from '..';
import '../pariswap.css';
import PariswapModal from '../components/ModalContainer/Modal';
export interface PariswapContextState {
  swappableTokenList: Array<TokenData>;
  placeBet(): void;
  handleInputChange(e: ChangeEvent<HTMLInputElement>): void;
}

export const PariswapApiContext = createContext<PariswapContextState>(
  {} as PariswapContextState
);

export const PariswapProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [swappableTokenList, setSwappableTokenList] = useState<
    Array<TokenData>
  >([]);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [inputValue, setInputValue] = useState<number>();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(Number(e.target.value));
  };

  useEffect(() => {
    fetchSwappableTokenList().then((tokens) => {
      setSwappableTokenList(tokens);
    });
  }, []);

  async function placeBet(): Promise<any> {
    setOpenPaymentModal(true);
  }
  async function anotherPlaceBet(): Promise<any> {
    setOpenPaymentModal(true);
  }
  return (
    <PariswapApiContext.Provider
      value={{
        swappableTokenList,
        placeBet,
        handleInputChange,
      }}
    >
      {openPaymentModal && (
        <PariswapModal
          swappableTokenList={swappableTokenList}
          setOpen={setOpenPaymentModal}
          inputValue={inputValue}
        />
      )}
      {children}
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
