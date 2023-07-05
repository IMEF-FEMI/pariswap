import React from 'react';
import styles from './Pariswap.module.css';

interface AccordionProps {
  title: string;
  betAmountMinusFees: number | undefined;
  devFee: number | undefined;
  betAmount: number | undefined;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  betAmountMinusFees,
  devFee,
  betAmount,
  isOpen,
  setIsOpen,
}) => {
  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className={styles.paymentBreakdown} onClick={toggleAccordion}>
        <p>{title}</p>

        <div
          className={`${styles.arrowDropDown} ${isOpen ? styles.open : ''}`}
        ></div>
      </div>

      {isOpen && (
        <div className={styles.accordionContent}>
          <p>
            Betting amount:{' '}
            <span>
              {betAmountMinusFees ? betAmountMinusFees.toFixed(3) : 0} USDC
            </span>
          </p>

          {devFee > 0 && (
            <p>
              Dev fee: <span>{devFee.toFixed(3)} USDC</span>
            </p>
          )}
          <p>
            Total: <span>{betAmount} USDC</span>
          </p>
        </div>
      )}
    </>
  );
};

export default Accordion;
