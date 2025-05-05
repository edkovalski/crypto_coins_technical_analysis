import { RSI, MACD, EMA, SMA } from 'technicalindicators';

const rsiPeriod = 14; // Define the RSI period here

// Utility function to extract and validate close prices
const extractValidClosePrices = (data: any[]): number[] => {
    if (!data || data.length === 0) {
        return [];
    }
    return data.map((item) => {
        if (Array.isArray(item) && item.length >= 6) {
            const closePrice = parseFloat(item[4]);
            if (isNaN(closePrice)) {
                console.error('Invalid close price:', item[4]);
                return NaN;
            }
            return closePrice;
        } else {
            console.error('Invalid data format:', item);
            return NaN;
        }
    }).filter((price) => !isNaN(price));
};

export const calculateRSIForSymbol = (data: any[]) => {
    if (!data || data.length === 0) {
        console.warn('No data provided for RSI calculation');
        return null; // Return null if data is null or empty
    }

    // Verify the data format and extract close prices
    const closePrices = data.map((item) => {
        if (Array.isArray(item) && item.length >= 6) {
            // Assuming the format is [open time, open, high, low, close, volume, close time, quote asset volume, number of trades, taker buy base asset volume, taker buy quote asset volume, ignore]
            const closePrice = parseFloat(item[4]);
            if (isNaN(closePrice)) {
                console.error('Invalid close price:', item[4]);
                return NaN; // Return NaN for invalid close prices
            }
            return closePrice;
        } else {
            console.error('Invalid data format:', item);
            return NaN; // Return NaN for invalid data
        }
    });

    console.log('closePrices:', closePrices);

    // Remove NaN values from closePrices
    const validClosePrices = closePrices.filter((price) => !isNaN(price));
    console.log('validClosePrices:', validClosePrices);

    if (validClosePrices.length < rsiPeriod + 1) {
        console.warn(`Not enough valid data points for RSI calculation (need at least ${rsiPeriod + 1}, got ${validClosePrices.length})`);
        return null; // Return null if not enough valid data points
    }

    const rsi = new RSI({ period: rsiPeriod, values: validClosePrices }); // Use the defined rsiPeriod
    const rsiValues = rsi.getResult();
    console.log('rsiValues:', rsiValues);

    if (rsiValues.length === 0) {
        console.warn('No RSI values calculated');
        return null; // Return null if no RSI values were calculated
    }

    return rsiValues[rsiValues.length - 1] || null; // Return the last RSI value or null if empty
};

export const calculateMACDForSymbol = (data: any[]) => {
    if (!data || data.length === 0) {
        return { 
            MACD: null, 
            signal: null, 
            histogram: null,
            previousMACD1: null,
            previousSignal1: null,
            previousHistogram1: null,
            previousMACD2: null,
            previousSignal2: null,
            previousHistogram2: null
        }; // Return null values if data is null or empty
    }
    const closePrices = data.map((item) => {
        if (Array.isArray(item) && item.length >= 6) {
            // Assuming the format is [open time, open, high, low, close, volume, close time, quote asset volume, number of trades, taker buy base asset volume, taker buy quote asset volume, ignore]
            const closePrice = parseFloat(item[4]);
            if (isNaN(closePrice)) {
                console.error('Invalid close price:', item[4]);
                return NaN; // Return NaN for invalid close prices
            }
            return closePrice;
        } else {
            console.error('Invalid data format:', item);
            return NaN; // Return NaN for invalid data
        }
    });

    // Remove NaN values from closePrices
    const validClosePrices = closePrices.filter((price) => !isNaN(price));

    if (validClosePrices.length < 35) {
        console.warn('Not enough valid data points for MACD calculation');
        return { 
            MACD: null, 
            signal: null, 
            histogram: null,
            previousMACD1: null,
            previousSignal1: null,
            previousHistogram1: null,
            previousMACD2: null,
            previousSignal2: null,
            previousHistogram2: null
        }; // Return null if not enough valid data points
    }

    const macd = new MACD({
        values: validClosePrices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });
    const macdValues = macd.getResult();
    const lastIndex = macdValues.length - 1;
    const lastMacd = macdValues[lastIndex];
    const previousMacd1 = lastIndex > 0 ? macdValues[lastIndex - 1] : null;
    const previousMacd2 = lastIndex > 1 ? macdValues[lastIndex - 2] : null;
    
    return {
        MACD: lastMacd?.MACD || null,
        signal: lastMacd?.signal || null,
        histogram: lastMacd?.histogram || null,
        previousMACD1: previousMacd1?.MACD || null,
        previousSignal1: previousMacd1?.signal || null,
        previousHistogram1: previousMacd1?.histogram || null,
        previousMACD2: previousMacd2?.MACD || null,
        previousSignal2: previousMacd2?.signal || null,
        previousHistogram2: previousMacd2?.histogram || null,
    };
};

