import React from 'react';

interface AccordionProps {
  title: string;
  bettingAmount: number | undefined;
  platformFee: number | undefined;
  swapFee: number | undefined;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  bettingAmount,
  platformFee,
  swapFee,
  isOpen,
  setIsOpen,
}) => {
  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  const total =
    Number(bettingAmount ? bettingAmount : 0) +
    Number(platformFee) +
    Number(swapFee);

  return (
    <>
      <div className="paymentBreakdown" onClick={toggleAccordion}>
        <p>{title}</p>

        <div className={`arrowDropDown ${isOpen ? 'open' : ''}`}></div>
      </div>

      {isOpen && (
        <div className="accordionContent">
          <p>
            Betting amount:{' '}
            <span>{bettingAmount ? bettingAmount : 0} USDC</span>
          </p>
          <p>
            Platform fee: <span>{platformFee} USDC</span>
          </p>
          <p>
            Swap fee: <span>{swapFee} USDC</span>
          </p>
          <p>
            Total Amount: <span>{total} USDC</span>
          </p>
        </div>
      )}
    </>
  );
};

export default Accordion;
