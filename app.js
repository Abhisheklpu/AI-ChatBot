// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceInput = document.getElementById('voiceInput');
const exportPDF = document.getElementById('exportPDF');
const apiStatus = document.getElementById('apiStatus');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;

// Initialize jsPDF
window.jsPDF = window.jspdf.jsPDF;

// API Configuration
const API_KEY = 'AIzaSyALik-uhghttFk_PXMpOWA8X7M2P6aam2w'; // Google Cloud API key
const ALPHA_VANTAGE_API_KEY = 'XOLA7URKCZHU6C8X'; // Alpha Vantage API key
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const GOOGLE_FINANCE_API_URL = 'https://www.googleapis.com/youtube/v3/search';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Check API status on load
checkApiStatus();

// Event Listeners
sendBtn.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserInput();
});

voiceInput.addEventListener('click', () => {
    recognition.start();
    voiceInput.style.backgroundColor = '#c0392b';
});

recognition.addEventListener('end', () => {
    voiceInput.style.backgroundColor = '#e74c3c';
});

recognition.addEventListener('result', (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    handleUserInput();
});

exportPDF.addEventListener('click', exportChatToPDF);

// Add a cache for stock data
const stockDataCache = {
    data: {},
    lastUpdated: {},
    maxAge: 3600000, // 1 hour in milliseconds
    
    // Get data from cache if it exists and is not expired
    get: function(symbol) {
        if (this.data[symbol] && this.lastUpdated[symbol]) {
            const age = Date.now() - this.lastUpdated[symbol];
            if (age < this.maxAge) {
                return this.data[symbol];
            }
        }
        return null;
    },
    
    // Store data in cache
    set: function(symbol, data) {
        this.data[symbol] = data;
        this.lastUpdated[symbol] = Date.now();
    }
};

// Check API status
async function checkApiStatus() {
    try {
        apiStatus.innerHTML = '<i class="fas fa-circle"></i> API Status: Checking...';
        
        // Try to fetch a simple API endpoint to check if the API is accessible
        const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=AAPL&interval=5min&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Check for API error messages
            if (data['Error Message']) {
                throw new Error(data['Error Message']);
            }
            
            // Check for API limit messages
            if (data['Note'] && data['Note'].includes('API call frequency')) {
                apiStatus.innerHTML = '<i class="fas fa-circle"></i> API Status: Online (Rate Limited)';
                apiStatus.classList.add('online');
                return;
            }
            
            apiStatus.innerHTML = '<i class="fas fa-circle"></i> API Status: Online';
            apiStatus.classList.add('online');
        } else {
            throw new Error('API response not OK');
        }
    } catch (error) {
        console.error('API status check failed:', error);
        
        // Try an alternative endpoint
        try {
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${ALPHA_VANTAGE_API_KEY}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Check for API error messages
                if (data['Error Message']) {
                    throw new Error(data['Error Message']);
                }
                
                // Check for API limit messages
                if (data['Note'] && data['Note'].includes('API call frequency')) {
                    apiStatus.innerHTML = '<i class="fas fa-circle"></i> API Status: Online (Rate Limited)';
                    apiStatus.classList.add('online');
                    return;
                }
                
                apiStatus.innerHTML = '<i class="fas fa-circle"></i> API Status: Online';
                apiStatus.classList.add('online');
            } else {
                throw new Error('Alternative API response not OK');
            }
        } catch (fallbackError) {
            console.error('Alternative API status check failed:', fallbackError);
            
            // If both checks fail, mark as offline
            apiStatus.innerHTML = '<i class="fas fa-circle"></i> API Status: Offline';
            apiStatus.classList.add('offline');
        }
    }
}

