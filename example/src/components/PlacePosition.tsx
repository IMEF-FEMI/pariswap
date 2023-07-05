import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { FC, useEffect, useState } from 'react';
import { notify } from '../utils/notifications';
import { PositionSideEnum } from '@hxronetwork/parimutuelsdk';
import { useNetworkConfiguration } from '@/contexts/NetworkConfigurationProvider';
import { USDC_MINT, usePariswapApi } from 'pariswap';
import { getAssociatedTokenAddress } from 'spl-token';

const PlacePosition: FC<{
  pariPubkey: string;
  side: PositionSideEnum;
  amount: string;
}> = (props) => {
  const { publicKey } = useWallet();
  const { networkConfiguration } = useNetworkConfiguration();
  const wallet = useWallet();
  const { placeBet } = usePariswapApi();

  let rpc = 'https://api.devnet.solana.com';

  if (networkConfiguration === 'mainnet-beta') {
    rpc = process.env.NEXT_PUBLIC_RPC_URL;
  }

  const connection = new Connection(rpc, {
    commitment: 'confirmed',
  });

  const { pariPubkey, side, amount } = props;

  useEffect(() => {}, [pariPubkey]);

  const bgGradientClass =
    side === PositionSideEnum.LONG
      ? 'bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-teal-500 hover:to-indigo-500'
      : 'bg-gradient-to-r from-pink-500 to-yellow-500 hover:from-yellow-500 hover:to-pink-500';

  return (
    <div>
      <button
        className={`group w-60 m-2 btn disabled:animate-none bg-gradient-to-r ${bgGradientClass} ...`}
        onClick={async () => {
          if (!publicKey) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            console.error('Send Transaction: Wallet not connected!');
            return;
          }
          const devAcct = "9Fpz8XkTmyqMMGUYgZZFxrPPwSryLJNJDp7nxf29Dm7g"
          const devUSDCATA = await getAssociatedTokenAddress(
            new PublicKey(USDC_MINT),
            new PublicKey(devAcct)
          )
          placeBet(
            connection,
            wallet,
            Number(amount),
            pariPubkey,
            side,
            devUSDCATA.toBase58(),
            50
          ).then((txId) => {
            if (txId) {
              console.log(`https://explorer.solana.com/tx/${txId}`);
              notify({
                type: 'success',
                message: `Placed ${
                  side === PositionSideEnum.LONG ? 'LONG' : 'SHORT'
                } Position`,
                txid: txId,
              });
            }
          });
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
