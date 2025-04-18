// signalCalculator.ts
import { bollingerbands } from 'technicalindicators';
import {
    fetchBinanceSymbols,
    fetchDataForSymbolAndTimeframe,
    RSIData,
    Timeframe,
} from './dataManager';
import { createClient } from 'redis';

const redisClient = createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('error', (err: any) => console.error('Redis error:', err));

// Connect to Redis
redisClient.connect().catch(err => console.error('Failed to connect to Redis in signalCalculator:', err));

const BATCH_SIZE = 200; // Process 10 symbols at a time
const CACHE_EXPIRY = 300; // Cache for 5 minutes

export interface SignalData {
    symbol: string;
    timeframe: Timeframe;
    moving_averages: number;
    oscillators: number;
    signal: 'Buy' | 'Sell' | 'trending';
    price: number | null;
    rsi: number | null;
    macd: {
        MACD: number | null;
        signal: number | null;
        histogram: number | null;
    };
    sma10: number | null;
    sma20: number | null;
    sma50: number | null;
    sma100: number | null;
    sma200: number | null;
    isCrossoverSMA2050: boolean | null;
    isCrossoverEMA2050: boolean | null;
    isCrossoverSMA50200: boolean | null;
    isCrossoverEMA50200: boolean | null;

    ema10: number | null;
    ema20: number | null;
    ema50: number | null;
    ema100: number | null;
    ema200: number | null;
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
    };
    atr: number | null;
    stochastic: {
        k: number | null;
        d: number | null;
    };
}

