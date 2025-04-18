document.addEventListener('DOMContentLoaded', () => {
    const symbolsContainer = document.getElementById('symbolsContainer');
    const searchInput = document.getElementById('searchInput');
    const ema10_20Checkbox = document.getElementById('ema10_20_crossover');
    const ema50_200Checkbox = document.getElementById('ema50_200_crossover');
    const sma50_200Checkbox = document.getElementById('sma50_200_crossover');
    const rsiOversoldCheckbox = document.getElementById('rsi_oversold');
    const rsiOverboughtCheckbox = document.getElementById('rsi_overbought');
    const priceAboveEma10Checkbox = document.getElementById('price_above_ema10');
    const priceAboveEma20Checkbox = document.getElementById('price_above_ema20');
    const priceBelowEma10Checkbox = document.getElementById('price_below_ema10');
    const priceBelowEma20Checkbox = document.getElementById('price_below_ema20');
    const macdHistogramPositiveCheckbox = document.getElementById('macd_histogram_positive');
    const macdHistogramNegativeCheckbox = document.getElementById('macd_histogram_negative');
    const obvPositiveCheckbox = document.getElementById('obv_positive');
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

    // Function to check if EMAs have crossed over
    function checkEMACrossover(ema1, ema2) {
        return ema1 !== null && ema2 !== null && ema1 > ema2;
    }

    // Function to check if SMAs have crossed over
    function checkSMACrossover(sma1, sma2) {
        return sma1 !== null && sma2 !== null && sma1 > sma2;
    }

    // Function to check if timeframe matches filter conditions
    function timeframeMatchesFilters(data) {
        if (!data) return false;

        // Get all checkbox states
        const ema10_20Checked = ema10_20Checkbox.checked;
        const ema50_200Checked = ema50_200Checkbox.checked;
        const sma50_200Checked = sma50_200Checkbox.checked;
        const rsiOversoldChecked = rsiOversoldCheckbox.checked;
        const rsiOverboughtChecked = rsiOverboughtCheckbox.checked;
        const priceAboveEma10Checked = priceAboveEma10Checkbox.checked;
        const priceAboveEma20Checked = priceAboveEma20Checkbox.checked;
        const priceBelowEma10Checked = priceBelowEma10Checkbox.checked;
        const priceBelowEma20Checked = priceBelowEma20Checkbox.checked;
        const macdHistogramPositiveChecked = macdHistogramPositiveCheckbox.checked;
        const macdHistogramNegativeChecked = macdHistogramNegativeCheckbox.checked;
        const obvPositiveChecked = obvPositiveCheckbox.checked;

        // If no filters are checked, show all timeframes
        if (!ema10_20Checked && !ema50_200Checked && !sma50_200Checked &&
            !rsiOversoldChecked && !rsiOverboughtChecked &&
            !priceAboveEma10Checked && !priceAboveEma20Checked &&
            !priceBelowEma10Checked && !priceBelowEma20Checked &&
            !macdHistogramPositiveChecked && !macdHistogramNegativeChecked &&
            !obvPositiveChecked) {
            return true;
        }

        let matches = true;

        // Check EMA crossovers
        if (ema10_20Checked) {
            matches = matches && checkEMACrossover(data.ema10, data.ema20);
        }
        if (ema50_200Checked) {
            matches = matches && checkEMACrossover(data.ema50, data.ema200);
        }

        // Check SMA crossovers
        if (sma50_200Checked) {
            matches = matches && checkSMACrossover(data.sma50, data.sma200);
        }

        // Check RSI conditions
        if (rsiOversoldChecked) {
            matches = matches && data.rsi !== null && data.rsi < 30;
        }
        if (rsiOverboughtChecked) {
            matches = matches && data.rsi !== null && data.rsi > 70;
        }

        // Check Price vs EMA conditions
        if (priceAboveEma10Checked) {
            matches = matches && data.price !== null && data.ema10 !== null && data.price > data.ema10;
        }
        if (priceAboveEma20Checked) {
            matches = matches && data.price !== null && data.ema20 !== null && data.price > data.ema20;
        }
        if (priceBelowEma10Checked) {
            matches = matches && data.price !== null && data.ema10 !== null && data.price < data.ema10;
        }
        if (priceBelowEma20Checked) {
            matches = matches && data.price !== null && data.ema20 !== null && data.price < data.ema20;
        }

        // Check MACD conditions
        if (macdHistogramPositiveChecked) {
            matches = matches && data.macd !== null && data.macd.histogram > 0;
        }
        if (macdHistogramNegativeChecked) {
            matches = matches && data.macd !== null && data.macd.histogram < 0;
        }

        // Check OBV condition
        if (obvPositiveChecked) {
            matches = matches && data.obv !== null && data.obv.obv > 0;
        }

        return matches;
    }

    // Function to filter symbols based on search and conditions
    function filterSymbols() {
        const searchTerm = searchInput.value.toLowerCase();
        const cards = document.querySelectorAll('.symbol-card');

        cards.forEach(card => {
            const symbolName = card.querySelector('.symbol-name').textContent.toLowerCase();
            const timeframeItems = card.querySelectorAll('.timeframe-item');
            let hasVisibleTimeframes = false;

            timeframeItems.forEach(item => {
                const timeframeData = item.dataset.timeframeData ? JSON.parse(item.dataset.timeframeData) : null;
                const matchesFilters = timeframeMatchesFilters(timeframeData);
                const matchesSearch = symbolName.includes(searchTerm);

                if (matchesFilters && matchesSearch) {
                    item.style.display = 'block';
                    hasVisibleTimeframes = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show/hide the entire card based on whether any timeframes are visible
            card.style.display = hasVisibleTimeframes ? 'block' : 'none';
        });
    }

    // Add event listeners for all checkboxes and search input
    const filterElements = [
        ema10_20Checkbox, ema50_200Checkbox, sma50_200Checkbox,
        rsiOversoldCheckbox, rsiOverboughtCheckbox,
        priceAboveEma10Checkbox, priceAboveEma20Checkbox,
        priceBelowEma10Checkbox, priceBelowEma20Checkbox,
        macdHistogramPositiveCheckbox, macdHistogramNegativeCheckbox,
        obvPositiveCheckbox, searchInput
    ];

    filterElements.forEach(element => {
        element.addEventListener('change', filterSymbols);
    });

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
                timeframeItem.dataset.timeframeData = JSON.stringify(item.data);

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