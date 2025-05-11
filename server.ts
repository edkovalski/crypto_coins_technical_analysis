// server.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import {
    fetchBinanceSymbols,
    fetchDataForSymbolAndTimeframe,
    Timeframe,
    createWebSocket,
} from './dataManager';
import { fetchCandlestickData } from './api';
import WebSocket from 'ws';
import { createClient } from 'redis';
import { fetchBinanceExchangeInfo } from './api';

// In-memory cache for candlestick data to avoid duplicate API calls
interface CandlestickCache {
    [key: string]: {
        data: any;
        timestamp: number;
        expiresAt: number;
    };
}

const candlestickCache: CandlestickCache = {};

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve node_modules for ES modules
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Redis Client Setup
const redisClient = createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('connect', () => console.log('Redis connected'));
redisClient.on('error', (err: any) => console.error('Redis error:', err));

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Endpoint to get all available Binance symbols
app.get('/symbols', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const symbols = await fetchBinanceSymbols();
        res.json(symbols);
    } catch (error) {
        next(error);
    }
});

app.get('/data/:symbol', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { symbol } = req.params;
        const validTimeframes: Timeframe[] = ['1h', '4h', '1d', '1w'];
        const allTimeframeData = await Promise.all(
            validTimeframes.map(async (timeframe) => {
                const cachedData = await redisClient.get(`indicator:${symbol}:${timeframe}`);
                if (cachedData) {
                    console.log(`Serving data for ${symbol} ${timeframe} from cache`);
                    const parsedData = JSON.parse(cachedData);
                    const ttl = await redisClient.pTTL(`indicator:${symbol}:${timeframe}`);
                    return {
                        timeframe,
                        data: parsedData,
                        cachedAt: formatTimestamp(parsedData.timestamp),
                        expiresIn: Math.round(ttl / 1000) + ' seconds'
                    };
                } else {
                    console.log(`Data for ${symbol} ${timeframe} not found in cache`);
                    return { timeframe, data: null };
                }
            })
        );
        res.json(allTimeframeData);
    } catch (error) {
        next(error);
    }
});

/**
 * Shared function to get candlestick data with caching
 * @param symbol - Trading pair symbol
 * @param timeframe - Candlestick timeframe
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds
 * @returns Candlestick data array
 */
async function getCandlestickData(symbol: string, timeframe: string, startTime?: number, endTime?: number) {
    // Create a unique cache key based on the parameters
    const cacheKey = `${symbol}:${timeframe}:${startTime || 0}:${endTime || 0}`;
    
    // Check if we have valid cached data
    const now = Date.now();
    const cachedItem = candlestickCache[cacheKey];
    
    if (cachedItem && cachedItem.expiresAt > now) {
        console.log(`Serving candlestick data for ${cacheKey} from cache`);
        return cachedItem.data;
    }
    
    // If not in cache or expired, fetch from API
    console.log(`Fetching candlestick data for ${cacheKey} from API`);
    const data = await fetchCandlestickData(symbol, timeframe, startTime, endTime);
    
    // Cache the result for 5 minutes (300000ms)
    if (data) {
        candlestickCache[cacheKey] = {
            data,
            timestamp: now,
            expiresAt: now + 300000 // 5 minute cache
        };
    }
    
    return data;
}

// Documentation route for historical chart data API
app.get('/historical-chart-data', (req: Request, res: Response) => {
    res.json({
        description: 'API for fetching historical candlestick data',
        usage: '/historical-chart-data/:symbol?timeframe=<timeframe>&start=<unix_timestamp>&end=<unix_timestamp>',
        parameters: {
            symbol: 'Required: Trading pair symbol (e.g., BTCUSDT)',
            timeframe: 'Required: One of 1h, 4h, 1d',
            start: 'Required: Start time in Unix timestamp (seconds)',
            end: 'Required: End time in Unix timestamp (seconds)'
        },
        example: '/historical-chart-data/BTCUSDT?timeframe=1h&start=1620000000&end=1620100000'
    });
});

// Endpoint to get historical chart data
app.get('/historical-chart-data/:symbol', (req: Request, res: Response, next: NextFunction) => {
    (async () => {
        try {
            const { symbol } = req.params;
            const timeframe = req.query.timeframe as Timeframe;
            const startTime = parseInt(req.query.start as string || '0');
            const endTime = parseInt(req.query.end as string || '0');
            
            // Improved error handling with specific messages
            const missingParams = [];
            if (!symbol) missingParams.push('symbol');
            if (!timeframe) missingParams.push('timeframe');
            if (!startTime) missingParams.push('start');
            if (!endTime) missingParams.push('end');
            
            if (missingParams.length > 0) {
                return res.status(400).json({ 
                    error: `Missing required parameters: ${missingParams.join(', ')}`,
                    usage: '/historical-chart-data/:symbol?timeframe=<timeframe>&start=<unix_timestamp>&end=<unix_timestamp>',
                    example: '/historical-chart-data/BTCUSDT?timeframe=1h&start=1620000000&end=1620100000'
                });
            }
            
            // Validate timeframe
            const validTimeframes: Timeframe[] = ['1h', '4h', '1d', '1w'];
            if (!validTimeframes.includes(timeframe)) {
                return res.status(400).json({ 
                    error: 'Invalid timeframe', 
                    validTimeframes: validTimeframes.join(', ')
                });
            }
            
            // Get candlestick data using the shared function
            const candlestickData = await getCandlestickData(symbol, timeframe, startTime * 1000, endTime * 1000);
            
            if (!candlestickData || candlestickData.length === 0) {
                return res.status(404).json({ 
                    error: 'No data found',
                    message: `No data found for ${symbol} with timeframe ${timeframe} between ${new Date(startTime * 1000).toISOString()} and ${new Date(endTime * 1000).toISOString()}`
                });
            }
            
            res.json(candlestickData);
        } catch (error) {
            console.error('Error fetching historical chart data:', error);
            next(error);
        }
    })();
});

