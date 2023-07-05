import React, { useEffect, useState } from 'react';
import styles from './Pariswap.module.css';
import { Connection, PublicKey } from '@solana/web3.js';
import { getParimutuelMarketTimeLeft } from '../../utils';

interface TimerProps {
  connection: Connection;
  parimutuelMarket: string;
  setTimeUp: React.Dispatch<React.SetStateAction<boolean>>;
}
interface FormattedTimeProps {
  seconds: string | number;
  minutes: string | number;
  hours: string | number;
}

const Timer = ({ connection, parimutuelMarket, setTimeUp }: TimerProps) => {
  const [formattedTime, setFormattedTime] = useState<FormattedTimeProps>({
    seconds: '--',
    minutes: '--',
    hours: '--',
  });

  useEffect(() => {
    const formatTimeLeft = async () => {
      const timeLeft = await getParimutuelMarketTimeLeft(
        connection,
        new PublicKey(parimutuelMarket)
      );

      if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        setFormattedTime({
          seconds: seconds < 10 ? '0' + seconds : seconds,
          minutes: minutes < 10 ? '0' + minutes : minutes,
          hours: hours < 10 ? '0' + hours : hours,
        });
      } else {
        setTimeUp(true);
        setFormattedTime({
          seconds: '00',
          minutes: '00',
          hours: '00',
        });
      }
    };

    const intervalId = setInterval(() => formatTimeLeft(), 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.timer}>
      <p className={styles.timerTitle}>Starts in:</p>
      <p>
        <span>{formattedTime.hours}</span> :&nbsp;&nbsp;
        <span>{formattedTime.minutes}</span> :&nbsp;&nbsp;
        <span>{formattedTime.seconds}</span>
      </p>
    </div>
  );
};

export default Timer;
