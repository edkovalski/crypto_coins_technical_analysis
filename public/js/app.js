document.addEventListener('DOMContentLoaded', () => {
    const symbolsContainer = document.getElementById('symbolsContainer');
    const searchInput = document.getElementById('searchInput');
    const ema10_20Checkbox = document.getElementById('ema10_20_crossover');
    const ema10_20BelowCheckbox = document.getElementById('ema10_20_below_crossover');
    const ema50_200Checkbox = document.getElementById('ema50_200_crossover');
    const ema50_200BelowCheckbox = document.getElementById('ema50_200_below_crossover');
    const sma50_200Checkbox = document.getElementById('sma50_200_crossover');
    const rsiMinInput = document.getElementById('rsi_min');
    const rsiMaxInput = document.getElementById('rsi_max');
    const stochMinInput = document.getElementById('stoch_min');
    const stochMaxInput = document.getElementById('stoch_max');
    const priceAboveEma10Checkbox = document.getElementById('price_above_ema10');
    const priceAboveEma20Checkbox = document.getElementById('price_above_ema20');
    const priceBelowEma10Checkbox = document.getElementById('price_below_ema10');
    const priceBelowEma20Checkbox = document.getElementById('price_below_ema20');
    const macdHistogramPositiveCheckbox = document.getElementById('macd_histogram_positive');
    const macdHistogramNegativeCheckbox = document.getElementById('macd_histogram_negative');
    const obvPositiveCheckbox = document.getElementById('obv_positive');
    const obvNegativeCheckbox = document.getElementById('obv_negative');
    const adxWeakCheckbox = document.getElementById('adx_weak');
    const adxStrongCheckbox = document.getElementById('adx_strong');
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
                return value.toFixed(6);
            }
            // Format other numeric values
            return value.toFixed(6);
        }
        return value;
    }

    // Function to get indicator color based on value
    function getIndicatorColor(name, value, price) {
        if (name.includes('RSI')) {
            if (value > 70) return 'overbought';
            if (value < 30) return 'oversold';
            return 'neutral';
        } else if (name.includes('MACD')) {
            if (value > 0) return 'positive';
            if (value < 0) return 'negative';
            return 'neutral';
        } else if (name.includes('ADX')) {
            if (value > 25) return 'positive';
            if (value < 20) return 'negative';
            return 'neutral';
        } else if (name.includes('+DI')) {
            return 'positive';
        } else if (name.includes('-DI')) {
            return 'negative';
        } else if (name.includes('SMA') || name.includes('EMA') || name.includes('VWAP')) {
            if (price > value) return 'positive';
            if (price < value) return 'negative';
            return 'neutral';
        } else if (name.includes('CMF')) {
            if (value > 0.05) return 'positive';
            if (value < -0.05) return 'negative';
            return 'neutral';
        } else if (name.includes('Ichimoku')) {
            if (price > value) return 'positive';
            if (price < value) return 'negative';
            return 'neutral';
        }
        return 'neutral';
    }

    // Function to check if EMAs have crossed over (above)
    function checkEMACrossover(ema1, ema2) {
        return ema1 !== null && ema2 !== null && ema1 > ema2;
    }

    // Function to check if EMAs have crossed over (below)
    function checkEMABelowCrossover(ema1, ema2) {
        return ema1 !== null && ema2 !== null && ema1 < ema2;
    }

    // Function to check if SMAs have crossed over
    function checkSMACrossover(sma1, sma2) {
        return sma1 !== null && sma2 !== null && sma1 > sma2;
    }

    // Function to check if value is within range
    function isInRange(value, min, max) {
        return value !== null && value >= min && value <= max;
    }

    // Function to check if timeframe matches filter conditions
    function timeframeMatchesFilters(data) {
        if (!data) return false;

        // Get all filter states
        const ema10_20Checked = ema10_20Checkbox.checked;
        const ema10_20BelowChecked = ema10_20BelowCheckbox.checked;
        const ema50_200Checked = ema50_200Checkbox.checked;
        const ema50_200BelowChecked = ema50_200BelowCheckbox.checked;
        const sma50_200Checked = sma50_200Checkbox.checked;
        const rsiMin = parseFloat(rsiMinInput.value) || 0;
        const rsiMax = parseFloat(rsiMaxInput.value) || 100;
        const stochMin = parseFloat(stochMinInput.value) || 0;
        const stochMax = parseFloat(stochMaxInput.value) || 100;
        const priceAboveEma10Checked = priceAboveEma10Checkbox.checked;
        const priceAboveEma20Checked = priceAboveEma20Checkbox.checked;
        const priceBelowEma10Checked = priceBelowEma10Checkbox.checked;
        const priceBelowEma20Checked = priceBelowEma20Checkbox.checked;
        const macdHistogramPositiveChecked = macdHistogramPositiveCheckbox.checked;
        const macdHistogramNegativeChecked = macdHistogramNegativeCheckbox.checked;
        const obvPositiveChecked = obvPositiveCheckbox.checked;
        const obvNegativeChecked = obvNegativeCheckbox.checked;
        const adxWeakChecked = adxWeakCheckbox.checked;
        const adxStrongChecked = adxStrongCheckbox.checked;

        // If no filters are checked and ranges are at default, show all timeframes
        if (!ema10_20Checked && !ema10_20BelowChecked &&
            !ema50_200Checked && !ema50_200BelowChecked &&
            !sma50_200Checked &&
            rsiMin === 0 && rsiMax === 100 &&
            stochMin === 0 && stochMax === 100 &&
            !priceAboveEma10Checked && !priceAboveEma20Checked &&
            !priceBelowEma10Checked && !priceBelowEma20Checked &&
            !macdHistogramPositiveChecked && !macdHistogramNegativeChecked &&
            !obvPositiveChecked && !obvNegativeChecked &&
            !adxWeakChecked && !adxStrongChecked) {
            return true;
        }

        let matches = true;

        // Check EMA crossovers
        if (ema10_20Checked) {
            matches = matches && checkEMACrossover(data.ema10, data.ema20);
        }
        if (ema10_20BelowChecked) {
            matches = matches && checkEMABelowCrossover(data.ema10, data.ema20);
        }
        if (ema50_200Checked) {
            matches = matches && checkEMACrossover(data.ema50, data.ema200);
        }
        if (ema50_200BelowChecked) {
            matches = matches && checkEMABelowCrossover(data.ema50, data.ema200);
        }

        // Check SMA crossovers
        if (sma50_200Checked) {
            matches = matches && checkSMACrossover(data.sma50, data.sma200);
        }

        // Check RSI range
        matches = matches && isInRange(data.rsi, rsiMin, rsiMax);

        // Check Stochastic range
        if (data.stochastic) {
            matches = matches && isInRange(data.stochastic.k, stochMin, stochMax);
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

        // Check OBV conditions
        if (obvPositiveChecked) {
            matches = matches && data.obv !== null && data.obv.obv > 0;
        }
        if (obvNegativeChecked) {
            matches = matches && data.obv !== null && data.obv.obv < 0;
        }

        // Check ADX conditions
        if (adxWeakChecked) {
            matches = matches && data.adx !== null && data.adx.adx < 20;
        }
        if (adxStrongChecked) {
            matches = matches && data.adx !== null && data.adx.adx > 25;
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

    // Function to create indicator elements
    function createIndicatorElements(data) {
        const sections = [];

        // RSI Section
        if (data.rsi !== null) {
            sections.push({
                type: 'section',
                title: 'RSI',
                indicators: [{
                    name: 'RSI',
                    value: data.rsi,
                    color: getIndicatorColor('RSI', data.rsi)
                }]
            });
        }

        // MACD Section
        if (data.macd && data.macd.MACD !== null) {
            sections.push({
                type: 'section',
                title: 'MACD',
                indicators: [
                    {
                        name: 'MACD',
                        value: data.macd.MACD,
                        color: getIndicatorColor('MACD', data.macd.MACD)
                    },
                    {
                        name: 'Signal',
                        value: data.macd.signal,
                        color: getIndicatorColor('MACD', data.macd.signal)
                    },
                    {
                        name: 'Histogram',
                        value: data.macd.histogram,
                        color: getIndicatorColor('MACD', data.macd.histogram)
                    }
                ]
            });
        }

        // ADX Section
        if (data.adx && data.adx.adx !== null) {
            sections.push({
                type: 'section',
                title: 'ADX',
                indicators: [
                    {
                        name: 'ADX',
                        value: data.adx.adx,
                        color: getIndicatorColor('ADX', data.adx.adx)
                    },
                    {
                        name: '+DI',
                        value: data.adx.plusDI,
                        color: getIndicatorColor('+DI', data.adx.plusDI)
                    },
                    {
                        name: '-DI',
                        value: data.adx.minusDI,
                        color: getIndicatorColor('-DI', data.adx.minusDI)
                    }
                ]
            });
        }

        // Moving Averages Section
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
        if (data.vwap !== null) maIndicators.push({ name: 'VWAP', value: data.vwap });

        if (maIndicators.length > 0) {
            sections.push({
                type: 'section',
                title: 'Moving Averages',
                indicators: maIndicators.map(ma => ({
                    name: ma.name,
                    value: ma.value,
                    color: getIndicatorColor(ma.name, ma.value, data.price)
                }))
            });
        }

        // Bollinger Bands Section
        if (data.bollingerBands && data.bollingerBands.upper !== null) {
            sections.push({
                type: 'section',
                title: 'Bollinger Bands',
                indicators: [
                    {
                        name: 'Upper Band',
                        value: data.bollingerBands.upper,
                        color: 'neutral'
                    },
                    {
                        name: 'Middle Band',
                        value: data.bollingerBands.middle,
                        color: 'neutral'
                    },
                    {
                        name: 'Lower Band',
                        value: data.bollingerBands.lower,
                        color: 'neutral'
                    }
                ]
            });
        }

        // Fibonacci Section
        if (data.fibonacci && data.fibonacci.levels) {
            sections.push({
                type: 'section',
                title: 'Fibonacci',
                indicators: [
                    { name: '0%', value: data.fibonacci.levels['0'], color: 'neutral' },
                    { name: '23.6%', value: data.fibonacci.levels['0.236'], color: 'neutral' },
                    { name: '38.2%', value: data.fibonacci.levels['0.382'], color: 'neutral' },
                    { name: '50%', value: data.fibonacci.levels['0.5'], color: 'neutral' },
                    { name: '61.8%', value: data.fibonacci.levels['0.618'], color: 'neutral' },
                    { name: '100%', value: data.fibonacci.levels['1'], color: 'neutral' }
                ]
            });
        }

        // Ichimoku Cloud Section
        if (data.ichimoku && data.ichimoku.conversion !== null) {
            sections.push({
                type: 'section',
                title: 'Ichimoku Cloud',
                indicators: [
                    {
                        name: 'Conversion Line',
                        value: data.ichimoku.conversion,
                        color: getIndicatorColor('Ichimoku', data.ichimoku.conversion, data.price)
                    },
                    {
                        name: 'Base Line',
                        value: data.ichimoku.base,
                        color: getIndicatorColor('Ichimoku', data.ichimoku.base, data.price)
                    },
                    {
                        name: 'Leading Span A',
                        value: data.ichimoku.spanA,
                        color: getIndicatorColor('Ichimoku', data.ichimoku.spanA, data.price)
                    },
                    {
                        name: 'Leading Span B',
                        value: data.ichimoku.spanB,
                        color: getIndicatorColor('Ichimoku', data.ichimoku.spanB, data.price)
                    }
                ]
            });
        }

        // Volume Section
        const volumeIndicators = [];
        if (data.obv && data.obv.obv !== null) {
            volumeIndicators.push({
                name: 'OBV',
                value: data.obv.obv,
                color: getIndicatorColor('OBV', data.obv.obv)
            });
        }
        if (data.cmf !== null) {
            volumeIndicators.push({
                name: 'CMF',
                value: data.cmf,
                color: getIndicatorColor('CMF', data.cmf)
            });
        }
        if (volumeIndicators.length > 0) {
            sections.push({
                type: 'section',
                title: 'Volume',
                indicators: volumeIndicators
            });
        }

        return sections;
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

    // Add event listeners for all filters
    const filterElements = [
        ema10_20Checkbox, ema10_20BelowCheckbox,
        ema50_200Checkbox, ema50_200BelowCheckbox,
        sma50_200Checkbox,
        rsiMinInput, rsiMaxInput,
        stochMinInput, stochMaxInput,
        priceAboveEma10Checkbox, priceAboveEma20Checkbox,
        priceBelowEma10Checkbox, priceBelowEma20Checkbox,
        macdHistogramPositiveCheckbox, macdHistogramNegativeCheckbox,
        obvPositiveCheckbox, obvNegativeCheckbox,
        adxWeakCheckbox, adxStrongCheckbox,
        searchInput
    ];

    filterElements.forEach(element => {
        element.addEventListener('change', filterSymbols);
        element.addEventListener('input', filterSymbols);
    });
}); 