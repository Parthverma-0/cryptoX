# CryptoX 🔗

> A WhatsApp-native crypto wallet powered by Hela Chain — send, receive, and manage HLUSD without ever leaving your chat.

---

## What is CryptoX?

CryptoX is a conversational crypto wallet that lives entirely inside WhatsApp. No app to download, no browser to open, no seed phrases to memorize. Just message the bot and you're in.

Built on **Hela Chain** with **HLUSD** as the native currency, CryptoX makes decentralized payments as simple as sending a text message. It automatically creates a non-custodial wallet for every new user, tied to their phone number.

---

## How it works

1. **Register** — Send any message to the bot. If you're new, it creates a Hela Chain wallet linked to your phone number instantly.
2. **Deposit** — The bot gives you your wallet address. Send HLUSD to it from any Hela Chain compatible wallet.
3. **Send money** — Type a recipient's phone number or wallet address, enter the amount, and the transaction is sent on-chain.
4. **Check balance** — Hit "Check balance" and the bot fetches your live HLUSD balance directly from the blockchain.

All of this happens through natural WhatsApp button interactions — no commands to memorize.

```
User sends "hello"
    → Bot checks if user exists in DB
    → If new: generates private key, derives wallet address, stores in Supabase
    → If existing: shows menu (Deposit / Send / Balance)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Messaging | WhatsApp Cloud API (Meta) |
| Backend | Node.js + TypeScript + Vercel Serverless Functions |
| Blockchain | Hela Chain (EVM, Chain ID 8668) |
| Currency | HLUSD (native currency of Hela Chain) |
| Wallet | ethers.js v6 |
| Database | Supabase (PostgreSQL) |
| Tunnel (dev) | Cloudflare Tunnel |

---

## Setup & installation

### Prerequisites

- Node.js 18+
- A Meta Developer account with WhatsApp Cloud API access
- A Supabase project
- A Hela Chain RPC endpoint

### 1. Clone the repo

```bash
git clone https://github.com/Parthverma-0/cryptoX.git
cd cryptoX
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
META_WA_ACCESS_TOKEN=your_meta_access_token
WA_BUSSINESS_PHONE_NUMBER=your_whatsapp_business_number
META_WA_WABA_ID=your_waba_id
META_WA_SENDER_PHONE_NUMBER_ID=your_phone_number_id
META_WA_VERIFY_TOKEN=your_verify_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
HELA_RPC_URL=https://mainnet-rpc.helachain.com
```

### 3. Set up the database

Run the following in your Supabase SQL editor:

```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  private_key TEXT,
  address TEXT
);

CREATE TABLE payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  "to" TEXT,
  amount TEXT,
  status TEXT
);
```

### 4. Run locally

```bash
npm run start
```

### 5. Expose your local server

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Copy the generated URL and set it as your webhook in the Meta Developer Console under **WhatsApp → Configuration → Webhook URL**:

```
https://your-tunnel-url.trycloudflare.com/api/whatsapp
```

---

## Screenshots

<img src="https://github.com/user-attachments/assets/8d93e07d-3007-4958-901e-15647adb4c74" width="300"/>

<img src="https://github.com/user-attachments/assets/14a18707-86f6-4de8-a62d-c377840c01c6" width="300"/>

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repo
2. Create a new branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m "add your feature"`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Built by Parth Verma and Raghav Arora with ❤️

CryptoX was built as a hackathon project exploring the intersection of conversational interfaces and decentralized finance on Hela Chain.
