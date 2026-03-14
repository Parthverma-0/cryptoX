import { ethers } from 'ethers'

import {
  User,
  getAddressByPhoneNumber,
  getUserFromPhoneNumber,
  getUserFromId,
} from 'lib/user'
import { supabase } from '../../lib/supabase'
import { getContract, getProvider } from '.'

const rpcUrl = process.env.HELA_RPC_URL

if (!rpcUrl) {
  throw new Error('HELA_RPC_URL is not defined')
}

type Status =
  | 'ADDRESS_PENDING'
  | 'AMOUNT_PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'ERROR'

type PaymentRequest = {
  id: string
  createdAt: string
  fromUserId: string
  to: string
  toUserId: string
  status: Status
  amount: number | null
}

export type Address = string
export type PhoneNumber = string

// ─── Payment Requests (on-chain) ────────────────────────────────────────────

export async function makePaymentRequest({
  fromUserId,
  to,
  amount,
}: {
  fromUserId: string
  to: Address | PhoneNumber | null
  amount: number | null
}): Promise<PaymentRequest> {
  // Store payment request in Supabase for stateful flow tracking
  // (on-chain confirmation happens at sendHlusdFromWallet step)
  const paymentRequest = (await supabase.from('payment_requests').insert({
    status: 'ADDRESS_PENDING',
    amount,
    from_user_id: fromUserId,
    to: to,
  })) as unknown as PaymentRequest

  return paymentRequest
}

export async function sendHlusdFromWallet({
  tokenAmount,
  toAddress,
  privateKey,
  fromAddress,
}: {
  tokenAmount: number
  toAddress: string
  privateKey: string
  fromAddress: string
}) {
  try {
    const provider = getProvider()
    const wallet = new ethers.Wallet(privateKey, provider)

    const amountInWei = ethers.parseEther(String(tokenAmount))

    // 1. Send actual HLUSD on-chain
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountInWei,
    })
    await tx.wait()

    // 2. Record payment request on smart contract
    const contract = getContract(wallet)
    const contractTx = await contract.createPaymentRequest(toAddress, amountInWei)
    await contractTx.wait()

    return tx
  } catch (error) {
    const isInsufficientFunds = (error as Error).message.includes(
      'insufficient funds',
    )

    if (isInsufficientFunds) {
      throw new Error('Insufficient HLUSD balance to complete this transaction')
    }

    throw error
  }
}

// ─── Payment Request State (Supabase for flow tracking) ─────────────────────

export async function getUserPaymentRequests(
  userId: string,
): Promise<PaymentRequest[]> {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('from_user_id', userId)

  if (error) {
    throw new Error('Error getting user payment requests')
  }

  return data.map(
    ({ id, created_at, from_user_id, status, amount, to_user_id, to }) => ({
      id,
      createdAt: created_at,
      fromUserId: from_user_id,
      toUserId: to_user_id,
      status,
      to,
      amount,
    }),
  )
}

export async function isReceiverInputPending(userId: string) {
  const paymentRequests = await getUserPaymentRequests(userId)
  return paymentRequests.some(
    (paymentRequest) => paymentRequest.status === 'ADDRESS_PENDING',
  )
}

export async function getRecipientAddressFromUncompletedPaymentRequest(
  userId: string,
): Promise<string> {
  const paymentRequests = await getUserPaymentRequests(userId)
  const pendingPaymentRequest = paymentRequests.find(
    (paymentRequest) => paymentRequest.status === 'AMOUNT_PENDING',
  )
  if (!pendingPaymentRequest) {
    throw new Error('No pending payment requests found')
  }
  return pendingPaymentRequest.to
}

export async function getReceiverUserFromUncompletedPaymentRequest(
  userId: string,
): Promise<User | null> {
  const paymentRequests = await getUserPaymentRequests(userId)
  const pendingPaymentRequest = paymentRequests.find(
    (paymentRequest) => paymentRequest.status === 'AMOUNT_PENDING',
  )
  if (!pendingPaymentRequest) {
    throw new Error('No pending payment requests found')
  }
  const { toUserId } = pendingPaymentRequest
  if (!toUserId) return null
  return getUserFromId(toUserId)
}

export async function isUserAwaitingAmountInput(userId: string) {
  const paymentRequests = await getUserPaymentRequests(userId)
  return paymentRequests.some(
    (paymentRequest) => paymentRequest.status === 'AMOUNT_PENDING',
  )
}

export async function addReceiverToPayment({
  userId,
  receiver,
}: {
  userId: string
  receiver: string
}) {
  const isAddress = ethers.isAddress(receiver)
  const receiverUser = await getUserFromPhoneNumber(receiver)

  if (!isAddress && !receiverUser) {
    throw new Error(
      `Invalid recipient, must be a valid address or phone number of a registered user ${JSON.stringify(
        receiver,
      )}`,
    )
  }

  const receiverAddress = isAddress
    ? receiver
    : await getAddressByPhoneNumber(receiver)

  await supabase
    .from('payment_requests')
    .update({
      to: receiverAddress,
      to_user_id: receiverUser?.id || null,
      status: 'AMOUNT_PENDING',
    })
    .eq('from_user_id', userId)
    .eq('status', 'ADDRESS_PENDING')

  return receiverUser?.name || receiver
}

export async function confirmPaymentRequest({
  userId,
  amount,
}: {
  userId: string
  amount: number
}) {
  await supabase
    .from('payment_requests')
    .update({
      amount,
      status: 'CONFIRMED',
    })
    .eq('from_user_id', userId)
    .eq('status', 'AMOUNT_PENDING')
}

export async function cancelPaymentRequest(userId: string) {
  await supabase
    .from('payment_requests')
    .update({
      status: 'CANCELLED',
    })
    .eq('from_user_id', userId)
    .neq('status', 'CONFIRMED')
    .neq('status', 'CANCELLED')
    .neq('status', 'ERROR')
}

export async function updatePaymentRequestToError(userId: string) {
  await supabase
    .from('payment_requests')
    .update({
      status: 'ERROR',
    })
    .eq('from_user_id', userId)
    .eq('status', 'AMOUNT_PENDING')
}

// ─── Explorer ────────────────────────────────────────────────────────────────

export function getHelaScanUrlForAddress(address: string) {
  return `https://testnet-scanner.helachain.com/address/${address}`
}