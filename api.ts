import axios, { AxiosRequestConfig } from 'axios';
import WebSocket from 'ws';
import rateLimit from 'axios-rate-limit';
import https from 'https';

// Configuration
const REGIONS = {
    GLOBAL: 'https://api1.binance.com/api/v3',
    US: 'https://api.binance.us/api/v3',
    // Add other regional endpoints as needed
};

const BASE_URL = REGIONS.GLOBAL;  // Change this to REGIONS.US if you're in the United States
const WEBSOCKET_BASE_URL = 'wss://stream.binance.com:9443/ws/';

const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;     // 3 seconds
const TIMEOUT = 60000;        // Increased to 60 seconds
const RATE_LIMIT = 30;        // requests per second

// Create rate-limited axios instance
const axiosInstance = rateLimit(axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    httpsAgent: new https.Agent({
        rejectUnauthorized: true,  // Enable SSL verification
        keepAlive: true
    }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    // Uncomment if you need to use a proxy
    // proxy: {
    //     host: 'your-proxy-host',
    //     port: your-proxy-port
    // }
}), { maxRPS: RATE_LIMIT });

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(request => {
    console.log('Making request to:', request.url);
    return request;
});

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (error.code === 'ECONNABORTED') {
            console.error('Request timed out');
        } else if (error.code === 'ENOTFOUND') {
            console.error('Could not resolve host');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('Connection refused');
        }
        throw error;
    }
);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithDelay = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T | null> => {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof Error) {
            console.error(`API Error: ${error.message}`);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data;
                console.error(`Status: ${status}`);
                console.error(`Response: ${JSON.stringify(data)}`);

                // Handle geographical restriction
                if (data?.code === 0 && data?.msg?.includes('Service unavailable from a restricted location')) {
                    console.error(`
ERROR: Binance API access is restricted in your region.
Possible solutions:
1. Use a VPN to access from a supported region
2. Switch to Binance US API by changing BASE_URL to REGIONS.US
3. Use an alternative cryptocurrency exchange API
For more information, visit: https://www.binance.com/en/terms
`);
                    return null;
                }

                // Handle rate limits
                if (status === 429) { // Rate limit exceeded
                    const retryAfter = parseInt(error.response?.headers['retry-after'] || '5', 10);
                    console.log(`Rate limit exceeded, waiting ${retryAfter} seconds...`);
                    await sleep(retryAfter * 1000);
                    return retryWithDelay(fn, retries); // Don't decrement retries for rate limits
                }

                if (status === 418) { // IP ban
                    console.error('IP has been auto-banned for repeated violations');
                    return null;
                }
            }
        }

        if (retries > 0) {
            const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
            console.log(`Retrying... ${retries} attempts left (waiting ${delay / 1000}s)`);
            await sleep(delay);
            return retryWithDelay(fn, retries - 1);
        }
        return null;
    }
};

export interface BinanceSymbol {
    symbol: string;
    status: string;
    // ... other properties you might need
}

export interface BinanceExchangeInfo {
    symbols: BinanceSymbol[];
    // ... other properties you might need
}

export const fetchGreedAndFearIndex = async (): Promise<number | null> => {
    try {
        const response = await retryWithDelay(() =>
            axiosInstance.get('https://api.alternative.me/fng/', {
                timeout: TIMEOUT
            })
        );
        if (!response) return null;
        if (response.data && response.data.data && response.data.data.length > 0) {
            return parseInt(response.data.data[0].value, 10);
        } else {
            console.error('Invalid Greed and Fear Index data:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Error fetching Greed and Fear Index:', error instanceof Error ? error.message : error);
        return null;
    }
};

export const fetchBinanceExchangeInfo = async (): Promise<BinanceExchangeInfo | null> => {
    try {
        const response = await retryWithDelay(() =>
            axiosInstance.get(`${BASE_URL}/exchangeInfo`, {
                timeout: TIMEOUT
            })
        );

        if (!response) return null;

        const exchangeInfo: BinanceExchangeInfo = response.data;
        if (!exchangeInfo || !exchangeInfo.symbols) {
            console.error('Invalid exchange info format');
            return null;
        }

        // Filter out USDCUSDT and USDPUSDT
        const excludedSymbols = ['USDCUSDT', 'USDPUSDT', 'EURUSDT', 'EURIUSDT', 'FDUSDUSDT', 'XUSDUSDT'];
        exchangeInfo.symbols = exchangeInfo.symbols.filter(symbolInfo => !excludedSymbols.includes(symbolInfo.symbol));

        return exchangeInfo;
    } catch (error) {
        console.error('Error fetching Binance exchange info:', error instanceof Error ? error.message : error);
        return null;
    }
};

export const fetchCandlestickData = async (symbol: string, interval: string, endTime?: number) => {
    try {
        const params: any = {
            symbol,
            interval: `${interval}`,
            limit: 300,
        };

        // Add endTime parameter if provided (for historical data)
        if (endTime) {
            params.endTime = endTime;
        }

        const response = await retryWithDelay(() =>
            axiosInstance.get(`${BASE_URL}/klines`, {
                params,
                timeout: TIMEOUT
            })
        );

        if (!response) return null;

        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            console.error(`Invalid candlestick data for ${symbol}:`, response.data);
            return null;
        }
        return response.data;
    } catch (error) {
        console.error(`Error fetching candlestick data for ${symbol}:`, error instanceof Error ? error.message : error);
        return null;
    }
};

export const createWebSocketConnection = (symbols: string[], onMessage: (data: any) => void, onError: (error: any) => void) => {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
    const ws = new WebSocket(`${WEBSOCKET_BASE_URL}${streams}`); // Use the imported WebSocket

    ws.on('open', () => { // Use 'open' event
        console.log('WebSocket connection opened');
    });

    ws.on('message', (event) => { // Use 'message' event
        const data = JSON.parse(event.toString()); // Parse the message as a string
        onMessage(data);
    });

    ws.on('error', (event) => { // Use 'error' event
        console.error('WebSocket error:', event);
        onError(event);
    });

    ws.on('close', (event) => { // Use 'close' event
        console.log('WebSocket connection closed:', event);
    });

    return ws;
};
