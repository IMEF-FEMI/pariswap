import React, { useState } from 'react';
import { TokenData } from '../../types';
import styles from './Pariswap.module.css';

interface CurrencyModalProps {
  swappableTokenList: TokenData[];
  handleClick: React.MouseEventHandler<HTMLElement>;
  setOpenCurrencyModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCoin: React.Dispatch<React.SetStateAction<TokenData>>;
}

const CurrencyModal = ({
  swappableTokenList,
  handleClick,
  setOpenCurrencyModal,
  setSelectedCoin,
}: CurrencyModalProps) => {
  const [filter, setFilter] = useState('');

  const truncateName = (name: any) => {
    if (name.length <= 8) {
      return name;
    }
    return name.slice(0, 8) + '...';
  };

  const truncateAddress = (address: any) => {
    if (address.length <= 6) {
      return address;
    }
    const firstThree = address.slice(0, 3);
    const lastThree = address.slice(-3);
    return `${firstThree}...${lastThree}`;
  };

  const handleFilterChange = (event: any) => {
    setFilter(event.target.value);
  };

  const filteredCoins = swappableTokenList.filter((coin) => {
    const nameMatch = coin.name.toLowerCase().includes(filter.toLowerCase());
    const addressMatch = coin.address
      .toLowerCase()
      .includes(filter.toLowerCase());
    return nameMatch || addressMatch;
  });

  const handleCoinClick = (coin: any) => {
    setSelectedCoin(coin);
    setOpenCurrencyModal(false);
  };

  return (
    <div className={styles.currencyModal} onClick={handleClick}>
      <div className={styles.currencyContainers}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by token or paste address"
            value={filter}
            onChange={handleFilterChange}
          />
          <button
            className={styles.closeInput}
            onClick={() => setOpenCurrencyModal(false)}
          >
            X
          </button>
        </div>
      </div>
      <div className={styles.coinContainer}>
        {filteredCoins.map((coin, index) => (
          <div
            className={styles.coinContent}
            key={index}
            onClick={() => handleCoinClick(coin)}
          >
            <div className={styles.imageContainer}>
              <img src={coin.logoURI} alt="" />
            </div>
            <div className={styles.rightCoin}>
              <div className={styles.topContent}>
                <p className={styles.symbol}>{coin.symbol}</p>
                <p>{truncateAddress(coin.address)}</p>
              </div>
              <p className={styles.coinName}>{truncateName(coin.name)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CurrencyModal;
