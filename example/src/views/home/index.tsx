// Next, React
import { FC, useEffect } from 'react';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Store
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';

//Pari Box
import { PariBox } from '../../components/PariBox';

export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])

  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
          Parimutuel Protocol
        </h1>
        {wallet && <p className="text-center" >SOL Balance: {(balance || 0).toLocaleString()}</p>}
        <div className="text-center" style={{ alignContent: 'center' }}>
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mx-5 my-5 mb-5 md:mb-0"><PariBox time={'1M'} /></div>
            <div className="mx-5 my-5 mb-5 md:mb-0"><PariBox time={'5M'} /></div>
            <div className="mx-5 my-5 mb-5 md:mb-0"><PariBox time={'15M'} /></div>
            <div className="mx-5 my-5 mb-5 md:mb-0"><PariBox time={'1H'} /></div>
            <div className="mx-5 my-5 mb-5 md:mb-0"><PariBox time={'1D'} /></div>
          </div>
        </div>
      </div>
    </div>
  );
};


