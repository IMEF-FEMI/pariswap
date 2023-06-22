
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token"
import { Connection, PublicKey } from "@solana/web3.js"


export const getBalance = async (connection: Connection, owner: PublicKey, isNative = false, tokenMint: PublicKey) => {
    if (isNative) {
        const userBalance = await connection.getBalance(owner)
        return toUIAmount(userBalance, 9)
    } else {
        const userATA = await getATA(connection, tokenMint, owner,)
        if (userATA) {
            const userBalance = await connection.getTokenAccountBalance(userATA.address)
            return Number(userBalance.value.uiAmount);
        }
        return 0;
    }
}


export const getATA = async (connection, tokenMint, owner) => {
    const userATA = await getAssociatedTokenAddress(
        tokenMint,
        owner,
        true
    )

    let account;
    try {
        account = await getAccount(connection, userATA,);
    } catch (error) {

    }
    // if getAccount throws error, send null
    //meaning user does not have that token
    return account;
}
export const fromUIAmount = (amount, decimals) => Number(amount) * 10 ** decimals
export const toUIAmount = (amount, decimals) => Number(amount) / (10 ** decimals)