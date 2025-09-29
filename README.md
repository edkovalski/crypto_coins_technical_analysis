# Crypto Data Dashboard

A **Node.js + TypeScript** application that fetches live market data from Binance, computes a suite of technical indicators, caches the results in Redis, and serves them through a REST API, Server-Sent Events (SSE) stream, and a lightweight vanilla-JS dashboard located in `public/`.

---

## Key Features

• **Real-time price feed** – `/ws` SSE endpoint pushes ticks to the browser with sub-second latency.
• **Indicator snapshots** – `/data/:symbol` returns RSI, MACD, EMA/SMA, ATR, ADX, Ichimoku, Stochastic, OBV for 1 h / 4 h / 1 d / 1 w timeframes.
• **Historical/back-testing** – `/historical-data/:symbol?timestamp=<ms>` calculates indicators using historic candles so you can verify your strategies.
• **Smart Redis cache** – tunable TTL, background refresh, and force update on startup keep responses fast while respecting Binance rate limits.
• **Typed from top to bottom** – written in TypeScript for reliability, with strict mode enabled.
• **Zero build step** – run directly with `ts-node`; no JavaScript files are emitted.

---

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/symbols` | List all tradeable Binance symbols the server knows about |
| GET | `/data/:symbol` | Latest indicator snapshot (cached) for the symbol |
| GET | `/historical-data/:symbol?timestamp=MS` | Indicators calculated on candles ending at the given UNIX ms timestamp |
| GET | `/ws` | Server-Sent Events stream with `{ symbol, price }` objects |

All responses are JSON except `/ws` which is text/event-stream.

---

## Project Layout

```
app_ti/
├── server.ts           # Express entry point & routing
├── dataManager.ts      # Fetch + indicator calculation logic
├── api.ts              # Binance HTTP helper functions
├── public/             # Static dashboard (HTML/CSS/JS)
│   ├── index.html
│   ├── js/app.js
│   └── css/styles.css
├── package.json        # Dependencies & npm scripts
└── tsconfig.json       # TypeScript compiler options
```

---

## Getting Started

### Prerequisites

* **Node.js** ≥ 18
* **Redis** ≥ 6 running locally on `redis://localhost:6379`

### Install

```bash
git clone https://github.com/edkovalski/crypto_coins_technical_analysis.git
cd app_ti
npm install
```

### Run (dev mode)

```bash
npx ts-node server.ts            # quickest
# OR add a script then:
npm run dev                      # preferred
```

The server listens on <http://localhost:3000>. Open `public/index.html` in your browser (or serve `/` from Express) to view the dashboard.

---

## Configuration

Fine-tune cache behaviour in `server.ts` via the `CACHE_CONFIG` object:

```ts
const CACHE_CONFIG = {
  INDICATOR_TTL: 300,   // seconds
  SIGNAL_TTL: 120,
  UPDATE_THRESHOLD: 60, // refresh if < 1 min left
  BACKGROUND_UPDATE: true,
  FORCE_UPDATE_ON_START: true
} as const;
```

Environment variables can override Redis URL (`REDIS_URL`) and server port (`PORT`).

---

## Development Tips

1. **Type Safety** – run `npx tsc --noEmit` for a type-check only pass.
2. **Linting** – integrate ESLint + Prettier if desired.
3. **Testing** – Jest is a good fit for unit-testing indicator functions.

---

## License

MIT © 2025 Your Name


A Next.js application for displaying cryptocurrency data and technical indicators.

## Features

- Real-time cryptocurrency data display
- Multiple timeframe support (1h, 4h, 1d)
- Technical indicators:
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - Stochastic Oscillator
  - Ichimoku Cloud
  - ATR (Average True Range)
  - EMAs (Exponential Moving Averages)
  - SMAs (Simple Moving Averages)
  - OBV (On-Balance Volume)
  - ADX (Average Directional Index)
- Search functionality
- Responsive design

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/crypto-dashboard-nextjs.git
   cd crypto-dashboard-nextjs
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `src/app`: Next.js app router pages and API routes
- `src/components`: React components
- `src/types`: TypeScript type definitions
- `src/utils`: Utility functions

## API Integration

The application currently uses mock data for demonstration purposes. To integrate with a real API:

1. Update the `src/app/api/symbols/route.ts` file to fetch data from your backend.
2. Ensure the data structure matches the `SymbolData` interface defined in `src/types/index.ts`.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