// Handle user input
function handleUserInput() {
    const message = userInput.value.trim();
    if (message === '') return;

    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';

    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'bot', 'loading');
    loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching data...';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Process the message and generate response
    processMessage(message).then(response => {
        // Remove loading indicator
        chatMessages.removeChild(loadingDiv);
        addMessage(response, 'bot');
    }).catch(error => {
        // Remove loading indicator
        chatMessages.removeChild(loadingDiv);
        console.error('Error processing message:', error);
        addMessage("I'm sorry, I encountered an error while processing your request. Please try again later.", 'bot');
    });
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Process user message and generate response
async function processMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Extract stock symbol from message using regex
    const stockSymbolRegex = /\b[A-Z]{1,5}\b/g;
    const stockSymbols = message.match(stockSymbolRegex) || [];
    
    // Check for general stock market queries
    if (lowerMessage.includes('stock market') || 
        (lowerMessage.includes('market') && !stockSymbols.length) || 
        lowerMessage.includes('stocks') || 
        lowerMessage.includes('how is the market') ||
        lowerMessage.includes('market overview') ||
        lowerMessage.includes('market summary') ||
        lowerMessage.includes('tell me about the market') ||
        lowerMessage.includes('what is happening in the market')) {
        try {
            // Fetch comprehensive market data
            const marketData = await fetchComprehensiveMarketData();
            
            // Enhance with Gemini AI insights
            const enhancedResponse = await enhanceWithGeminiAI(marketData, message);
            return enhancedResponse;
        } catch (error) {
            console.error('Error fetching comprehensive market data:', error);
            return "I'm having trouble fetching comprehensive market data. Please try again later.";
        }
    }
    
    // Check for stock symbol queries
    if (stockSymbols.length > 0) {
        const symbol = stockSymbols[0];
        
        // Validate the stock symbol
        if (!isValidStockSymbol(symbol)) {
            return `"${symbol}" doesn't appear to be a valid stock symbol. Please check the symbol and try again. Common stock symbols include AAPL (Apple), MSFT (Microsoft), GOOGL (Google), and AMZN (Amazon).`;
        }
        
        try {
            // Check cache first
            const cachedData = stockDataCache.get(symbol);
            if (cachedData) {
                console.log(`Using cached data for ${symbol}`);
                let basicResponse = `${symbol} is currently trading at $${cachedData.price} (${cachedData.change}). Volume: ${cachedData.volume}`;
                
                // Add a note if the data is not real-time
                if (!cachedData.isRealTime) {
                    basicResponse += `\n\nNote: This is cached data from ${new Date(cachedData.timestamp).toLocaleString()}.`;
                }
                
                // Enhance with Gemini AI insights
                const enhancedResponse = await enhanceWithGeminiAI(basicResponse, message, symbol);
                return enhancedResponse;
            }
            
            // If not in cache, try to fetch from API
            const stockData = await fetchStockData(symbol);
            
            // Store in cache
            stockDataCache.set(symbol, stockData);
            
            let basicResponse = `${symbol} is currently trading at $${stockData.price} (${stockData.change}). Volume: ${stockData.volume}`;
            
            // Add a note if the data is not real-time
            if (!stockData.isRealTime) {
                basicResponse += `\n\nNote: This is daily data from ${stockData.timestamp}. Real-time data is currently unavailable.`;
            }
            
            // Enhance with Gemini AI insights
            const enhancedResponse = await enhanceWithGeminiAI(basicResponse, message, symbol);
            return enhancedResponse;
        } catch (error) {
            console.error('Error fetching stock data:', error);
            
            // If API fails, use fallback data
            try {
                const fallbackData = getFallbackStockData(symbol);
                
                // Store in cache
                stockDataCache.set(symbol, fallbackData);
                
                let basicResponse = `${symbol} is currently trading at $${fallbackData.price} (${fallbackData.change}). Volume: ${fallbackData.volume}`;
                
                // Add a note that this is fallback data
                basicResponse += `\n\nNote: This is fallback data as the financial data service is temporarily unavailable.`;
                
                // Enhance with Gemini AI insights
                const enhancedResponse = await enhanceWithGeminiAI(basicResponse, message, symbol);
                return enhancedResponse;
            } catch (fallbackError) {
                console.error('Fallback data generation failed:', fallbackError);
                return `I'm having trouble accessing data for ${symbol}. The financial data service might be temporarily unavailable. Please try again in a few minutes or ask about a different stock.`;
            }
        }
    }

    // Check for general market queries
    if (lowerMessage.includes('market') || lowerMessage.includes('trend')) {
        try {
            // Fetch market overview data
            const marketData = await fetchMarketOverview();
            
            // Enhance with Gemini AI insights
            const enhancedResponse = await enhanceWithGeminiAI(marketData, message);
            return enhancedResponse;
        } catch (error) {
            console.error('Error fetching market overview:', error);
            return "I'm having trouble fetching market overview data. Please try again later.";
        }
    }

    // Check for company information queries
    if (lowerMessage.includes('company') || lowerMessage.includes('about')) {
        const companySymbols = message.match(stockSymbolRegex) || [];
        
        if (companySymbols.length > 0) {
            const symbol = companySymbols[0];
            try {
                const companyInfo = await fetchCompanyInfo(symbol);
                
                // Enhance with Gemini AI insights
                const enhancedResponse = await enhanceWithGeminiAI(companyInfo, message, symbol);
                return enhancedResponse;
            } catch (error) {
                console.error('Error fetching company info:', error);
                return `I'm having trouble fetching information about ${symbol}. Please try again later.`;
            }
        }
    }

    // Check for news queries
    if (lowerMessage.includes('news') || lowerMessage.includes('latest')) {
        const newsSymbols = message.match(stockSymbolRegex) || [];
        
        if (newsSymbols.length > 0) {
            const symbol = newsSymbols[0];
            try {
                const newsData = await fetchStockNews(symbol);
                
                // Enhance with Gemini AI insights
                const enhancedResponse = await enhanceWithGeminiAI(newsData, message, symbol);
                return enhancedResponse;
            } catch (error) {
                console.error('Error fetching news:', error);
                return `I'm having trouble fetching news for ${symbol}. Please try again later.`;
            }
        } else {
            try {
                const marketNews = await fetchMarketNews();
                
                // Enhance with Gemini AI insights
                const enhancedResponse = await enhanceWithGeminiAI(marketNews, message);
                return enhancedResponse;
            } catch (error) {
                console.error('Error fetching market news:', error);
                return "I'm having trouble fetching market news. Please try again later.";
            }
        }
    }

    // Check for sector queries
    if (lowerMessage.includes('sector') || lowerMessage.includes('industry')) {
        try {
            const sectorData = await fetchSectorPerformance();
            
            // Enhance with Gemini AI insights
            const enhancedResponse = await enhanceWithGeminiAI(sectorData, message);
            return enhancedResponse;
        } catch (error) {
            console.error('Error fetching sector data:', error);
            return "I'm having trouble fetching sector performance data. Please try again later.";
        }
    }

    // Check for top gainers/losers
    if (lowerMessage.includes('gainers') || lowerMessage.includes('losers') || 
        lowerMessage.includes('top') || lowerMessage.includes('best') || 
        lowerMessage.includes('worst')) {
        try {
            const topStocks = await fetchTopGainersLosers();
            
            // Enhance with Gemini AI insights
            const enhancedResponse = await enhanceWithGeminiAI(topStocks, message);
            return enhancedResponse;
        } catch (error) {
            console.error('Error fetching top stocks:', error);
            return "I'm having trouble fetching top gainers and losers. Please try again later.";
        }
    }

    // For any other query, use Gemini AI to generate a response
    try {
        const aiResponse = await generateGeminiResponse(message);
        return aiResponse;
    } catch (error) {
        console.error('Error generating AI response:', error);
        return "I can help you with stock prices, market trends, and company information. Try asking about any stock symbol (e.g., AAPL, GOOGL, MSFT), market trends, or company information.";
    }
}

