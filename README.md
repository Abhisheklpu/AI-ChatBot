# Stock Market Insights Bot

A modern, responsive web-based chatbot that provides real-time stock market insights and information. Built with vanilla JavaScript, this application offers a clean and intuitive user interface with voice input capabilities and PDF export functionality.

## Features

- **Real-time Stock Information**: Get instant updates on stock prices, changes, and trading volumes via Alpha Vantage API integration
- **Voice Input**: Interact with the chatbot using voice commands
- **PDF Export**: Save your chat conversations as PDF documents
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Modern UI**: Clean and intuitive interface with smooth animations

## Technology Stack

- **Frontend**:
  - HTML5
  - CSS3
  - Vanilla JavaScript
- **Libraries**:
  - Font Awesome (for icons)
  - jsPDF (for PDF generation)
  - html2canvas (for capturing chat content)
- **APIs**:
  - Web Speech API (for voice input)
  - Alpha Vantage API (for real-time stock data)
  - Google Cloud API (for additional services)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone [repository-url]
   ```

2. Navigate to the project directory:
   ```bash
   cd stock-market-insights-bot
   ```

3. Open `index.html` in your web browser:
   ```bash
   # Using Python's built-in HTTP server
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000` in your browser.

## Usage

1. **Text Input**: Type your questions about stocks, market trends, or specific companies in the input field.
2. **Voice Input**: Click the microphone icon to use voice input.
3. **Export Chat**: Click the "Export Chat" button to save your conversation as a PDF.

## Supported Stock Symbols

The bot currently supports the following stock symbols:
- AAPL (Apple Inc.)
- GOOGL (Alphabet Inc.)
- MSFT (Microsoft Corporation)
- AMZN (Amazon.com Inc.)
- TSLA (Tesla Inc.)
- META (Meta Platforms Inc.)
- NVDA (NVIDIA Corporation)
- JPM (JPMorgan Chase & Co.)
- V (Visa Inc.)
- WMT (Walmart Inc.)

## API Integration

This application uses the Alpha Vantage API to fetch real-time stock market data. The API keys are included in the code for demonstration purposes. In a production environment, you should:

1. Store the API keys securely (e.g., in environment variables)
2. Implement proper API key rotation and management
3. Set up appropriate API usage limits and monitoring

### Alpha Vantage API

The Alpha Vantage API provides real-time and historical stock data. The application uses the following endpoints:
- `GLOBAL_QUOTE`: For fetching current stock prices and changes
- `TOP_GAINERS_LOSERS`: For market overview and trends

For more information, visit [Alpha Vantage](https://www.alphavantage.co/).

## Browser Compatibility

- Chrome (recommended for best voice input support)
- Firefox
- Safari
- Edge

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
