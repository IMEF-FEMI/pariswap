import {
  ParimutuelWeb3,
  PositionSideEnum,
  WalletSigner,
} from '@hxronetwork/parimutuelsdk';

import {
  AddressLookupTableAccount,
  Connection,
  PublicKey, 
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { Dispatch, FC, SetStateAction, useCallback, useState } from 'react';
import { notify } from '@/utils/notifications';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react'; 
import { PariConfig } from './Config';
import { useJupiterApi } from '@/contexts/JupiterApiContext';
import { getBalance } from '@/utils/helpers'; 
import { useNetworkConfiguration } from '@/contexts/NetworkConfigurationProvider';
import { AnchorProvider as SolanaProvider } from '@project-serum/anchor';

const PaymentDialog: FC<{
  pariPubkey: string;
  side: PositionSideEnum;
  amount: string;
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  connection: Connection;
}> = (props) => {
  const { side, amount, pariPubkey, showModal, setShowModal } = props;
  const { publicKey, signTransaction } = useWallet();

  const { config } = PariConfig;

  const { networkConfiguration } = useNetworkConfiguration();

  let rpc = 'https://api.devnet.solana.com';

  if (networkConfiguration === 'mainnet-beta') {
    rpc = process.env.NEXT_PUBLIC_RPC_URL;
  }

  const connection = new Connection(rpc, 'confirmed');

  const wallet = useWallet();
  const parimutuelWeb3 = new ParimutuelWeb3(config, connection);
  const anchorWallet = useAnchorWallet();

  const getSolanaWalletProvider = async () => {
    if (!anchorWallet) {
      return null;
    }

    const provider = new SolanaProvider(connection, anchorWallet, {
      skipPreflight: true,
    });

    return provider;
  };

  const { swappableTokenList, getQuote, getSwapTransaction } = useJupiterApi();

  //search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToken, setSelectedToken] = useState<{
    address: string;
    chainId: number;
    decimals: number;
    logoURI: string;
    name: string;
    symbol: string;
  }>();

  const [filteredOptions, setFilteredOptions] = useState([]);

  const handleInputChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);

    const filtered = swappableTokenList.filter((option) =>
      option.name.toLowerCase().includes(newSearchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  };

  const placePosition = useCallback(
    async (amount: string, pariPubkey: string) => {
      if (!publicKey) {
        notify({ type: 'error', message: 'Wallet not connected!' });
        console.error('Send Transaction: Wallet not connected!');
        return;
      }

      const provider = await getSolanaWalletProvider();

      let transactionId = '';

      try {
        const balanceOfUSDC = await getBalance(
          connection,
          publicKey,
          false,
          new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
        );

        const amountOfUSDCToBuy = Number(amount);

        if (amountOfUSDCToBuy > 0) {
          const routes = await getQuote(
            amountOfUSDCToBuy,
            selectedToken.address
          );

          const swapTransaction = await getSwapTransaction(
            routes,
            publicKey.toBase58()
          );

          console.log(swapTransaction);

          // deserialize the transaction
          const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
          var transaction =
            VersionedTransaction.deserialize(swapTransactionBuf);

          // get address lookup table accounts
          const addressLookupTableAccounts = await Promise.all(
            transaction.message.addressTableLookups.map(async (lookup) => {
              return new AddressLookupTableAccount({
                key: lookup.accountKey,
                state: AddressLookupTableAccount.deserialize(
                  await connection
                    .getAccountInfo(lookup.accountKey)
                    .then((res) => {
                      return res.data;
                    })
                ),
              });
            })
          );
          // decompile transaction message and add transfer instruction
          var message = TransactionMessage.decompile(transaction.message, {
            addressLookupTableAccounts: addressLookupTableAccounts,
          });

          let placePositionIx =
            await parimutuelWeb3.getPlacePositionInstruction(
              wallet as WalletSigner,
              new PublicKey(pariPubkey),
              parseFloat(amount) * 1e6,
              side,
              Date.now()
            );
          message.instructions.push(...placePositionIx);

          // compile the message and update the transaction
          transaction.message = message.compileToV0Message(
            addressLookupTableAccounts
          );

          // sign the transaction
          // transactionId = await provider.sendAndConfirm(transaction);
        }

        // if (transactionId) {
        //   console.log(`Transaction: ${transactionId}`);
        //   notify({
        //     type: 'success',
        //     message: `Placed ${
        //       side === PositionSideEnum.LONG ? 'LONG' : 'SHORT'
        //     } Position`,
        //     txid: transactionId,
        //   });
        // }
        // setShowModal(false);
      } catch (error) {
        notify({
          type: 'error',
          message: 'Transaction failed!',
          description: error.message,
          txid: transactionId,
        });
        console.error(`Transaction failed! ${error.message}`, transactionId);
        setShowModal(false);
        return;
      }
    },
    [publicKey, notify, connection, signTransaction]
  );

  return showModal ? (
    <>
      <div className=" justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
        <div className="relative w-full my-6 mx-auto max-w-3xl">
          {/*content*/}
          <div className=" border-0 rounded-lg shadow-lg relative flex flex-col  bg-white outline-none focus:outline-none">
            {/*header*/}
            <div className="flex items-start justify-between p-5 border-b border-solid border-slate-200 rounded-t">
              <h3 className="text-3xl font-semibold text-black">
                Make payment
              </h3>
              <button
                className="p-1 ml-auto bg-transparent border-0 text-black bg-white  float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedToken(null);
                  setShowModal(false);
                }}
              >
                <h3 className="bg-transparent text-black  h-6 w-6 text-2xl block outline-none focus:outline-none">
                  ×
                </h3>
              </button>
            </div>
            {/*body*/}
            <div className="relative p-6 flex-auto">
              <p className="my-4 text-slate-500 text-lg leading-relaxed">
                {side === PositionSideEnum.LONG ? 'LONG' : 'SHORT'} {amount}{' '}
                USDC?
              </p>
              <p className="my-4 text-slate-500 text-lg leading-relaxed">
                Make payment with
              </p>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleInputChange}
                  className="w-full p-2 border text-slate-500 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {filteredOptions.length > 0 && (
                  <ul className="absolute left-0 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-md">
                    {filteredOptions.map((option) => (
                      <li
                        key={option.address}
                        className="px-4 py-2 cursor-pointer text-slate-500 hover:bg-gray-100"
                        onClick={() => {
                          setSelectedToken(option);
                          setFilteredOptions([]);
                          setSearchTerm(option.symbol);
                        }}
                      >
                        {option.symbol}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {/*footer*/}
            <div className="flex items-center justify-end p-6 border-t border-solid border-slate-200 rounded-b">
              <button
                className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedToken(null);
                  setShowModal(false);
                }}
              >
                Close
              </button>
              <button
                className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={() => placePosition(amount, pariPubkey)}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
    </>
  ) : null;
};
export default PaymentDialog;