export const calculateEMAForSymbol = (data: any[], period: number) => {
    if (!data || data.length === 0) {
        return null; // Return null if data is null or empty
    }
    const closePrices = data.map((item) => {
        if (Array.isArray(item) && item.length >= 6) {
            // Assuming the format is [open time, open, high, low, close, volume, close time, quote asset volume, number of trades, taker buy base asset volume, taker buy quote asset volume, ignore]
            const closePrice = parseFloat(item[4]);
            if (isNaN(closePrice)) {
                console.error('Invalid close price:', item[4]);
                return NaN; // Return NaN for invalid close prices
            }
            return closePrice;
        } else {
            console.error('Invalid data format:', item);
            return NaN; // Return NaN for invalid data
        }
    });

    // Remove NaN values from closePrices
    const validClosePrices = closePrices.filter((price) => !isNaN(price));

    if (validClosePrices.length < period + 1) {
        console.warn('Not enough valid data points for EMA calculation');
        return null; // Return null if not enough valid data points
    }

    const ema = new EMA({ period: period, values: validClosePrices });
    const emaValues = ema.getResult();
    return emaValues[emaValues.length - 1] || null; // Return the last EMA value or null if empty
};

export const calculateSMAForSymbol = (data: any[], period: number) => {
    if (!data || data.length === 0) {
        return null;
    }
    const validClosePrices = extractValidClosePrices(data);

    if (validClosePrices.length < period) {
        console.warn(`Not enough valid data points for SMA calculation (need at least ${period}, got ${validClosePrices.length})`);
        return null;
    }

    const sma = new SMA({ period: period, values: validClosePrices });
    const smaValues = sma.getResult();
    return smaValues[smaValues.length - 1] || null;
};

export const calculateSMA10ForSymbol = (data: any[]) => {
    return calculateSMAForSymbol(data, 10);
};

export const calculateSMA20ForSymbol = (data: any[]) => {
    return calculateSMAForSymbol(data, 20);
};

export const calculateSMA50ForSymbol = (data: any[]) => {
    return calculateSMAForSymbol(data, 50);
};

export const calculateSMA100ForSymbol = (data: any[]) => {
    return calculateSMAForSymbol(data, 100);
};
export const calculateSMA200ForSymbol = (data: any[]) => {
    return calculateSMAForSymbol(data, 200);
};

export const calculateEMA10ForSymbol = (data: any[]) => {
    return calculateEMAForSymbol(data, 10);
};
export const calculateEMA20ForSymbol = (data: any[]) => {
    return calculateEMAForSymbol(data, 20);
};

export const calculateEMA50ForSymbol = (data: any[]) => {
    return calculateEMAForSymbol(data, 50);
};
export const calculateEMA100ForSymbol = (data: any[]) => {
    return calculateEMAForSymbol(data, 100);
};
export const calculateEMA200ForSymbol = (data: any[]) => {
    return calculateEMAForSymbol(data, 200);
};