// Endpoint to get historical data for backtesting
app.get('/  /:symbol', (req: Request<{ symbol: string }, any, any, { timestamp: string }>, res: Response, next: NextFunction) => {
    (async () => {
        try {
            const { symbol } = req.params;
            const timestamp = parseInt(req.query.timestamp);

            if (!timestamp || isNaN(timestamp)) {
                return res.status(400).json({ error: 'Invalid timestamp' });
            }

            const validTimeframes: Timeframe[] = ['1h', '4h', '1d', '1w'];
            const allTimeframeData = await Promise.all(
                validTimeframes.map(async (timeframe) => {
                    try {
                        // Fetch historical candlestick data with the specified timestamp using shared function
                        const candlestickData = await getCandlestickData(symbol, timeframe, timestamp);
                        if (!candlestickData || candlestickData.length < 2) {
                            return { timeframe, data: null };
                        }

                        // Calculate indicators using the historical data
                        const indicatorData = await fetchDataForSymbolAndTimeframe(symbol, timeframe, candlestickData);

                        // Get the last candle for the price
                        const lastCandle = candlestickData[candlestickData.length - 1];

                        return {
                            timeframe,
                            data: indicatorData,
                            timestamp: parseInt(lastCandle[0]),
                            price: parseFloat(lastCandle[4])
                        };
                    } catch (error) {
                        console.error(`Error fetching historical data for ${symbol} ${timeframe}:`, error);
                        return { timeframe, data: null };
                    }
                })
            );

            res.json(allTimeframeData);
        } catch (error) {
            next(error);
        }
    })();
});

// Endpoint to get Greed and Fear Index




// WebSocket for real-time price updates
const connectedClients = new Map<string, Response>();

app.get('/ws', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders(); // Type assertion here

    const clientId = Date.now().toString();
    connectedClients.set(clientId, res);

    req.on('close', () => {
        connectedClients.delete(clientId);
    });
});

let ws: WebSocket | null = null;
const startWebSocket = async () => {
    const symbols = await fetchBinanceSymbols();
    ws = createWebSocket(
        symbols,
        (data) => {

            if (Array.isArray(data)) {
                data.forEach((item) => {
                    if (item.s && item.c) {
                        const price = parseFloat(item.c);
                        connectedClients.forEach((res) => {
                            res.write(`data: ${JSON.stringify({ symbol: item.s, price })}\n\n`);
                        });
                    }
                });
            } else if (data.s && data.c) {
                const price = parseFloat(data.c);
                connectedClients.forEach((res) => {
                    res.write(`data: ${JSON.stringify({ symbol: data.s, price })}\n\n`);
                });
            }
        },
        (error) => {
            console.error('WebSocket error:', error);
        }
    );
};

// Cache update intervals
const CACHE_CONFIG = {
    INDICATOR_TTL: 300,          // 5 min cache TTL
    SIGNAL_TTL: 120,              // 2 min cache TTL
    UPDATE_THRESHOLD: 60,       // Force update if less than 1 minute left
    BACKGROUND_UPDATE: true,     // Enable background updates
    FORCE_UPDATE_ON_START: true  // Force update all data on server start
} as const;

// Function to check if cache needs update
async function shouldUpdateCache(key: string, forceUpdate: boolean = false): Promise<boolean> {
    if (forceUpdate) return true;
    const ttl = await redisClient.ttl(key);
    // Update if key doesn't exist (-2) or is about to expire
    // Also update if more than half the TTL has passed
    if (ttl === -2) return true;
    const maxTTL = key.startsWith('signals:') ? CACHE_CONFIG.SIGNAL_TTL : CACHE_CONFIG.INDICATOR_TTL;
    return ttl <= CACHE_CONFIG.UPDATE_THRESHOLD || ttl < (maxTTL / 2);
}

