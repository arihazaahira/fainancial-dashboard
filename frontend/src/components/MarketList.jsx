import { useState } from "react";
import api from "../services/api";
import "../css/style.css";


function MarketList() {
  const [markets] = useState([
    { name: "Apple", symbol: "AAPL" },
    { name: "Microsoft", symbol: "MSFT" },
    { name: "Google", symbol: "GOOG" },
    { name: "Tesla", symbol: "TSLA" },
    { name: "Amazon", symbol: "AMZN" },
    { name: "Bitcoin", symbol: "BTC-USD" },
    { name: "Ethereum", symbol: "ETH-USD" }
  ]);

  const [selectedMarket, setSelectedMarket] = useState("");
  const [marketData, setMarketData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [customSymbol, setCustomSymbol] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSelectMarket = (symbol) => {
    if (symbol === "other") {
      setShowCustomInput(true);
      setSelectedMarket("");
      setMarketData(null);
      setPrediction(null);
    } else {
      setShowCustomInput(false);
      setSelectedMarket(symbol);
      setPrediction(null);

      api.get(`/market-data/${symbol}`)
        .then(res => setMarketData(res.data))
        .catch(err => console.error(err));
    }
  };

  const handleCustomSymbolSubmit = () => {
    if (customSymbol.trim()) {
      setSelectedMarket(customSymbol.toUpperCase());
      setPrediction(null);
      
      api.get(`/market-data/${customSymbol}`)
        .then(res => setMarketData(res.data))
        .catch(err => console.error(err));
    }
  };

  const handlePredictClose = () => {
    if (!selectedMarket) return;
    
    api.get(`/predict/${selectedMarket}`)
      .then(res => setPrediction(res.data))
      .catch(err => console.error(err));
  };

  return (
    <div className="finance-dashboard">
      {/* Header Simple */}
      <div className="dashboard-header">
        <h1>Market Prediction</h1>
        <p>Analyze and predict market trends with AI models</p>
      </div>

      <div className="dashboard-content">
        <div className="content-layout">
          {/* Models Section */}
          <div className="models-section">
            <h2>Prediction Models</h2>
            <div className="models-grid">
              <div className="model-card">
                <div className="model-header">
                  <h3>ARIMA</h3>
                  <div className="model-badge">Classic</div>
                </div>
                <p>
                  ARIMA is a classical statistical model for time series analysis.
                  It identifies internal patterns like trends, seasonality, and
                  dependencies between successive values.
                </p>
                <div className="model-stats">
                  <span>Accuracy: 87%</span>
                  <span>Stable Data</span>
                </div>
              </div>

              <div className="model-card">
                <div className="model-header">
                  <h3>Prophet</h3>
                  <div className="model-badge">Meta</div>
                </div>
                <p>
                  Prophet by Meta handles nonlinear trends, strong seasonalities,
                  and irregular data. Robust even with missing dates or noisy series.
                </p>
                <div className="model-stats">
                  <span>Accuracy: 92%</span>
                  <span>Noisy Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Market Selection - Maintenant en dessous des modèles */}
          <div className="market-section-full">
            <div className="section-header">
              <h2>Select Market</h2>
              <div className="markets-count">
                {markets.length} markets available
              </div>
            </div>

            <div className="market-controls-full">
              <select
                value={showCustomInput ? "other" : selectedMarket}
                onChange={(e) => handleSelectMarket(e.target.value)}
                className="market-select-full"
              >
                <option value="">Choose a market</option>
                {markets.map(m => (
                  <option key={m.symbol} value={m.symbol}>
                    {m.name} ({m.symbol})
                  </option>
                ))}
                <option value="other">Other (Custom Symbol)</option>
              </select>

              <button
                onClick={handlePredictClose}
                disabled={!selectedMarket}
                className="predict-btn-full"
              >
                Predict Close Price
              </button>
            </div>

            {/* Custom Symbol Input */}
            {showCustomInput && (
              <div className="custom-symbol-section-full">
                <div className="custom-input-group-full">
                  <input
                    type="text"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    placeholder="Enter stock symbol (e.g., NFLX, TSLA, BTC-USD)"
                    className="symbol-input-full"
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomSymbolSubmit()}
                  />
                  <button
                    onClick={handleCustomSymbolSubmit}
                    disabled={!customSymbol.trim()}
                    className="submit-custom-btn-full"
                  >
                    Load Data
                  </button>
                </div>
                <p className="input-hint">
                  Enter any valid stock or cryptocurrency symbol
                </p>
              </div>
            )}
          </div>

          {/* Content Grid pour les données et prédictions */}
          <div className="data-prediction-grid">
            {/* Market Data */}
            {selectedMarket && marketData && (
              <div className="market-data-full">
                <div className="data-header">
                  <h3>{selectedMarket} - Market Data</h3>
                  <div className="price-change positive">+2.3%</div>
                </div>
                
                <div className="data-grid-full">
                  <div className="data-item">
                    <span className="data-label">Open</span>
                    <span className="data-value">${marketData.open}</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">High</span>
                    <span className="data-value">${marketData.high}</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Low</span>
                    <span className="data-value">${marketData.low}</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Close</span>
                    <span className="data-value">${marketData.close}</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Volume</span>
                    <span className="data-value">{marketData.volume}</span>
                  </div>
                </div>

                {/* Prediction Result */}
                {prediction && (
                  <div className="prediction-result-full">
                    <div className="prediction-header">
                      <h4>Close Price Prediction</h4>
                      <div className="confidence-badge">
                        {prediction.confidence}% Confidence
                      </div>
                    </div>
                    <div className="prediction-content">
                      <div className="predicted-value">
                        ${prediction.predicted_close}
                      </div>
                      <div className="model-used">
                        Model: {prediction.model}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Predictions Table */}
            <div className="summary-section-full">
              <h3>Recent Predictions</h3>
              <div className="summary-table">
                <div className="table-header">
                  <span>Symbol</span>
                  <span>Predicted Close</span>
                  <span>Confidence</span>
                </div>
                <div className="table-row">
                  <span>AAPL</span>
                  <span>$182.45</span>
                  <span className="confidence-high">89%</span>
                </div>
                <div className="table-row">
                  <span>MSFT</span>
                  <span>$385.20</span>
                  <span className="confidence-high">91%</span>
                </div>
                <div className="table-row">
                  <span>GOOG</span>
                  <span>$142.80</span>
                  <span className="confidence-medium">85%</span>
                </div>
                <div className="table-row">
                  <span>TSLA</span>
                  <span>$245.60</span>
                  <span className="confidence-high">88%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketList;