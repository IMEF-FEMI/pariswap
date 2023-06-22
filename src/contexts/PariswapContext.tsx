import React from 'react';
import { FC, ReactNode, createContext, useContext, useState } from 'react';
import { TokenData } from '..';

export interface PariswapContextState {
  swappableTokenList: Array<TokenData>;
}

const PariswapApiContext = createContext<PariswapContextState>(
  {} as PariswapContextState
);

export const PariswapProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [swappableTokenList, setSwappableTokenList] = useState([]);

  return (
    <PariswapApiContext.Provider
      value={{
        swappableTokenList,
      }}
    >
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