async function processBatch(symbols: string[], timeframe: Timeframe): Promise<SignalData[]> {
    const batchSignals: SignalData[] = [];

    // Process all symbols in the batch concurrently
    const promises = symbols.map(async (symbol): Promise<SignalData | null> => {
        try {
            // Try to get from cache first
            const cachedData = await redisClient.get(`indicator:${symbol}:${timeframe}`);
            let data: RSIData;

            if (cachedData) {
                data = JSON.parse(cachedData);
            } else {
                data = await fetchDataForSymbolAndTimeframe(symbol, timeframe);
                // Cache with expiry
                await redisClient.set(`indicator:${symbol}:${timeframe}`, JSON.stringify(data), {
                    EX: CACHE_EXPIRY
                });
            }

            if (!data || data.price === null || data.rsi === null || data.macd.histogram === null || data.obv.obv === null || data.obv.obvSma === null) {
                return null;
            }
            // if ((data.bollingerBands.upper! - data.bollingerBands.lower!) / data.bollingerBands.lower! * 100 > 5) {
            //     return null;
            // }

            let oscillators = 0;
            let moving_averages = 0;

            // RSI check
            if (data.rsi <= 30) oscillators += 1;
            else if (data.rsi >= 70) oscillators -= 1;

            // MACD check
            if (data.macd.histogram > 0) oscillators += 1;
            else if (data.macd.histogram < 0) oscillators -= 1;

            // ADX check - add points for strong trend
            if (data.adx.adx !== null && data.adx.adx > 25) {
                // If +DI is above -DI, it's a bullish trend
                if (data.adx.plusDI !== null && data.adx.minusDI !== null && data.adx.plusDI > data.adx.minusDI) {
                    oscillators += 1;
                }
            }

            // VWAP check - add points if price is above VWAP
            if (data.vwap !== null && data.price !== null) {
                if (data.price > data.vwap) {
                    oscillators += 1;
                }
            }

            // Bollinger Bands check
            if (data.bollingerBands.lower !== null && data.bollingerBands.middle !== null && data.price !== null) {
                // Add points if price is near or below lower band (potential oversold)
                if (data.price <= data.bollingerBands.lower) {
                    oscillators += 1;
                }
                // Add points if price is above middle band (bullish momentum)
                else if (data.price > data.bollingerBands.middle) {
                    oscillators += 1;
                }
            }

            // OBV check
            if (data.obv.obv !== null && data.obv.obvSma !== null) {
                // Add points if OBV is above its SMA (bullish volume trend)
                if (data.obv.obv > data.obv.obvSma) {
                    oscillators += 1;
                }
            }

            // Fibonacci Retracement check
            const fibLevels = ['0', '0.236', '0.382', '0.5', '0.618', '0.786', '1'];
            for (const level of fibLevels) {
                const fibValue = data.fibonacci.levels[level as keyof typeof data.fibonacci.levels];
                if (fibValue !== null && Math.abs(data.price - fibValue) < data.price * 0.001) {
                    oscillators += 2;
                    break;
                }
            }

            // Efficient SMA/EMA calculations using arrays
            const indicators = [
                { value: data.sma10, price: data.price },
                { value: data.sma20, price: data.price },
                { value: data.sma50, price: data.price },
                { value: data.sma100, price: data.price },
                { value: data.sma200, price: data.price },
                { value: data.ema10, price: data.price },
                { value: data.ema20, price: data.price },
                { value: data.ema50, price: data.price },
                { value: data.ema100, price: data.price },
                { value: data.ema200, price: data.price },
            ];

            moving_averages += indicators.reduce((acc, { value, price }) =>
                value !== null ? (price > value ? acc + 1 : acc - 1) : acc, 0);

            if (data.isCrossoverEMA2050 == true) { moving_averages += 1 } else { moving_averages -= 1 }
            if (data.isCrossoverEMA50200 == true) { moving_averages += 1 } else { moving_averages -= 1 }
            if (data.isCrossoverSMA2050 == true) { moving_averages += 1 } else { moving_averages -= 1 }
            if (data.isCrossoverSMA50200 == true) { moving_averages += 1 } else { moving_averages -= 1 }
            // Determine signal based on multiple conditions
            let signal: 'Buy' | 'Sell' | 'trending' | null = null;

            // Buy signal conditions
            if (
                data.macd.histogram > 0 &&
                data.price < data.bollingerBands.middle!
                && data.rsi <= 1


            ) {
                signal = 'Buy';
            }
            // Sell signal conditions
            else if (
                data.price > data.bollingerBands.middle! && data.price < data.bollingerBands.upper!
                && data.rsi >= 99
            ) {
                signal = 'Sell';
            }
            else if (
                moving_averages > 12 && data.rsi < 60 && data.macd.histogram > 0

            ) {
                signal = 'trending';
            }
            // Only return if we have a valid signal
            if (signal) {
                return {
                    symbol: data.symbol,
                    timeframe,
                    moving_averages,
                    oscillators,
                    signal,
                    price: data.price,
                    rsi: data.rsi,
                    macd: data.macd,
                    sma10: data.sma10,
                    sma20: data.sma20,
                    sma50: data.sma50,
                    sma100: data.sma100,
                    sma200: data.sma200,
                    ema10: data.ema10,
                    ema20: data.ema20,
                    ema50: data.ema50,
                    ema100: data.ema100,
                    ema200: data.ema200,
                    isCrossoverEMA2050: data.isCrossoverEMA2050,
                    isCrossoverSMA2050: data.isCrossoverSMA2050,
                    isCrossoverEMA50200: data.isCrossoverEMA50200,
                    isCrossoverSMA50200: data.isCrossoverSMA50200,
                    adx: data.adx,
                    vwap: data.vwap,
                    bollingerBands: data.bollingerBands,
                    obv: data.obv,
                    fibonacci: data.fibonacci,
                    cmf: data.cmf,
                    ichimoku: data.ichimoku,
                    atr: data.atr,
                    stochastic: data.stochastic
                };
            }

            return null;
        } catch (error) {
            console.error(`Error processing ${symbol}:`, error);
            return null;
        }
    });

    const results = await Promise.all(promises);
    const filteredResults = results.filter((signal): signal is SignalData => signal !== null);
    return filteredResults;
}

