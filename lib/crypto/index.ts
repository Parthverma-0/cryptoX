import crypto from 'crypto'
import { ethers } from 'ethers'

const rpcUrl = process.env.HELA_RPC_URL

if (!rpcUrl) {
  throw new Error('HELA_RPC_URL is not defined')
}

type Numberish = number | bigint

/**
 * helper function to remove 18 decimals from a number
 */
function removeDecimals(number: Numberish): number {
  return Number(number) / 10 ** 18
}

export async function getAccountBalances(privateKey: string): Promise<{
  hlusdBalance: number
}> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(privateKey)

  const hlusdBalance = await provider.getBalance(wallet.address, 'latest')

  return {
    hlusdBalance: removeDecimals(hlusdBalance),
  }
}

export function buildPrivateKey(): string {
  const id = crypto.randomBytes(32).toString('hex')
  const privateKey = `0x${id}`
  return privateKey
}

export function getAddressFromPrivateKey(privateKey: string): string {
  const wallet = new ethers.Wallet(privateKey)
  return wallet.address
}