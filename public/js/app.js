document.addEventListener('DOMContentLoaded', () => {
    const symbolsContainer = document.getElementById('symbolsContainer');
    const searchInput = document.getElementById('searchInput');
    let allSymbols = [];

    // Function to format indicator value
    function formatIndicatorValue(name, value) {
        if (typeof value === 'number') {
            // Format RSI with 2 decimal places
            if (name.toLowerCase().includes('rsi')) {
                return value.toFixed(2);
            }
            // Format price-based indicators with 2 decimal places
            if (name.toLowerCase().includes('sma') ||
                name.toLowerCase().includes('ema') ||
                name.toLowerCase().includes('vwap')) {
                return value.toFixed(2);
            }
            // Format other numeric values
            return value.toFixed(4);
        }
        return value;
    }

    // Function to get indicator color based on value
    function getIndicatorColor(name, value, price) {
        if (typeof value === 'number' && price) {
            if (name.toLowerCase().includes('rsi')) {
                if (value > 70) return 'overbought';
                if (value < 30) return 'oversold';
            }
            if (name.toLowerCase().includes('macd')) {
                return value > 0 ? 'positive' : 'negative';
            }
            if (name.toLowerCase().includes('adx')) {
                return value > 25 ? 'positive' : 'neutral';
            }
            if (name.toLowerCase().includes('stochastic')) {
                if (value > 80) return 'overbought';
                if (value < 20) return 'oversold';
            }
            // Color moving averages based on price position
            if (name.toLowerCase().includes('sma') || name.toLowerCase().includes('ema')) {
                return price > value ? 'positive' : 'negative';
            }
        }
        return 'neutral';
    }

    // Function to create indicator elements
    function createIndicatorElements(data) {
        const indicators = [];

        // Add Moving Averages section
        const maIndicators = [];
        if (data.sma10 !== null) maIndicators.push({ name: 'SMA10', value: data.sma10 });
        if (data.sma20 !== null) maIndicators.push({ name: 'SMA20', value: data.sma20 });
        if (data.sma50 !== null) maIndicators.push({ name: 'SMA50', value: data.sma50 });
        if (data.sma100 !== null) maIndicators.push({ name: 'SMA100', value: data.sma100 });
        if (data.sma200 !== null) maIndicators.push({ name: 'SMA200', value: data.sma200 });
        if (data.ema10 !== null) maIndicators.push({ name: 'EMA10', value: data.ema10 });
        if (data.ema20 !== null) maIndicators.push({ name: 'EMA20', value: data.ema20 });
        if (data.ema50 !== null) maIndicators.push({ name: 'EMA50', value: data.ema50 });
        if (data.ema100 !== null) maIndicators.push({ name: 'EMA100', value: data.ema100 });
        if (data.ema200 !== null) maIndicators.push({ name: 'EMA200', value: data.ema200 });

        if (maIndicators.length > 0) {
            indicators.push({
                type: 'section',
                title: 'Moving Averages',
                indicators: maIndicators
            });
        }

        // Add Oscillators section
        const oscillatorIndicators = [];
        if (data.rsi !== null) oscillatorIndicators.push({ name: 'RSI', value: data.rsi });
        if (data.macd) {
            oscillatorIndicators.push({ name: 'MACD', value: data.macd.MACD });
            oscillatorIndicators.push({ name: 'Signal', value: data.macd.signal });
            oscillatorIndicators.push({ name: 'Histogram', value: data.macd.histogram });
        }
        if (data.stochastic) {
            oscillatorIndicators.push({ name: 'Stoch K', value: data.stochastic.k });
            oscillatorIndicators.push({ name: 'Stoch D', value: data.stochastic.d });
        }

        if (oscillatorIndicators.length > 0) {
            indicators.push({
                type: 'section',
                title: 'Oscillators',
                indicators: oscillatorIndicators
            });
        }

        // Add Trend section
        const trendIndicators = [];
        if (data.adx) {
            trendIndicators.push({ name: 'ADX', value: data.adx.adx });
            trendIndicators.push({ name: '+DI', value: data.adx.plusDI });
            trendIndicators.push({ name: '-DI', value: data.adx.minusDI });
        }
        if (data.vwap !== null) trendIndicators.push({ name: 'VWAP', value: data.vwap });

        if (trendIndicators.length > 0) {
            indicators.push({
                type: 'section',
                title: 'Trend',
                indicators: trendIndicators
            });
        }

        // Add Volume section
        const volumeIndicators = [];
        if (data.obv) {
            volumeIndicators.push({ name: 'OBV', value: data.obv.obv });
            volumeIndicators.push({ name: 'OBV SMA', value: data.obv.obvSma });
        }

        if (volumeIndicators.length > 0) {
            indicators.push({
                type: 'section',
                title: 'Volume',
                indicators: volumeIndicators
            });
        }

        return indicators;
    }

    // Function to create a symbol card
    function createSymbolCard(symbol, data) {
        const card = document.createElement('div');
        card.className = 'symbol-card';

        const header = document.createElement('div');
        header.className = 'symbol-header';

        const symbolName = document.createElement('div');
        symbolName.className = 'symbol-name';
        symbolName.textContent = symbol;

        const timeframeData = document.createElement('div');
        timeframeData.className = 'timeframe-data';

        // Add each timeframe's data
        data.forEach(item => {
            if (item.data) {
                const timeframeItem = document.createElement('div');
                timeframeItem.className = 'timeframe-item';

                const timeframeHeader = document.createElement('div');
                timeframeHeader.className = 'timeframe-header';

                const label = document.createElement('span');
                label.className = 'timeframe-label';
                label.textContent = item.timeframe;

                const price = document.createElement('span');
                price.className = 'timeframe-price';
                price.textContent = item.data.price ? `$${item.data.price}` : 'No data';

                timeframeHeader.appendChild(label);
                timeframeHeader.appendChild(price);
                timeframeItem.appendChild(timeframeHeader);

                // Add indicators section
                const indicators = document.createElement('div');
                indicators.className = 'indicators';

                // Create and add indicator elements
                const indicatorElements = createIndicatorElements(item.data);
                indicatorElements.forEach(section => {
                    const sectionElement = document.createElement('div');
                    sectionElement.className = 'indicator-section';

                    const sectionTitle = document.createElement('h3');
                    sectionTitle.className = 'section-title';
                    sectionTitle.textContent = section.title;
                    sectionElement.appendChild(sectionTitle);

                    const sectionIndicators = document.createElement('div');
                    sectionIndicators.className = 'section-indicators';

                    section.indicators.forEach(indicator => {
                        const indicatorElement = document.createElement('div');
                        indicatorElement.className = `indicator ${getIndicatorColor(indicator.name, indicator.value, item.data.price)}`;

                        const indicatorName = document.createElement('span');
                        indicatorName.className = 'indicator-name';
                        indicatorName.textContent = indicator.name;

                        const indicatorValue = document.createElement('span');
                        indicatorValue.className = 'indicator-value';
                        indicatorValue.textContent = formatIndicatorValue(indicator.name, indicator.value);

                        indicatorElement.appendChild(indicatorName);
                        indicatorElement.appendChild(indicatorValue);
                        sectionIndicators.appendChild(indicatorElement);
                    });

                    sectionElement.appendChild(sectionIndicators);
                    indicators.appendChild(sectionElement);
                });

                timeframeItem.appendChild(indicators);
                timeframeData.appendChild(timeframeItem);
            }
        });

        header.appendChild(symbolName);
        card.appendChild(header);
        card.appendChild(timeframeData);

        return card;
    }

    // Function to fetch symbols from the API
    async function fetchSymbols() {
        try {
            const response = await fetch('/symbols');
            const symbols = await response.json();
            return symbols;
        } catch (error) {
            console.error('Error fetching symbols:', error);
            return [];
        }
    }

    // Function to fetch data for a symbol
    async function fetchSymbolData(symbol) {
        try {
            const response = await fetch(`/data/${symbol}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return null;
        }
    }

    // Function to fetch and display symbols
    async function fetchAndDisplaySymbols() {
        try {
            symbolsContainer.innerHTML = '<div class="loading">Loading symbols...</div>';

            // Fetch available symbols
            const symbols = await fetchSymbols();
            allSymbols = symbols;

            symbolsContainer.innerHTML = '<div class="loading">Loading data...</div>';

            // Fetch data for each symbol
            const symbolDataPromises = symbols.map(async (symbol) => {
                const data = await fetchSymbolData(symbol);
                return { symbol, data };
            });

            const symbolData = await Promise.all(symbolDataPromises);

            // Display the data
            symbolsContainer.innerHTML = '';
            symbolData.forEach(({ symbol, data }) => {
                if (data) {
                    const card = createSymbolCard(symbol, data);
                    symbolsContainer.appendChild(card);
                }
            });
        } catch (error) {
            console.error('Error:', error);
            symbolsContainer.innerHTML = '<div class="loading">Error loading data. Please try again later.</div>';
        }
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.symbol-card');

        cards.forEach(card => {
            const symbolName = card.querySelector('.symbol-name').textContent.toLowerCase();
            card.style.display = symbolName.includes(searchTerm) ? 'block' : 'none';
        });
    });

    // Initial data fetch
    fetchAndDisplaySymbols();

    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket(`ws://${window.location.hostname}:3000/ws`);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const cards = document.querySelectorAll('.symbol-card');

        cards.forEach(card => {
            const symbolName = card.querySelector('.symbol-name').textContent;
            if (symbolName === data.symbol) {
                const timeframeItems = card.querySelectorAll('.timeframe-item');
                timeframeItems.forEach(item => {
                    const price = item.querySelector('.timeframe-price');
                    if (price) {
                        price.textContent = `$${data.price}`;
                    }
                });
            }
        });
    };
}); 