export const calculateBuySignals = async (timeframe: Timeframe): Promise<SignalData[]> => {
    const symbols = await fetchBinanceSymbols();
    const allSignals: SignalData[] = [];

    // Process symbols in batches
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNumber} of ${totalBatches}`);
        const batchSignals = await processBatch(batch, timeframe);
        allSignals.push(...batchSignals);
    }

    return allSignals;
};

type SignalType = 'BUY' | 'SELL' | 'NEUTRAL';

interface Signal {
    type: SignalType;
    strength: number;
    timestamp: string;
    price: number;
    indicators: {
        rsi: number | null;
        macd: {
            MACD: number | null;
            signal: number | null;
            histogram: number | null;
        };
        sma: {
            sma10: number | null;
            sma20: number | null;
            sma50: number | null;
            sma100: number | null;
            sma200: number | null;
        };
        ema: {
            ema10: number | null;
            ema20: number | null;
            ema50: number | null;
            ema100: number | null;
            ema200: number | null;
        };
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
            };
        };
        cmf: number | null;
        ichimoku: {
            conversion: number | null;
            base: number | null;
            spanA: number | null;
            spanB: number | null;
        };
        atr: number | null;
        stochastic: {
            k: number | null;
            d: number | null;
        };
    };
}

export const generateSignal = (data: RSIData): Signal => {
    const {
        rsi,
        macd,
        sma10,
        sma20,
        sma50,
        sma100,
        sma200,
        ema10,
        ema20,
        ema50,
        ema100,
        ema200,
        price,
        adx,
        vwap,
        bollingerBands,
        obv,
        fibonacci,
        cmf,
        ichimoku,
        atr,
        stochastic
    } = data;

    if (!price || !rsi || !macd.MACD || !macd.signal || !macd.histogram || !sma10 || !sma20 || !sma50 || !sma100 || !sma200 || !ema10 || !ema20 || !ema50 || !ema100 || !ema200 || !adx.adx || !adx.plusDI || !adx.minusDI || !vwap || !bollingerBands.upper || !bollingerBands.middle || !bollingerBands.lower || !obv.obv || !obv.obvSma || !cmf || !ichimoku.conversion || !ichimoku.base || !ichimoku.spanA || !ichimoku.spanB || !atr || !stochastic.k || !stochastic.d) {
        return {
            type: 'NEUTRAL',
            strength: 0,
            timestamp: new Date().toISOString(),
            price: price || 0,
            indicators: {
                rsi,
                macd,
                sma: { sma10, sma20, sma50, sma100, sma200 },
                ema: { ema10, ema20, ema50, ema100, ema200 },
                adx,
                vwap,
                bollingerBands,
                obv,
                fibonacci,
                cmf,
                ichimoku,
                atr,
                stochastic
            }
        };
    }

    let strength = 0;

    // RSI conditions
    if (rsi <= 30) strength += 2;
    else if (rsi >= 70) strength -= 2;

    // MACD conditions
    if (macd.histogram > 0) strength += 2;
    else if (macd.histogram < 0) strength -= 2;

    // Moving averages conditions
    if (price > sma10 && price > sma20 && price > sma50 && price > sma100 && price > sma200) strength += 2;
    else if (price < sma10 && price < sma20 && price < sma50 && price < sma100 && price < sma200) strength -= 2;

    if (price > ema10 && price > ema20 && price > ema50 && price > ema100 && price > ema200) strength += 2;
    else if (price < ema10 && price < ema20 && price < ema50 && price < ema100 && price < ema200) strength -= 2;

    // ADX conditions
    if (adx.adx > 25) {
        if (adx.plusDI > adx.minusDI) strength += 1;
        else if (adx.minusDI > adx.plusDI) strength -= 1;
    }

    // VWAP conditions
    if (price > vwap) strength += 1;
    else if (price < vwap) strength -= 1;

    // Bollinger Bands conditions
    if (price < bollingerBands.lower) strength += 1;
    else if (price > bollingerBands.upper) strength -= 1;

    // OBV conditions
    if (obv.obv > obv.obvSma) strength += 1;
    else if (obv.obv < obv.obvSma) strength -= 1;

    // CMF conditions
    if (cmf > 0) strength += 1;
    else if (cmf < 0) strength -= 1;

    // Ichimoku Cloud conditions
    if (price > ichimoku.conversion && price > ichimoku.base && ichimoku.spanA > ichimoku.spanB && price > ichimoku.spanA) strength += 2;
    else if (price < ichimoku.conversion && price < ichimoku.base && ichimoku.spanA < ichimoku.spanB && price < ichimoku.spanA) strength -= 2;

    // ATR conditions
    const atrMultiplier = 2;
    const atrUpper = price + (atr * atrMultiplier);
    const atrLower = price - (atr * atrMultiplier);

    if (price > atrUpper) strength += 1;
    else if (price < atrLower) strength -= 1;

    // Stochastic conditions
    if (stochastic.k <= 20 && stochastic.d <= 20) strength += 2; // Oversold
    else if (stochastic.k >= 80 && stochastic.d >= 80) strength -= 2; // Overbought
    else if (stochastic.k > stochastic.d) strength += 1; // Bullish crossover
    else if (stochastic.k < stochastic.d) strength -= 1; // Bearish crossover

    // Determine signal type based on strength
    let type: SignalType = 'NEUTRAL';
    if (strength >= 5) type = 'BUY';
    else if (strength <= -5) type = 'SELL';

    return {
        type,
        strength,
        timestamp: new Date().toISOString(),
        price,
        indicators: {
            rsi,
            macd,
            sma: { sma10, sma20, sma50, sma100, sma200 },
            ema: { ema10, ema20, ema50, ema100, ema200 },
            adx,
            vwap,
            bollingerBands,
            obv,
            fibonacci,
            cmf,
            ichimoku,
            atr,
            stochastic
        }
    };
};
