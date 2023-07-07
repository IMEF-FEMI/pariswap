import React, { useState, MouseEventHandler, useEffect } from 'react';
import CurrencyModal from './CurrencyModal';
import Accordion from './Accordion';
import Timer from './Timer';
import { USDC_MINT } from '../../utils';
import styles from './Pariswap.module.css';
import { PositionSideEnum } from '@hxronetwork/parimutuelsdk';
import { Connection } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getPlacePositionTransaction } from '../../instructions';
import { TokenData, UserToken } from '../../types';

interface ModalProps {
  setOpen(value: boolean): void;
  setTxId: React.Dispatch<React.SetStateAction<string>>;
  swappableTokenList: TokenData[];
  wallet: WalletContextState;
  userTokens: UserToken[];
  betAmount: number;
  parimutuelMarket: string;
  side: PositionSideEnum;
  devUSDCATA?: string;
  devFeeBps?: number;
  connection: Connection;
}

const PariswapModal = ({
  connection,
  wallet,
  side,
  setOpen,
  setTxId,
  betAmount,
  swappableTokenList,
  devUSDCATA,
  devFeeBps,
  parimutuelMarket,
}: ModalProps) => {
  const totalWDecimals = betAmount * 1e6;
  const devFee =
    devFeeBps && devUSDCATA ? (totalWDecimals * (devFeeBps / 10_000)) / 1e6 : 0;

  const betAmountMinusFees = betAmount - devFee;

  const [openCurrencyModal, setOpenCurrencyModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  const [selectedCoin, setSelectedCoin] = useState(
    swappableTokenList.filter((token) => token.address === USDC_MINT)[0]
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleCurrencyModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    setOpenCurrencyModal(() => !openCurrencyModal);
  };

  const handleCurrencyClose = () => {
    setOpenCurrencyModal(false);
  };

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleLoader = async () => {
    setIsLoading(true);
    try {
      const placeBetIx = await getPlacePositionTransaction(
        connection,
        wallet,
        selectedCoin.address,
        betAmount,
        parimutuelMarket,
        side,
        devUSDCATA,
        devFeeBps
      );
      const signedTx = await wallet.signTransaction(placeBetIx);
      const txId = await connection.sendTransaction(signedTx);
      setTxId(txId);
      setOpen(false);
    } catch (error) {
      console.log(error);
    }

    setIsLoading(false);
  };

  const actionButtonText = () => {
    if (timeUp) return 'TIME-UP';
    if (selectedCoin.usdValue < betAmount) return 'INSUFFICIENT FUNDS';
    return 'PROCEED';
  };

  return (
    <div className={styles.modalContainer}>
      <div className={styles.modalContent} onClick={handleCurrencyClose}>
        <div className={styles.cancelBtn} onClick={handleClose}>
          <p>X</p>
        </div>

        <h1 className={styles.title}>Make Payment</h1>

        <p className={styles.betValue}>
          You're paying <span>{betAmount}</span> USDC
        </p>

        <Timer
          connection={connection}
          parimutuelMarket={parimutuelMarket}
          setTimeUp={setTimeUp}
        />

        <Accordion
          title="Breakdown"
          betAmountMinusFees={betAmountMinusFees}
          devFee={devFee}
          betAmount={betAmount}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />

        <div className={styles.currencyContainer}>
          <div className={styles.balanceContainer}>
            <button
              className={styles.currencyBtn}
              onClick={handleCurrencyModal}
            >
              <div className={styles.imageContainer}>
                <img
                  src={
                    selectedCoin?.logoURI
                      ? selectedCoin?.logoURI
                      : selectedCoin?.logoURI
                  }
                  alt="selected coin logo"
                />
              </div>
              <p className={styles.coinBtnName}>
                {selectedCoin?.symbol
                  ? selectedCoin?.symbol
                  : selectedCoin?.symbol}
              </p>
              <div
                className={`${styles.arrowDropDown} ${
                  openCurrencyModal ? styles.open : ''
                }`}
              ></div>
            </button>

            <div className={styles.balance}>
              <p className={styles.balanceTitle}>
                {selectedCoin?.balance ?? 0}
              </p>
              <p>${selectedCoin.usdValue?.toFixed(2) ?? 0}</p>
            </div>
          </div>

          {openCurrencyModal && (
            <CurrencyModal
              swappableTokenList={swappableTokenList}
              handleClick={handleClick}
              setOpenCurrencyModal={setOpenCurrencyModal}
              setSelectedCoin={setSelectedCoin}
            />
          )}
        </div>

        <button
          className={
            timeUp || selectedCoin.usdValue < betAmount
              ? styles.insufficientFundsBtn
              : styles.proceedBtn
          }
          onClick={handleLoader}
          disabled={timeUp || selectedCoin.usdValue < betAmount}
        >
          {isLoading ? (
            <span className={styles.loader}></span>
          ) : (
            actionButtonText()
          )}
        </button>

        <div className={styles.poweredContainer}>
          <p>Powered by pariswap.</p>
        </div>
      </div>
    </div>
  );
};

export default PariswapModal;
