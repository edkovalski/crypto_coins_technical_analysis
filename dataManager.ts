import { fetchCandlestickData, fetchBinanceExchangeInfo, createWebSocketConnection, fetchGreedAndFearIndex } from './api';
import { calculateRSIForSymbol, calculateMACDForSymbol, calculateEMAForSymbol, calculateSMAForSymbol, calculateSMA200ForSymbol, calculateEMA200ForSymbol, checkEMA50200Crossover, checkSMA50200Crossover, calculateADXForSymbol, calculateVWAPForSymbol, calculateBollingerBands, calculateOBV, calculateFibonacciRetracement, checkSMA2050Crossover, checkEMA2050Crossover, calculateCMF, calculateIchimokuCloud, calculateATR, calculateStochastic } from './calculator';
import WebSocket from 'ws';

// Define the type for the data we'll be displaying
export interface RSIData {
    symbol: string;
    rsi: number | null;
    macd: {
        MACD: number | null;
        signal: number | null;
        histogram: number | null;
    };
    moving_averages: number;
    oscillators: number;
    sma10: number | null;
    sma20: number | null;
    sma50: number | null;
    sma100: number | null;
    sma200: number | null;
    isCrossoverSMA2050: boolean | null;
    isCrossoverSMA50200: boolean | null;
    ema10: number | null;
    ema20: number | null;
    ema50: number | null;
    ema100: number | null;
    ema200: number | null;
    isCrossoverEMA2050: boolean | null;
    isCrossoverEMA50200: boolean | null;
    price: number | null;
    timeframe: Timeframe;
    adx: {
        adx: number | null;
        plusDI: number | null;
        minusDI: number | null;
    };
    vwap: number | null;
    bollingerBands: {
        upper: number | null;
        middle: number | null;
        lower: number | null;
    };
    obv: {
        obv: number | null;
        obvSma: number | null;
    };
    fibonacci: {
        levels: {
            [key: string]: number | null;
            '0': number | null;
            '0.236': number | null;
            '0.382': number | null;
            '0.5': number | null;
            '0.618': number | null;
            '0.786': number | null;
            '1': number | null;
        };
        high: number | null;
        low: number | null;
    };
    cmf: number | null;
    ichimoku: {
        conversion: number | null;
        base: number | null;
        spanA: number | null;
        spanB: number | null;
        leadingSpanA: number | null;
        leadingSpanB: number | null;
    };
    atr: number | null;
    stochastic: {
        k: number | null;
        d: number | null;
    };
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export const ALL_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

type WsWebSocket = WebSocket;

// Cache for symbols to avoid repeated API calls
let symbolsCache: string[] | null = null;
let symbolsCacheExpiry: number = 0;
const SYMBOLS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const fetchBinanceSymbols = async (): Promise<string[]> => {
    const now = Date.now();

    // Return cached symbols if they're still valid
    if (symbolsCache && symbolsCacheExpiry > now) {
        return symbolsCache;
    }

    try {
        const exchangeInfo = await fetchBinanceExchangeInfo();
        if (exchangeInfo && exchangeInfo.symbols) {
            const usdtSymbols = exchangeInfo.symbols
                .filter(symbol =>
                    symbol.symbol.endsWith('USDT') &&
                    symbol.status === 'TRADING' &&
                    !symbol.symbol.includes('_') && // Exclude special pairs
                    !symbol.symbol.includes('DOWN') && // Exclude leveraged tokens
                    !symbol.symbol.includes('UP') &&
                    !symbol.symbol.includes('BULL') &&
                    !symbol.symbol.includes('BEAR')
                )
                .map(symbol => symbol.symbol);

            // Update cache
            symbolsCache = usdtSymbols;
            symbolsCacheExpiry = now + SYMBOLS_CACHE_DURATION;

            return usdtSymbols;
        }
        throw new Error('Invalid exchange info data');
    } catch (error) {
        console.error('Error fetching Binance symbols:', error);
        // Return basic symbols as fallback
        return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    }
};

export const fetchDataForSymbolAndTimeframe = async (symbol: string, timeframe: Timeframe, historicalData?: any[]): Promise<RSIData> => {
    try {
        // Use provided historical data or fetch new data
        const candlestickData = historicalData || await fetchCandlestickData(symbol, timeframe);
        if (!candlestickData || candlestickData.length < 2) {
            throw new Error('Insufficient candlestick data');
        }

        // Get the latest price from the last candlestick
        const lastCandle = candlestickData[candlestickData.length - 1];
        const price = Array.isArray(lastCandle) && lastCandle.length >= 6 ? parseFloat(lastCandle[4]) : null;

        // Calculate all indicators in parallel
        const [rsi, macd, smaResults, emaResults, adx, vwap, bollingerBands, obv, fibonacci, cmf, ichimoku, atr, stochastic] = await Promise.all([
            calculateRSIForSymbol(candlestickData),
            calculateMACDForSymbol(candlestickData),
            Promise.all([
                calculateSMAForSymbol(candlestickData, 10),
                calculateSMAForSymbol(candlestickData, 20),
                calculateSMAForSymbol(candlestickData, 50),
                calculateSMAForSymbol(candlestickData, 100),
                calculateSMA200ForSymbol(candlestickData)
            ]),
            Promise.all([
                calculateEMAForSymbol(candlestickData, 10),
                calculateEMAForSymbol(candlestickData, 20),
                calculateEMAForSymbol(candlestickData, 50),
                calculateEMAForSymbol(candlestickData, 100),
                calculateEMA200ForSymbol(candlestickData)
            ]),
            calculateADXForSymbol(candlestickData),
            calculateVWAPForSymbol(candlestickData),
            calculateBollingerBands(candlestickData),
            calculateOBV(candlestickData),
            calculateFibonacciRetracement(candlestickData),
            calculateCMF(candlestickData),
            calculateIchimokuCloud(candlestickData),
            calculateATR(candlestickData),
            calculateStochastic(candlestickData)
        ]);

        const [sma10, sma20, sma50, sma100, sma200] = smaResults;
        const [ema10, ema20, ema50, ema100, ema200] = emaResults;

        // Calculate crossovers in parallel
        const [isCrossoverSMA50200, isCrossoverEMA50200, isCrossoverSMA2050, isCrossoverEMA2050] = await Promise.all([
            checkSMA50200Crossover(candlestickData),
            checkEMA50200Crossover(candlestickData),
            checkSMA2050Crossover(candlestickData),
            checkEMA2050Crossover(candlestickData)
        ]);

        let oscillators = 0;
        let moving_averages = 0;
        // RSI check
        if (rsi <= 30) oscillators += 1;
        else if (rsi >= 70) oscillators -= 1;

        // MACD check
        if (macd.histogram > 0) oscillators += 1;
        else if (macd.histogram < 0) oscillators -= 1;

        // Efficient SMA/EMA calculations using arrays
        const indicators = [
            { value: sma10, price },
            { value: sma20, price },
            { value: sma50, price },
            { value: sma100, price },
            { value: sma200, price },
            { value: ema10, price },
            { value: ema20, price },
            { value: ema50, price },
            { value: ema100, price },
            { value: ema200, price },
        ];
        moving_averages += indicators.reduce((acc, { value, price }) =>
            value !== null ? (price! > value ? acc + 1 : acc - 1) : acc, 0);
        return {
            symbol,
            rsi,
            macd,
            sma10,
            sma20,
            sma50,
            sma100,
            sma200,
            isCrossoverSMA2050,
            isCrossoverSMA50200,
            moving_averages,
            oscillators,
            ema10,
            ema20,
            ema50,
            ema100,
            ema200,
            isCrossoverEMA2050,
            isCrossoverEMA50200,
            price,
            timeframe,
            adx,
            vwap,
            bollingerBands,
            obv,
            fibonacci,
            cmf,
            ichimoku,
            atr,
            stochastic
        };
    } catch (error) {
        console.error(`Error fetching data for ${symbol} ${timeframe}:`, error);
        throw error;
    }
};

export const createWebSocket = (symbols: string[], onMessage: (data: any) => void, onError: (error: any) => void): WsWebSocket | null => {
    return createWebSocketConnection(symbols, onMessage, onError);
};

export const fetchGreedFear = async (): Promise<number | null> => {
    try {
        const index = await fetchGreedAndFearIndex();
        return index;
    } catch (error) {
        console.error('Error fetching Greed and Fear Index:', error);
        return null;
    }
};
