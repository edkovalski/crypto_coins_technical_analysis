# Crypto Data Dashboard

A Next.js application for displaying cryptocurrency data and technical indicators.

## Features

- Real-time cryptocurrency data display
- Multiple timeframe support (1m, 5m, 15m, 30m, 1h, 4h, 1d)
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