export const checkEMA2050Crossover = (data: any[]) => {
    const ema50 = calculateEMA20ForSymbol(data);
    const ema200 = calculateEMA50ForSymbol(data);

    if (ema50 === null || ema200 === null) {
        return null;
    }

    return ema50 > ema200;
};
export const checkEMA50200Crossover = (data: any[]) => {
    const ema50 = calculateEMA50ForSymbol(data);
    const ema200 = calculateEMA200ForSymbol(data);

    if (ema50 === null || ema200 === null) {
        return null;
    }

    return ema50 > ema200;
};
export const checkSMA2050Crossover = (data: any[]) => {
    const sma50 = calculateSMA50ForSymbol(data);
    const sma200 = calculateSMA200ForSymbol(data);

    if (sma50 === null || sma200 === null) {
        return null;
    }

    return sma50 > sma200;
};
export const checkSMA50200Crossover = (data: any[]) => {
    const sma50 = calculateSMA50ForSymbol(data);
    const sma200 = calculateSMA200ForSymbol(data);

    if (sma50 === null || sma200 === null) {
        return null;
    }

    return sma50 > sma200;
};

// Helper function to calculate True Range
const calculateTrueRange = (high: number, low: number, prevClose: number): number => {
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    return Math.max(tr1, tr2, tr3);
};

// Helper function to calculate Directional Movement
const calculateDirectionalMovement = (high: number, low: number, prevHigh: number, prevLow: number): { plusDM: number, minusDM: number } => {
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    let plusDM = 0;
    let minusDM = 0;

    if (upMove > downMove && upMove > 0) {
        plusDM = upMove;
    }
    if (downMove > upMove && downMove > 0) {
        minusDM = downMove;
    }

    return { plusDM, minusDM };
};

export const calculateADXForSymbol = (data: any[], period: number = 14): { adx: number | null, plusDI: number | null, minusDI: number | null } => {
    if (!data || data.length < period + 1) {
        return { adx: null, plusDI: null, minusDI: null };
    }

    // Extract high, low, and close prices
    const prices = data.map(item => {
        if (Array.isArray(item) && item.length >= 6) {
            return {
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4])
            };
        }
        return null;
    }).filter(item => item !== null);

    if (prices.length < period + 1) {
        return { adx: null, plusDI: null, minusDI: null };
    }

    // Calculate True Range and Directional Movement
    const trValues: number[] = [];
    const plusDMValues: number[] = [];
    const minusDMValues: number[] = [];

    for (let i = 1; i < prices.length; i++) {
        const tr = calculateTrueRange(prices[i].high, prices[i].low, prices[i - 1].close);
        const { plusDM, minusDM } = calculateDirectionalMovement(
            prices[i].high, prices[i].low, prices[i - 1].high, prices[i - 1].low
        );

        trValues.push(tr);
        plusDMValues.push(plusDM);
        minusDMValues.push(minusDM);
    }

    // Calculate smoothed values
    const smoothedTR = new Array(trValues.length).fill(0);
    const smoothedPlusDM = new Array(plusDMValues.length).fill(0);
    const smoothedMinusDM = new Array(minusDMValues.length).fill(0);

    // First value is simple sum
    smoothedTR[period - 1] = trValues.slice(0, period).reduce((a, b) => a + b, 0);
    smoothedPlusDM[period - 1] = plusDMValues.slice(0, period).reduce((a, b) => a + b, 0);
    smoothedMinusDM[period - 1] = minusDMValues.slice(0, period).reduce((a, b) => a + b, 0);

    // Calculate remaining smoothed values
    for (let i = period; i < trValues.length; i++) {
        smoothedTR[i] = smoothedTR[i - 1] - (smoothedTR[i - 1] / period) + trValues[i];
        smoothedPlusDM[i] = smoothedPlusDM[i - 1] - (smoothedPlusDM[i - 1] / period) + plusDMValues[i];
        smoothedMinusDM[i] = smoothedMinusDM[i - 1] - (smoothedMinusDM[i - 1] / period) + minusDMValues[i];
    }

    // Calculate +DI and -DI
    const plusDI = (smoothedPlusDM[smoothedPlusDM.length - 1] / smoothedTR[smoothedTR.length - 1]) * 100;
    const minusDI = (smoothedMinusDM[smoothedMinusDM.length - 1] / smoothedTR[smoothedTR.length - 1]) * 100;

    // Calculate DX
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

    // Calculate ADX
    const adx = dx; // For simplicity, we're using the last DX value as ADX

    return {
        adx: adx,
        plusDI: plusDI,
        minusDI: minusDI
    };
};