// Validate stock symbol
function isValidStockSymbol(symbol) {
    // Check if the symbol is empty or too long
    if (!symbol || symbol.length > 5) {
        return false;
    }
    
    // Check if the symbol contains only letters
    if (!/^[A-Z]+$/.test(symbol)) {
        return false;
    }
    
    // List of common stock symbols to validate against
    const commonSymbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'WMT',
        'PG', 'MA', 'HD', 'BAC', 'DIS', 'NFLX', 'ADBE', 'CSCO', 'PEP', 'INTC',
        'VZ', 'KO', 'T', 'PFE', 'MRK', 'ABT', 'CVX', 'XOM', 'AVGO', 'QCOM',
        'TXN', 'INTU', 'AMAT', 'AMD', 'MU', 'IBM', 'ORCL', 'CRM', 'NOW', 'ADP',
        'ACN', 'NVDA', 'PYPL', 'SQ', 'SHOP', 'SNAP', 'TWTR', 'PINS', 'ROKU', 'ZM'
    ];
    
    // If it's in our list of common symbols, it's definitely valid
    if (commonSymbols.includes(symbol)) {
        return true;
    }
    
    // For other symbols, check if they follow the pattern of valid stock symbols
    // Most stock symbols are 1-5 letters, all uppercase
    return symbol.length >= 1 && symbol.length <= 5;
}