// Function to update cache in background
async function updateCacheInBackground(symbol: string, timeframe: Timeframe) {
    try {
        console.log(`Background update for ${symbol}:${timeframe}`);
        const indicatorData = await fetchDataForSymbolAndTimeframe(symbol, timeframe);
        if (indicatorData) {
            await redisClient.set(
                `indicator:${symbol}:${timeframe}`,
                JSON.stringify(indicatorData),
                { EX: CACHE_CONFIG.INDICATOR_TTL }
            );
        }
    } catch (error) {
        console.error(`Background update failed for ${symbol}:${timeframe}:`, error);
    }
}

// New function to fetch and evaluate data on server start
const evaluateAllDataOnStartup = async () => {
    const symbols = await fetchBinanceSymbols();
    const validTimeframes: Timeframe[] = ['1h', '4h', '1d', '1w'];

    console.log('Starting initial data evaluation...');
    const forceUpdate = CACHE_CONFIG.FORCE_UPDATE_ON_START;
    if (forceUpdate) {
        console.log('Force update enabled - updating all data regardless of cache status');
    }

    // Process symbols in larger batches with rate limiting
    const BATCH_SIZE = 200;
    const CONCURRENT_REQUESTS = 200;
    const BATCH_DELAY = 50;
    
    // Get current timestamp for historical data
    const now = Date.now();
    // Get timestamp for 7 days ago (for historical chart data)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    console.log('Pre-fetching candlestick data for both /data/:symbol and /historical-chart-data/:symbol endpoints...');

    // Split symbols into batches
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(symbols.length / BATCH_SIZE)}`);

        // Process each batch with controlled concurrency
        const batchPromises = batch.map(async (symbol) => {
            const timeframeChunks = chunk(validTimeframes, CONCURRENT_REQUESTS);

            for (const timeframeChunk of timeframeChunks) {
                await Promise.all(
                    timeframeChunk.map(async (tf) => {
                        try {
                            // 1. Pre-fetch and cache candlestick data for both endpoints
                            // This will populate the candlestickCache for both current data and historical data
                            console.log(`Pre-fetching candlestick data for ${symbol}:${tf}`);
                            
                            // Get current candlestick data (for /data/:symbol endpoint)
                            await getCandlestickData(symbol, tf);
                            
                            // Get historical candlestick data (for /historical-chart-data/:symbol endpoint)
                            await getCandlestickData(symbol, tf, sevenDaysAgo, now);
                            
                            // 2. Process indicator data for Redis cache
                            const cacheKey = `indicator:${symbol}:${tf}`;
                            const needsUpdate = await shouldUpdateCache(cacheKey, forceUpdate);
                            const cachedData = await redisClient.get(cacheKey);

                            if (cachedData && !needsUpdate) {
                                console.log(`Using cached indicator data for ${symbol}:${tf}`);
                                // Start background update if approaching expiry
                                if (CACHE_CONFIG.BACKGROUND_UPDATE && await redisClient.ttl(cacheKey) < CACHE_CONFIG.INDICATOR_TTL / 2) {
                                    updateCacheInBackground(symbol, tf).catch(console.error);
                                }
                                return;
                            }

                            console.log(`Fetching fresh indicator data for ${symbol}:${tf}`);
                            const indicatorData = await fetchDataForSymbolAndTimeframe(symbol, tf);
                            if (indicatorData) {
                                await redisClient.set(
                                    cacheKey,
                                    JSON.stringify(indicatorData),
                                    { EX: CACHE_CONFIG.INDICATOR_TTL }
                                );
                            }
                        } catch (error) {
                            console.error(`Error processing ${symbol}:${tf}:`, error);
                        }
                    })
                );
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        });

        await Promise.all(batchPromises);

        if (i + BATCH_SIZE < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }

    console.log('Initial data evaluation completed - data cached for both endpoints');
};

// Setup periodic cache updates
function setupPeriodicUpdates() {
    // Update indicators every 5 minutes
    setInterval(async () => {
        const symbols = await fetchBinanceSymbols();
        const validTimeframes: Timeframe[] = ['1h', '4h', '1d', '1w'];

        for (const symbol of symbols) {
            for (const tf of validTimeframes) {
                const cacheKey = `indicator:${symbol}:${tf}`;
                if (await shouldUpdateCache(cacheKey)) {
                    updateCacheInBackground(symbol, tf).catch(console.error);
                }
            }
        }
    }, 5 * 60 * 1000); // 5 minutes - clearer calculation

    // Update signals every 3 minutes
    // 3 minutes
}

// Utility function to split array into chunks
function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Start the WebSocket connection
startWebSocket();

// Wait for Redis to be connected before evaluating data
redisClient.connect()
    .then(async () => {
        console.log('Connected to Redis successfully');

        // Check if Binance API is accessible
        try {
            const exchangeInfo = await fetchBinanceExchangeInfo();
            if (!exchangeInfo) {
                throw new Error('Could not fetch exchange info');
            }
            console.log('Successfully connected to Binance API');

            // Start the application
            evaluateAllDataOnStartup();
            setupPeriodicUpdates();
        } catch (error) {
            console.error('Failed to connect to Binance API:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Redis connection error:', error);
        process.exit(1);
    });

// Start the server immediately
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