export const calculateVWAPForSymbol = (data: any[]): number | null => {
    if (!data || data.length === 0) {
        return null;
    }

    // Extract high, low, close, and volume from candlestick data
    const validData = data.map(item => {
        if (Array.isArray(item) && item.length >= 7) {
            return {
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5])
            };
        }
        return null;
    }).filter(item => item !== null);

    if (validData.length === 0) {
        return null;
    }

    // Calculate typical price and volume-weighted price for each period
    let cumulativeVolume = 0;
    let cumulativePriceVolume = 0;

    for (const item of validData) {
        const typicalPrice = (item.high + item.low + item.close) / 3;
        const priceVolume = typicalPrice * item.volume;

        cumulativeVolume += item.volume;
        cumulativePriceVolume += priceVolume;
    }

    // Calculate VWAP
    if (cumulativeVolume === 0) {
        return null;
    }

    return cumulativePriceVolume / cumulativeVolume;
};

export const calculateBollingerBands = (data: any[], period: number = 20, stdDev: number = 2): { upper: number | null; middle: number | null; lower: number | null } => {
    if (!data || data.length < period) {
        return { upper: null, middle: null, lower: null };
    }

    // Extract close prices
    const closePrices = data.map(item => {
        if (Array.isArray(item) && item.length >= 6) {
            return parseFloat(item[4]);
        }
        return null;
    }).filter(price => price !== null);

    if (closePrices.length < period) {
        return { upper: null, middle: null, lower: null };
    }

    // Calculate SMA (middle band)
    const sma = new SMA({ period: period, values: closePrices });
    const smaValues = sma.getResult();
    const middle = smaValues[smaValues.length - 1];

    if (middle === null) {
        return { upper: null, middle: null, lower: null };
    }

    // Calculate standard deviation
    let sumSquaredDiff = 0;
    for (let i = closePrices.length - period; i < closePrices.length; i++) {
        const diff = closePrices[i] - middle;
        sumSquaredDiff += diff * diff;
    }
    const standardDeviation = Math.sqrt(sumSquaredDiff / period);

    // Calculate upper and lower bands
    const upper = middle + (standardDeviation * stdDev);
    const lower = middle - (standardDeviation * stdDev);

    return {
        upper,
        middle,
        lower
    };
};

export const calculateOBV = (data: any[]): { obv: number | null; obvSma: number | null } => {
    if (!data || data.length < 2) {
        return { obv: null, obvSma: null };
    }

    // Extract close prices and volumes
    const priceVolumeData = data.map(item => {
        if (Array.isArray(item) && item.length >= 7) {
            return {
                close: parseFloat(item[4]),
                volume: parseFloat(item[5])
            };
        }
        return null;
    }).filter(item => item !== null);

    if (priceVolumeData.length < 2) {
        return { obv: null, obvSma: null };
    }

    // Calculate OBV
    let obv = 0;
    const obvValues: number[] = [];

    for (let i = 1; i < priceVolumeData.length; i++) {
        const currentClose = priceVolumeData[i].close;
        const previousClose = priceVolumeData[i - 1].close;
        const currentVolume = priceVolumeData[i].volume;

        if (currentClose > previousClose) {
            obv += currentVolume;
        } else if (currentClose < previousClose) {
            obv -= currentVolume;
        }
        // If close is equal, volume stays the same

        obvValues.push(obv);
    }

    // Calculate 20-period SMA of OBV
    const obvSma = new SMA({ period: 9, values: obvValues });
    const smaValues = obvSma.getResult();
    const lastSma = smaValues[smaValues.length - 1];

    return {
        obv: obv,
        obvSma: lastSma
    };
};