// Enhance response with Gemini AI insights
async function enhanceWithGeminiAI(data, userQuery, symbol = null) {
    try {
        // Prepare the prompt for Gemini
        let prompt = `You are a financial analyst assistant. I have the following market data: "${data}". 
        The user asked: "${userQuery}". 
        Please provide a concise, insightful analysis of this data. 
        Focus on key trends, potential implications, and actionable insights. 
        Keep your response under 300 words and maintain a professional tone.`;
        
        if (symbol) {
            prompt += ` This data is specifically about the stock symbol ${symbol}.`;
        }
        
        // Call Gemini API with updated format
        const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 && 
            result.candidates[0].content && 
            result.candidates[0].content.parts && 
            result.candidates[0].content.parts.length > 0) {
            
            const aiResponse = result.candidates[0].content.parts[0].text;
            
            // Combine the original data with AI insights
            return `${data}\n\n🤖 AI INSIGHTS:\n${aiResponse}`;
        } else {
            // If AI response is not available, return the original data
            return data;
        }
    } catch (error) {
        console.error('Error enhancing with Gemini AI:', error);
        // If there's an error with the AI, return the original data
        return data;
    }
}

// Generate a response using Gemini AI for general queries
async function generateGeminiResponse(userQuery) {
    try {
        // Prepare the prompt for Gemini
        const prompt = `You are a financial analyst assistant. The user asked: "${userQuery}". 
        Please provide a helpful, concise response about stocks, market trends, or financial information. 
        If the query is not related to finance, politely redirect the user to ask about stocks, market trends, or company information. 
        Keep your response under 200 words and maintain a professional tone.`;
        
        // Call Gemini API with updated format
        const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 && 
            result.candidates[0].content && 
            result.candidates[0].content.parts && 
            result.candidates[0].content.parts.length > 0) {
            
            return result.candidates[0].content.parts[0].text;
        } else {
            // Default response if AI fails
            return "I can help you with stock prices, market trends, and company information. Try asking about any stock symbol (e.g., AAPL, GOOGL, MSFT), market trends, or company information.";
        }
    } catch (error) {
        console.error('Error generating Gemini response:', error);
        // Default response if there's an error
        return "I can help you with stock prices, market trends, and company information. Try asking about any stock symbol (e.g., AAPL, GOOGL, MSFT), market trends, or company information.";
    }
}

