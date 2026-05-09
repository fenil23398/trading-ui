## Trading UI

Crypto trading terminal UI built with:

- Next.js (App Router)
- Tailwind CSS
- TradingView Lightweight Charts
- Binance WebSocket market feeds
- wagmi + viem + Reown-ready wallet integration

## Getting Started

1) Install dependencies

```bash
yarn
```

2) Create env file

```bash
cp .env.example .env.local
```

3) Run dev server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

- `NEXT_PUBLIC_REOWN_PROJECT_ID`: enables WalletConnect/Reown connector
- `NEXT_PUBLIC_APP_URL`: wallet metadata app URL (default `http://localhost:3000`)

If `NEXT_PUBLIC_REOWN_PROJECT_ID` is empty, injected wallets still work when available (for example MetaMask in browser).