export const calculateFibonacciRetracement = (data: any[], period: number = 20): {
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
} => {
    if (!data || data.length < period) {
        return {
            levels: {
                '0': null,
                '0.236': null,
                '0.382': null,
                '0.5': null,
                '0.618': null,
                '0.786': null,
                '1': null
            },
            high: null,
            low: null
        };
    }

    // Extract high and low prices
    const priceData = data.map(item => {
        if (Array.isArray(item) && item.length >= 6) {
            return {
                high: parseFloat(item[2]),
                low: parseFloat(item[3])
            };
        }
        return null;
    }).filter(item => item !== null);

    if (priceData.length < period) {
        return {
            levels: {
                '0': null,
                '0.236': null,
                '0.382': null,
                '0.5': null,
                '0.618': null,
                '0.786': null,
                '1': null
            },
            high: null,
            low: null
        };
    }

    // Find highest high and lowest low in the period
    let high = priceData[0].high;
    let low = priceData[0].low;

    for (let i = 1; i < priceData.length; i++) {
        if (priceData[i].high > high) {
            high = priceData[i].high;
        }
        if (priceData[i].low < low) {
            low = priceData[i].low;
        }
    }

    // Calculate Fibonacci levels
    const diff = high - low;
    const levels = {
        '0': high,
        '0.236': high - (diff * 0.236),
        '0.382': high - (diff * 0.382),
        '0.5': high - (diff * 0.5),
        '0.618': high - (diff * 0.618),
        '0.786': high - (diff * 0.786),
        '1': low
    };

    return {
        levels,
        high,
        low
    };
};

export const calculateCMF = (data: any[], period: number = 20): number | null => {
    if (!data || data.length < period) {
        return null;
    }

    // Extract high, low, close, and volume from candlestick data
    const validData = data.map(item => {
        if (Array.isArray(item) && item.length >= 7) {
            return {
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5])
            };
        }
        return null;
    }).filter(item => item !== null);

    if (validData.length < period) {
        return null;
    }

    // Calculate Money Flow Multiplier and Money Flow Volume
    const mfValues = validData.map(item => {
        const mfm = ((item.close - item.low) - (item.high - item.close)) / (item.high - item.low);
        const mfv = mfm * item.volume;
        return { mfv, volume: item.volume };
    });

    // Calculate CMF for the specified period
    let sumMFV = 0;
    let sumVolume = 0;

    for (let i = mfValues.length - period; i < mfValues.length; i++) {
        sumMFV += mfValues[i].mfv;
        sumVolume += mfValues[i].volume;
    }

    if (sumVolume === 0) {
        return null;
    }

    return sumMFV / sumVolume;
};

export const calculateIchimokuCloud = (data: any[]): {
    conversion: number | null;
    base: number | null;
    spanA: number | null;
    spanB: number | null;
    leadingSpanA: number | null;
    leadingSpanB: number | null;
} => {
    if (!data || data.length < 52) { // Need at least 52 periods for full calculation
        return {
            conversion: null,
            base: null,
            spanA: null,
            spanB: null,
            leadingSpanA: null,
            leadingSpanB: null
        };
    }

    // Extract high, low, and close prices
    const validData = data.map(item => {
        if (Array.isArray(item) && item.length >= 6) {
            return {
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4])
            };
        }
        return null;
    }).filter(item => item !== null);

    if (validData.length < 52) {
        return {
            conversion: null,
            base: null,
            spanA: null,
            spanB: null,
            leadingSpanA: null,
            leadingSpanB: null
        };
    }

    // Calculate Conversion Line (Tenkan-sen)
    const conversionPeriod = 9;
    const conversionHigh = Math.max(...validData.slice(-conversionPeriod).map(d => d.high));
    const conversionLow = Math.min(...validData.slice(-conversionPeriod).map(d => d.low));
    const conversion = (conversionHigh + conversionLow) / 2;

    // Calculate Base Line (Kijun-sen)
    const basePeriod = 26;
    const baseHigh = Math.max(...validData.slice(-basePeriod).map(d => d.high));
    const baseLow = Math.min(...validData.slice(-basePeriod).map(d => d.low));
    const base = (baseHigh + baseLow) / 2;

    // Calculate Leading Span A (Senkou Span A)
    const spanA = (conversion + base) / 2;

    // Calculate Leading Span B (Senkou Span B)
    const spanBPeriod = 52;
    const spanBHigh = Math.max(...validData.slice(-spanBPeriod).map(d => d.high));
    const spanBLow = Math.min(...validData.slice(-spanBPeriod).map(d => d.low));
    const spanB = (spanBHigh + spanBLow) / 2;

    // Calculate Leading Spans (shifted forward by 26 periods)
    const leadingSpanA = spanA;
    const leadingSpanB = spanB;

    return {
        conversion,
        base,
        spanA,
        spanB,
        leadingSpanA,
        leadingSpanB
    };
};