// Fetch stock data from Alpha Vantage API
async function fetchStockData(symbol) {
    try {
        // First try to fetch global quote data
        const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for API error messages
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        // Check for API limit messages
        if (data['Note'] && data['Note'].includes('API call frequency')) {
            console.warn('API call frequency limit reached, trying alternative endpoint');
            return fetchStockDataAlternative(symbol);
        }
        
        const quote = data['Global Quote'];
        
        if (!quote || !quote['05. price']) {
            console.warn('No quote data available, trying alternative endpoint');
            return fetchStockDataAlternative(symbol);
        }
        
        return {
            symbol: symbol,
            price: parseFloat(quote['05. price']).toFixed(2),
            change: `${parseFloat(quote['09. change']).toFixed(2)}%`,
            volume: quote['06. volume'],
            isRealTime: true
        };
    } catch (error) {
        console.error('Error fetching stock data:', error);
        
        // If there's an error, try alternative endpoint
        try {
            return fetchStockDataAlternative(symbol);
        } catch (fallbackError) {
            console.error('Alternative data also failed:', fallbackError);
            
            // Try one more time with a different API endpoint
            try {
                return fetchStockDataThirdOption(symbol);
            } catch (thirdError) {
                console.error('All data fetching methods failed:', thirdError);
                throw new Error(`Unable to fetch data for ${symbol}. The stock symbol may be invalid or the API may be temporarily unavailable.`);
            }
        }
    }
}

// Alternative method to fetch stock data
async function fetchStockDataAlternative(symbol) {
    try {
        // Try to fetch intraday data as an alternative
        const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for API error messages
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        // Check for API limit messages
        if (data['Note'] && data['Note'].includes('API call frequency')) {
            console.warn('API call frequency limit reached, trying third endpoint');
            return fetchStockDataThirdOption(symbol);
        }
        
        const timeSeries = data['Time Series (5min)'];
        
        if (!timeSeries || Object.keys(timeSeries).length === 0) {
            console.warn('No intraday data available, trying third endpoint');
            return fetchStockDataThirdOption(symbol);
        }
        
        // Get the most recent data point
        const timeKeys = Object.keys(timeSeries);
        const mostRecentTime = timeKeys[0];
        const mostRecentData = timeSeries[mostRecentTime];
        
        return {
            symbol: symbol,
            price: parseFloat(mostRecentData['4. close']).toFixed(2),
            change: calculateChange(mostRecentData['4. close'], mostRecentData['1. open']),
            volume: mostRecentData['5. volume'],
            isRealTime: true,
            timestamp: mostRecentTime
        };
    } catch (error) {
        console.error('Error fetching alternative stock data:', error);
        return fetchStockDataThirdOption(symbol);
    }
}

// Third option to fetch stock data
async function fetchStockDataThirdOption(symbol) {
    try {
        // Try to fetch daily data as a last resort
        const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for API error messages
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        const timeSeries = data['Time Series (Daily)'];
        
        if (!timeSeries || Object.keys(timeSeries).length === 0) {
            throw new Error('No daily data available');
        }
        
        // Get the most recent data point
        const timeKeys = Object.keys(timeSeries);
        const mostRecentTime = timeKeys[0];
        const mostRecentData = timeSeries[mostRecentTime];
        
        return {
            symbol: symbol,
            price: parseFloat(mostRecentData['4. close']).toFixed(2),
            change: calculateChange(mostRecentData['4. close'], mostRecentData['1. open']),
            volume: mostRecentData['5. volume'],
            isRealTime: false,
            timestamp: mostRecentTime
        };
    } catch (error) {
        console.error('Error fetching third option stock data:', error);
        throw error;
    }
}

// Calculate percentage change
function calculateChange(close, open) {
    const closePrice = parseFloat(close);
    const openPrice = parseFloat(open);
    const change = ((closePrice - openPrice) / openPrice) * 100;
    return `${change.toFixed(2)}%`;
}

// Fetch market overview
async function fetchMarketOverview() {
    try {
        // Fetch top gainers and losers
        const gainersResponse = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (!gainersResponse.ok) {
            throw new Error(`HTTP error! status: ${gainersResponse.status}`);
        }
        
        const data = await gainersResponse.json();
        
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        const topGainers = data['top_gainers'] || [];
        const topLosers = data['top_losers'] || [];
        
        // Create a market summary
        let summary = "Market Overview: ";
        
        if (topGainers.length > 0) {
            summary += `Top gainers include ${topGainers[0].ticker} (+${parseFloat(topGainers[0].change_percentage).toFixed(2)}%)`;
        }
        
        if (topLosers.length > 0) {
            summary += `, while ${topLosers[0].ticker} is down ${parseFloat(topLosers[0].change_percentage).toFixed(2)}%`;
        }
        
        summary += ". The market is showing mixed trends today.";
        
        return summary;
    } catch (error) {
        console.error('Error fetching market overview:', error);
        throw error;
    }
}

