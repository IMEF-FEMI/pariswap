import React, { useState } from 'react';
import CurrencyModal from './CurrencyModal';
import { MouseEventHandler } from 'react';
import Accordion from './Accordion';
import Timer from './Timer';
import { TokenData } from '../../utils';

interface ModalProps {
  setOpen: (value: boolean) => void;
  inputValue: number;
  swappableTokenList: TokenData[];
}

const PariswapModal = ({
  setOpen,
  inputValue,
  swappableTokenList,
}: ModalProps) => {
  const [openCurrencyModal, setOpenCurrencyModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const state = {
    symbol: 'USDC',
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  } as TokenData;

  const [selectedCoin, setSelectedCoin] = useState(state);

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

  const handleLoader = () => {
    setIsLoading(true);

    // Simulate an asynchronous operation
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="modalContainer">
      <div className="modalContent" onClick={handleCurrencyClose}>
        <div className="cancelBtn" onClick={handleClose}>
          <p>X</p>
        </div>

        <h1 className="title">Make Payment</h1>

        <p className="betValue">
          You're paying <span>{inputValue}</span> USDC
        </p>

        <Timer />

        <Accordion
          title="Breakdown of Payment"
          bettingAmount={inputValue}
          platformFee={0.001}
          swapFee={0.0001}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />

        <div className="currencyContainer">
          <div className="balanceContainer">
            <button className="currencyBtn" onClick={handleCurrencyModal}>
              <div className="imageContainer">
                <img
                  src={
                    selectedCoin?.logoURI
                      ? selectedCoin?.logoURI
                      : state?.logoURI
                  }
                  className=""
                  alt="selected coin logo"
                />
              </div>
              <p className="coinBtnName">
                {selectedCoin?.symbol ? selectedCoin?.symbol : state?.symbol}
              </p>
              <div
                className={`arrowDropDown ${openCurrencyModal ? 'open' : ''}`}
              ></div>
            </button>

            <div className="balance">
              <p className="balanceTitle">BAL:</p>
              <p>1000.001</p>
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

        <button className="proceedBtn" onClick={handleLoader}>
          {isLoading ? (
            <span className="loader"></span>
          ) : (
            'Proceed / Insufficient / Timeout'
          )}
        </button>

        <div className="poweredContainer">
          <p>Powered by pariswap.</p>
        </div>
      </div>
    </div>
  );
};

export default PariswapModal;