export const calculateATR = (data: any[], period: number = 14): number | null => {
    if (!data || data.length < period + 1) {
        return null;
    }

    // Extract high, low, and close prices
    const validData = data.map(item => {
        if (Array.isArray(item) && item.length >= 6) {
            return {
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4])
            };
        }
        return null;
    }).filter(item => item !== null);

    if (validData.length < period + 1) {
        return null;
    }

    // Calculate True Range for each period
    const trueRanges: number[] = [];
    for (let i = 1; i < validData.length; i++) {
        const current = validData[i];
        const previous = validData[i - 1];

        const tr1 = current.high - current.low;
        const tr2 = Math.abs(current.high - previous.close);
        const tr3 = Math.abs(current.low - previous.close);

        const trueRange = Math.max(tr1, tr2, tr3);
        trueRanges.push(trueRange);
    }

    // Calculate initial ATR as SMA of first 'period' true ranges
    let atr = 0;
    for (let i = 0; i < period; i++) {
        atr += trueRanges[i];
    }
    atr /= period;

    // Calculate remaining ATR values using Wilder's smoothing method
    for (let i = period; i < trueRanges.length; i++) {
        atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    }

    return atr;
};

export const calculateStochastic = (data: any[], kPeriod: number = 14, dPeriod: number = 3): { k: number | null; d: number | null } => {
    if (!data || data.length < kPeriod + dPeriod) {
        console.warn('Insufficient data for Stochastic calculation');
        return { k: null, d: null };
    }

    try {
        // Extract high, low, and close prices
        const validData = data.map(item => {
            if (Array.isArray(item) && item.length >= 6) {
                return {
                    high: parseFloat(item[2]),
                    low: parseFloat(item[3]),
                    close: parseFloat(item[4])
                };
            }
            return null;
        }).filter(item => item !== null);

        if (validData.length < kPeriod + dPeriod) {
            console.warn(`Not enough valid data points for Stochastic calculation. Need ${kPeriod + dPeriod}, got ${validData.length}`);
            return { k: null, d: null };
        }

        // Calculate %K values
        const kValues: number[] = [];
        for (let i = kPeriod - 1; i < validData.length; i++) {
            const currentClose = validData[i].close;
            const periodHigh = Math.max(...validData.slice(i - kPeriod + 1, i + 1).map(d => d.high));
            const periodLow = Math.min(...validData.slice(i - kPeriod + 1, i + 1).map(d => d.low));

            if (periodHigh === periodLow) {
                kValues.push(50); // Neutral value when high equals low
            } else {
                const k = ((currentClose - periodLow) / (periodHigh - periodLow)) * 100;
                kValues.push(k);
            }
        }

        // Calculate %D values (SMA of %K)
        const dValues: number[] = [];
        for (let i = dPeriod - 1; i < kValues.length; i++) {
            const d = kValues.slice(i - dPeriod + 1, i + 1).reduce((sum, val) => sum + val, 0) / dPeriod;
            dValues.push(d);
        }

        const lastK = kValues[kValues.length - 1];
        const lastD = dValues[dValues.length - 1];

        if (isNaN(lastK) || isNaN(lastD)) {
            console.warn('Invalid Stochastic values calculated');
            return { k: null, d: null };
        }

        return {
            k: lastK,
            d: lastD
        };
    } catch (error) {
        console.error('Error calculating Stochastic:', error);
        return { k: null, d: null };
    }
};