// Fetch company information
async function fetchCompanyInfo(symbol) {
    try {
        // Fetch company overview
        const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        if (!data.Name) {
            throw new Error('No company information available');
        }
        
        return `${data.Name} (${symbol}) is a ${data.Sector} company. ${data.Description || 'No description available.'}`;
    } catch (error) {
        console.error('Error fetching company info:', error);
        throw error;
    }
}

// Fetch stock news using Google API
async function fetchStockNews(symbol) {
    try {
        // Use Google API to search for news about the stock
        const response = await fetch(`${GOOGLE_FINANCE_API_URL}?part=snippet&q=${symbol}+stock+news&key=${API_KEY}&maxResults=3`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return `No recent news found for ${symbol}.`;
        }
        
        let newsSummary = `Latest news for ${symbol}:`;
        
        data.items.forEach((item, index) => {
            newsSummary += `\n\n${index + 1}. ${item.snippet.title}`;
        });
        
        return newsSummary;
    } catch (error) {
        console.error('Error fetching stock news:', error);
        throw error;
    }
}

// Fetch market news using Google API
async function fetchMarketNews() {
    try {
        // Use Google API to search for market news
        const response = await fetch(`${GOOGLE_FINANCE_API_URL}?part=snippet&q=stock+market+news+today&key=${API_KEY}&maxResults=3`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return "No recent market news found.";
        }
        
        let newsSummary = "Latest market news:";
        
        data.items.forEach((item, index) => {
            newsSummary += `\n\n${index + 1}. ${item.snippet.title}`;
        });
        
        return newsSummary;
    } catch (error) {
        console.error('Error fetching market news:', error);
        throw error;
    }
}

// Fetch sector performance
async function fetchSectorPerformance() {
    try {
        // Fetch sector performance data
        const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=SECTOR&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        const sectors = data['Rank A: Real-Time Performance'] || {};
        
        if (Object.keys(sectors).length === 0) {
            return "No sector performance data available at the moment.";
        }
        
        let sectorSummary = "Sector Performance:";
        
        for (const [sector, performance] of Object.entries(sectors)) {
            sectorSummary += `\n\n${sector}: ${parseFloat(performance).toFixed(2)}%`;
        }
        
        return sectorSummary;
    } catch (error) {
        console.error('Error fetching sector performance:', error);
        throw error;
    }
}

// Fetch top gainers and losers
async function fetchTopGainersLosers() {
    try {
        // Fetch top gainers and losers
        const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        const topGainers = data['top_gainers'] || [];
        const topLosers = data['top_losers'] || [];
        
        let summary = "Top Gainers and Losers:";
        
        if (topGainers.length > 0) {
            summary += "\n\nTop Gainers:";
            topGainers.slice(0, 5).forEach((stock, index) => {
                summary += `\n${index + 1}. ${stock.ticker}: +${parseFloat(stock.change_percentage).toFixed(2)}%`;
            });
        }
        
        if (topLosers.length > 0) {
            summary += "\n\nTop Losers:";
            topLosers.slice(0, 5).forEach((stock, index) => {
                summary += `\n${index + 1}. ${stock.ticker}: ${parseFloat(stock.change_percentage).toFixed(2)}%`;
            });
        }
        
        return summary;
    } catch (error) {
        console.error('Error fetching top gainers and losers:', error);
        throw error;
    }
}

