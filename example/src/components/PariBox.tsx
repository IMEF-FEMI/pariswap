import { Connection } from '@solana/web3.js';
import { FC, useState } from 'react';
import {
  ParimutuelWeb3,
  MarketPairEnum,
  getMarketPubkeys,
  calculateNetOdd,
} from '@hxronetwork/parimutuelsdk';
import { useEffect } from 'react';
import { PariConfig } from './Config';
import PlacePositionBox from './PlacePositionBox';
import { useNetworkConfiguration } from '@/contexts/NetworkConfigurationProvider';
import { useJupiterApi } from '@/contexts/JupiterApiContext';

interface PariObj {
  longPool: any; // This is how much money is in the Long Pool of the contest
  shortPool: any; // This is how much money is in the Short Pool of the contest
  longOdds: string; // This is the weighted odds of the Long Pool
  shortOdds: string; // This is the weighted odds of the Short Pool
  pubkey: string; // This is the contest pubkey
}

const TimeInterval = [
  {
    interval: '1M',
    seconds: 60,
    title: '1 MINUTE',
  },
  {
    interval: '5M',
    seconds: 300,
    title: '5 MINUTE',
  },

  {
    interval: '15M',
    seconds: 900,
    title: '15 MINUTE',
  },

  {
    interval: '1H',
    seconds: 3600,
    title: '1 HOUR',
  },
  {
    interval: '1D',
    seconds: 86400,
    title: '1 DAY',
  },
];

export const PariBox: FC<{ time: string }> = (props) => {
  const { time } = props;
  const selectedTime = TimeInterval.filter((data) => data.interval === time);
  const timeSeconds = selectedTime[0].seconds;
  const timeTitle = selectedTime[0].title;

  const { networkConfiguration } = useNetworkConfiguration();

  let rpc = 'https://api.devnet.solana.com';

  if (networkConfiguration === 'mainnet-beta') {
    rpc = process.env.NEXT_PUBLIC_RPC_URL;
  }

  const connection = new Connection(rpc, 'confirmed');

  const [pariObj, setPariObj] = useState<PariObj>();
  const [countDownTime, setCountDownTime] = useState<string>('');

  const { config } = PariConfig;
  const parimutuelWeb3 = new ParimutuelWeb3(config, connection);

  const market = MarketPairEnum.BTCUSD;
  const markets = getMarketPubkeys(config, market);
  const marketsByTime = markets.filter(
    (market) => market.duration === timeSeconds
  );

// console.log("------------------------marketsByTime----------------------------------------", marketsByTime[0].duration);
  useEffect(() => {
    const getPariData = async () => {
      try {
        localStorage.clear();
        const parimutuels = await parimutuelWeb3.getParimutuels(marketsByTime);
// console.log("------------------------parimutuels----------------------------------------", parimutuels)

        const duration = marketsByTime[0].duration;

        const pari_markets = parimutuels.filter(
          (account) =>
            account.info.parimutuel.timeWindowStart.toNumber() > Date.now() &&
            account.info.parimutuel.timeWindowStart.toNumber() <
              Date.now() + duration * 1000
        );

        if (pari_markets.length > 0) {
          let longPool: any =
            pari_markets[0].info.parimutuel.activeLongPositions.toNumber() /
            1e6;
          let shortPool: any =
            pari_markets[0].info.parimutuel.activeShortPositions.toNumber() /
            1e6;

          const longOdds = calculateNetOdd(
            longPool,
            longPool + shortPool,
            0.03
          );
          const shortOdds = calculateNetOdd(
            shortPool,
            longPool + shortPool,
            0.03
          );
          const pubkey = pari_markets[0].pubkey.toString();
          const locksTime =
            pari_markets[0].info.parimutuel.timeWindowStart.toNumber();

          var formattedTime = '00:00:00';
          
          if (locksTime) {
            const currentTime = new Date().getTime();
            const timeDiff = locksTime - currentTime;
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor(
              (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
            );
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            formattedTime = `${hours < 10 ? '0' + hours : hours}:${
              minutes < 10 ? '0' + minutes : minutes
            }:${seconds < 10 ? '0' + seconds : seconds}`;
          }
          setCountDownTime(formattedTime);

          longPool = longPool.toFixed(2);
          shortPool = shortPool.toFixed(2);

          setPariObj({ longPool, shortPool, longOdds, shortOdds, pubkey });
        }
      } catch (error) {
        console.error(error);
      }
    };

    const intervalId = setInterval(() => getPariData(), 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      {pariObj && (
        <div
          style={{
            padding: 10,
            border: '1px solid white',
            borderRadius: '10px',
            boxSizing: 'border-box',
            width: '250px',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontWeight: 'bold',
              fontSize: '30px',
              marginBottom: '10px',
            }}
          >
            {timeTitle}
          </h1>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginRight: '5px',
              }}
            >
              <p style={{ color: 'white' }}>Long Pool:</p>
              <p style={{ color: 'white' }}>Short Pool:</p>
              <p style={{ color: 'white' }}>Long Odds:</p>
              <p style={{ color: 'white' }}>Short Odds:</p>
              <p style={{ color: 'white' }}>Starts In:</p>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginLeft: '5px',
              }}
            >
              <p style={{ color: 'white', fontWeight: 'bold' }}></p>
              <p style={{ color: 'white', fontWeight: 'bold' }}>
                {pariObj ? pariObj.longPool : '0'}
              </p>
              <p style={{ color: 'white', fontWeight: 'bold' }}>
                {pariObj ? pariObj.shortPool : '0'}
              </p>
              <p style={{ color: 'white', fontWeight: 'bold' }}>
                {pariObj ? pariObj.longOdds : '0'}
              </p>
              <p style={{ color: 'white', fontWeight: 'bold' }}>
                {pariObj ? pariObj.shortOdds : '0'}
              </p>
              <p style={{ color: 'white', fontWeight: 'bold' }}>
                {countDownTime}
              </p>
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <PlacePositionBox pubkey={pariObj ? pariObj.pubkey : 'Loading'} />
          </div>
        </div>
      )}
    </div>
  );
};
