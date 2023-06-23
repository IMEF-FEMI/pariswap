import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { FC, useCallback, useEffect, useState } from 'react';
import { notify } from '../utils/notifications';
import {
  ParimutuelWeb3,
  PositionSideEnum,
  WalletSigner,
} from '@hxronetwork/parimutuelsdk';
import { PariConfig } from './Config';
import PaymentDialog from './PaymentDialog';
import { getBalance } from '@/utils/helpers';
import { useNetworkConfiguration } from '@/contexts/NetworkConfigurationProvider';
import { usePariswapApi } from 'pariswap';

const PlacePosition: FC<{
  pariPubkey: string;
  side: PositionSideEnum;
  amount: string;
}> = (props) => {
  const { publicKey, signTransaction } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const { networkConfiguration } = useNetworkConfiguration();
  const wallet = useWallet();
  const ddd = usePariswapApi();

  let rpc = 'https://api.devnet.solana.com';

  if (networkConfiguration === 'mainnet-beta') {
    rpc = process.env.NEXT_PUBLIC_RPC_URL;
  }

  const connection = new Connection(rpc, 'confirmed');

  const { config } = PariConfig;
  const parimutuelWeb3 = new ParimutuelWeb3(config, connection);

  const { pariPubkey, side, amount } = props;

  useEffect(() => {}, [pariPubkey]);

  const bgGradientClass =
    side === PositionSideEnum.LONG
      ? 'bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-teal-500 hover:to-indigo-500'
      : 'bg-gradient-to-r from-pink-500 to-yellow-500 hover:from-yellow-500 hover:to-pink-500';

  return (
    <div>
      <PaymentDialog
        amount={amount}
        pariPubkey={pariPubkey}
        setShowModal={setShowModal}
        showModal={showModal}
        side={side}
        connection={connection}
      />

      <button
        className={`group w-60 m-2 btn disabled:animate-none bg-gradient-to-r ${bgGradientClass} ...`}
        onClick={async () => {
          if (!publicKey) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            console.error('Send Transaction: Wallet not connected!');
            return;
          }
          const balanceOfUSDC = await getBalance(
            connection,
            publicKey,
            false,
            new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
          );

          // if (balanceOfUSDC >= Number(amount)) {
          //   await parimutuelWeb3.placePosition(
          //     wallet as WalletSigner,
          //     new PublicKey(pariPubkey),
          //     parseFloat(amount) * (10 ** 6 / 1),
          //     side,
          //     Date.now()
          //   );
          // } else {
          //   setShowModal(true);
          // }

          console.log(ddd);
        }}
        disabled={amount === '0'}
      >
        <div className="hidden group-disabled:block ">Enter Amount...</div>
        <span className="block group-disabled:hidden">
          {amount} USDC {side === PositionSideEnum.LONG ? 'LONG' : 'SHORT'}
        </span>
      </button>
    </div>
  );
};

export default PlacePosition;