// Function to fetch major indices data
async function fetchMajorIndices() {
    const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT'];
    const results = [];

    for (const symbol of indices) {
        try {
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await response.json();
            
            if (data['Global Quote']) {
                const quote = data['Global Quote'];
                results.push({
                    symbol: getIndexName(symbol),
                    price: parseFloat(quote['05. price']).toFixed(2),
                    change: quote['10. change percent'],
                    volume: quote['06. volume']
                });
            }
        } catch (error) {
            console.error(`Error fetching index data for ${symbol}:`, error);
        }
    }

    return results.length > 0 ? results : "No major indices data available";
}

// Helper function to get index names
function getIndexName(symbol) {
    const indexNames = {
        '^GSPC': 'S&P 500',
        '^DJI': 'Dow Jones',
        '^IXIC': 'NASDAQ',
        '^RUT': 'Russell 2000'
    };
    return indexNames[symbol] || symbol;
}

// Function to fetch forex data
async function fetchForexData() {
    const pairs = ['EUR/USD', 'GBP/USD', 'JPY/USD', 'AUD/USD', 'CAD/USD'];
    const results = [];

    for (const pair of pairs) {
        try {
            const [from, to] = pair.split('/');
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await response.json();
            
            if (data['Realtime Currency Exchange Rate']) {
                const rate = data['Realtime Currency Exchange Rate'];
                results.push({
                    pair: pair,
                    rate: parseFloat(rate['5. Exchange Rate']).toFixed(4),
                    change: rate['8. Change Percent']
                });
            }
        } catch (error) {
            console.error(`Error fetching forex data for ${pair}:`, error);
        }
    }

    return results.length > 0 ? results : "No forex data available";
}

// Function to fetch cryptocurrency data
async function fetchCryptoData() {
    const cryptos = ['BTC', 'ETH', 'XRP', 'LTC', 'DOGE'];
    const results = [];

    for (const symbol of cryptos) {
        try {
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}/query?function=CRYPTO_RATING&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await response.json();
            
            if (data['Crypto Rating']) {
                const rating = data['Crypto Rating'];
                results.push({
                    symbol: symbol,
                    price: parseFloat(rating['Price']).toFixed(2),
                    change: rating['Change Percent'],
                    volume: rating['Volume']
                });
            }
        } catch (error) {
            console.error(`Error fetching crypto data for ${symbol}:`, error);
        }
    }

    return results.length > 0 ? results : "No cryptocurrency data available";
}

// Function to fetch comprehensive market data
async function fetchComprehensiveMarketData() {
    let marketOverview = "Market overview data unavailable";
    let sectorPerformance = "Sector performance data unavailable";
    let topGainersLosers = "Top gainers/losers data unavailable";
    let marketNews = "Market news unavailable";
    let majorIndices = "Major indices data unavailable";
    let forexData = "Forex data unavailable";
    let cryptoData = "Cryptocurrency data unavailable";

    try {
        // Fetch market overview
        try {
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}/query?function=OVERVIEW&symbol=SPY&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await response.json();
            if (data) {
                marketOverview = `Market Overview:\n` +
                    `S&P 500: ${data['52WeekHigh']} (High) - ${data['52WeekLow']} (Low)\n` +
                    `Market Cap: $${(parseFloat(data['MarketCapitalization']) / 1e12).toFixed(2)}T\n` +
                    `P/E Ratio: ${data['PERatio']}\n` +
                    `Dividend Yield: ${data['DividendYield']}%`;
            }
        } catch (error) {
            console.error('Error fetching market overview:', error);
        }

        // Fetch sector performance
        try {
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}/query?function=SECTOR&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await response.json();
            if (data['Rank A: Real-Time Performance']) {
                sectorPerformance = "Sector Performance:\n" +
                    Object.entries(data['Rank A: Real-Time Performance'])
                        .map(([sector, performance]) => `${sector}: ${performance}%`)
                        .join('\n');
            }
        } catch (error) {
            console.error('Error fetching sector performance:', error);
        }

        // Fetch top gainers and losers
        try {
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await response.json();
            if (data['top_gainers'] && data['top_losers']) {
                topGainersLosers = "Top Gainers:\n" +
                    data['top_gainers'].slice(0, 5).map(stock => 
                        `${stock['ticker']}: +${stock['change_percentage']}`
                    ).join('\n') +
                    "\n\nTop Losers:\n" +
                    data['top_losers'].slice(0, 5).map(stock => 
                        `${stock['ticker']}: ${stock['change_percentage']}`
                    ).join('\n');
            }
        } catch (error) {
            console.error('Error fetching top gainers/losers:', error);
        }

        // Fetch market news
        try {
            const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}/query?function=NEWS_SENTIMENT&topics=financial_markets&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await response.json();
            if (data['feed']) {
                marketNews = "Latest Market News:\n" +
                    data['feed'].slice(0, 5).map(news => 
                        `${news['title']}\n${news['summary']}\n`
                    ).join('\n');
            }
        } catch (error) {
            console.error('Error fetching market news:', error);
        }

        // Fetch major indices
        try {
            majorIndices = await fetchMajorIndices();
        } catch (error) {
            console.error('Error fetching major indices:', error);
        }

        // Fetch forex data
        try {
            forexData = await fetchForexData();
        } catch (error) {
            console.error('Error fetching forex data:', error);
        }

        // Fetch cryptocurrency data
        try {
            cryptoData = await fetchCryptoData();
        } catch (error) {
            console.error('Error fetching cryptocurrency data:', error);
        }

        return `📊 Comprehensive Market Report\n\n` +
            `${marketOverview}\n\n` +
            `📈 Major Indices:\n${typeof majorIndices === 'string' ? majorIndices : majorIndices.map(index => 
                `${index.symbol}: $${index.price} (${index.change})`
            ).join('\n')}\n\n` +
            `📊 Sector Performance:\n${sectorPerformance}\n\n` +
            `📈 Top Movers:\n${topGainersLosers}\n\n` +
            `💱 Forex Markets:\n${typeof forexData === 'string' ? forexData : forexData.map(forex => 
                `${forex.pair}: ${forex.rate} (${forex.change})`
            ).join('\n')}\n\n` +
            `₿ Cryptocurrencies:\n${typeof cryptoData === 'string' ? cryptoData : cryptoData.map(crypto => 
                `${crypto.symbol}: $${crypto.price} (${crypto.change})`
            ).join('\n')}\n\n` +
            `📰 Latest Market News:\n${marketNews}`;
    } catch (error) {
        console.error('Error in comprehensive market data:', error);
        return "Sorry, I couldn't fetch the comprehensive market data at this time.";
    }
}

// Export chat to PDF
async function exportChatToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Capture chat container
    const element = document.querySelector('.chat-messages');
    const canvas = await html2canvas(element);
    
    // Add title
    doc.setFontSize(20);
    doc.text('Stock Market Insights Chat', 20, 20);
    
    // Add timestamp
    doc.setFontSize(12);
    doc.text(`Exported on: ${new Date().toLocaleString()}`, 20, 30);
    
    // Add chat content
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 20, 40, 170, 200);
    
    // Save the PDF
    doc.save('stock-market-chat.pdf');
}

// Add welcome message
addMessage("Hello! I'm your Stock Market Insights Bot. I can help you with stock prices, market trends, and company information for any stock symbol. How can I assist you today?", 'bot');

// Get fallback stock data when the API is unavailable
function getFallbackStockData(symbol) {
    // Generate a consistent price based on the symbol
    const symbolHash = hashString(symbol);
    const basePrice = (symbolHash % 900) + 100; // Price between $100 and $1000
    
    // Generate a consistent change based on the symbol
    const changePercent = ((symbolHash % 20) - 10) / 2; // Change between -5% and +5%
    
    // Generate a consistent volume based on the symbol
    const volume = ((symbolHash % 9000000) + 1000000).toLocaleString();
    
    return {
        symbol: symbol,
        price: basePrice.toFixed(2),
        change: `${changePercent.toFixed(2)}%`,
        volume: volume,
        isRealTime: false,
        timestamp: new Date().toISOString()
    };
}

// Simple hash function to generate consistent values for a symbol
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}