import { useState, useEffect } from "react";
import api from "../services/api";
import "../css/style.css";

function MarketList() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState("");
  const [marketData, setMarketData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [theme, setTheme] = useState("dark");

  // Charger les marchés
  useEffect(() => {
    console.log("📥 Chargement des marchés...");
    api.get("/markets")
      .then(res => {
        console.log("✅ Marchés chargés:", res.data.length);
        setMarkets(res.data);
      })
      .catch(err => {
        console.error("❌ Erreur chargement marchés:", err);
        setError("Impossible de charger la liste des marchés");
      });
  }, []);

  const handleSelectMarket = (symbol) => {
    console.log(`🎯 Marché sélectionné: ${symbol}`);
    setSelectedMarket(symbol);
    setPrediction(null);
    setError(null);
    
    if (symbol) {
      fetchMarketData(symbol);
    }
  };

  const fetchMarketData = (symbol) => {
    console.log(`📊 Fetch données marché: ${symbol}`);
    setLoading(true);
    
    api.get(`/market-data/${symbol}`)
      .then(res => {
        console.log(`✅ Données marché ${symbol}:`, res.data);
        
        if (res.data.error) {
          console.warn(`⚠️ Erreur dans données:`, res.data.message);
          setError(res.data.message);
          setMarketData(null);
        } else {
          setMarketData(res.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(`❌ Erreur API /market-data:`, err);
        setError("Erreur chargement données marché");
        setMarketData(null);
        setLoading(false);
      });
  };

  const handlePredictClose = () => {
    if (!selectedMarket) {
      setError("Veuillez sélectionner un marché");
      return;
    }

    console.log(`🚀 Lancement prédiction pour: ${selectedMarket}`);
    setLoading(true);
    setError(null);
    setPrediction(null);
    
    api.get(`/predict/${selectedMarket}`)
      .then(res => {
        console.log("🔮 Réponse API prédiction:", res);
        console.log("📦 Données complètes:", res.data);
        
        if (!res.data) {
          console.error("❌ Réponse vide");
          throw new Error("Réponse API vide");
        }
        
        if (res.data.error) {
          console.error("❌ Erreur dans prédiction:", res.data.message);
          throw new Error(res.data.message || "Erreur de prédiction");
        }
        
        if (typeof res.data.predicted_close === 'undefined' || res.data.predicted_close === null) {
          console.warn("⚠️ predicted_close manquant, structure:", res.data);
          
          const possibleKeys = ['predicted_close', 'predicted', 'close_prediction', 'prediction', 'forecast'];
          let foundKey = possibleKeys.find(key => res.data[key] !== undefined);
          
          if (foundKey) {
            console.log(`✅ Trouvé sous clé alternative: ${foundKey} = ${res.data[foundKey]}`);
            res.data.predicted_close = res.data[foundKey];
          } else {
            throw new Error("Aucune valeur prédite trouvée dans la réponse");
          }
        }
        
        console.log(`✅ Close prédit: $${res.data.predicted_close}`);
        setPrediction(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("❌ Erreur prédiction:", err);
        console.error("❌ Stack:", err.stack);
        
        let errorMessage = "Erreur lors de la prédiction";
        
        if (err.response) {
          console.error("📡 Réponse HTTP:", err.response.status, err.response.data);
          errorMessage = err.response.data?.detail || 
                        err.response.data?.message || 
                        `Erreur serveur (${err.response.status})`;
        } else if (err.request) {
          console.error("🌐 Pas de réponse du serveur");
          errorMessage = "Pas de réponse du serveur";
        }
        
        setError(errorMessage);
        setLoading(false);
      });
  };

  const formatPrice = (price, symbol = selectedMarket) => {
    if (price === undefined || price === null) {
      return "N/A";
    }
    
    try {
      const num = typeof price === 'number' ? price : parseFloat(price);
      
      if (isNaN(num)) {
        return "N/A";
      }
      
      if (symbol === 'BTC-USD' || symbol.includes('BTC')) {
        return `$${num.toFixed(2)}`;
      }
      
      return `$${num.toFixed(2)}`;
    } catch (error) {
      console.error("Erreur formatage prix:", error);
      return "Erreur";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Date invalide";
      
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "Date invalide";
    }
  };

  const getMarketName = (symbol) => {
    const market = markets.find(m => m.symbol === symbol);
    return market ? market.name : symbol;
  };

  const calculateChange = (pred) => {
    if (!pred) return { percent: 0, direction: 'neutral' };
    
    if (pred.change_percent !== undefined) {
      return {
        percent: pred.change_percent,
        direction: pred.change_percent >= 0 ? 'positive' : 'negative'
      };
    }
    
    if (pred.yesterday_close && pred.predicted_close) {
      const change = ((pred.predicted_close - pred.yesterday_close) / pred.yesterday_close) * 100;
      return {
        percent: change,
        direction: change >= 0 ? 'positive' : 'negative'
      };
    }
    
    return { percent: 0, direction: 'neutral' };
  };

  return (
    <div className={`finance-dashboard theme-${theme}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Financial Prediction</h1>
            <p>Precision forecasting with intelligent caching</p>
          </div>
          <button 
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀️' : '🌙'} Switch Theme
          </button>
        </div>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Processing market data...</p>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        {/* Market Selection */}
        <div className="market-section">
          <div className="section-header">
            <h2>
              <span className="section-icon">📊</span>
              Select Market
            </h2>
            <div className="markets-count">
              {markets.length} MARKETS AVAILABLE
            </div>
          </div>

          <div className="market-controls">
            <div className="select-wrapper">
              <select
                value={selectedMarket}
                onChange={(e) => handleSelectMarket(e.target.value)}
                className="market-select"
                disabled={loading}
              >
                <option value="">Select a market...</option>
                {markets.map((market) => (
                  <option key={market.symbol} value={market.symbol}>
                    {market.name} ({market.symbol})
                  </option>
                ))}
              </select>
              <span className="select-arrow">▼</span>
            </div>

            <button
              onClick={handlePredictClose}
              disabled={!selectedMarket || loading}
              className="predict-button"
            >
              {loading ? '⏳ Processing...' : '🔮 Predict Close'}
            </button>
          </div>

          {selectedMarket && (
            <div className="selected-market-info">
              <div className="market-tag">
                <span className="symbol">{selectedMarket}</span>
                <span className="name">{getMarketName(selectedMarket)}</span>
              </div>
              <div className="market-status">
                {prediction ? '✓ Ready' : '○ Awaiting prediction'}
              </div>
            </div>
          )}
        </div>

        {/* Données Historiques */}
        {selectedMarket && marketData && !marketData.error && (
          <div className="historical-data">
            <div className="section-header">
              <h3>
                <span className="section-icon">📈</span>
                Historical Data
              </h3>
              <div className="data-subtitle">
                Last updated: {formatDate(marketData.last_updated)}
              </div>
            </div>
            
            <div className="data-cards-container">
              <div className="data-card">
                <div className="data-label">Open</div>
                <div className="data-value">{formatPrice(marketData.open)}</div>
                <div className="data-note">YESTERDAY</div>
              </div>
              
              <div className="data-card">
                <div className="data-label">High</div>
                <div className="data-value">{formatPrice(marketData.high)}</div>
                <div className="data-note">YESTERDAY</div>
              </div>
              
              <div className="data-card">
                <div className="data-label">Low</div>
                <div className="data-value">{formatPrice(marketData.low)}</div>
                <div className="data-note">YESTERDAY</div>
              </div>
              
              <div className="data-card highlight">
                <div className="data-label">Close</div>
                <div className="data-value">{formatPrice(marketData.close)}</div>
                <div className="data-note">YESTERDAY</div>
              </div>
              
              <div className="data-card">
                <div className="data-label">Volume</div>
                <div className="data-value">
                  {marketData.volume?.toLocaleString() || 'N/A'}
                </div>
                <div className="data-note">YESTERDAY</div>
              </div>
              
              <div className="data-card">
                <div className="data-label">Data Points</div>
                <div className="data-value">{marketData.data_points || 'N/A'}</div>
                <div className="data-note">HISTORY</div>
              </div>
            </div>
            
            <div className="data-info">
              ⚠️ Historical data from previous trading day. Generate prediction for today's forecast.
            </div>
          </div>
        )}

        {/* PRÉDICTION POUR AUJOURD'HUI */}
        {prediction && !prediction.error && (
          <div className={`prediction-result ${prediction.cache_hit ? 'cached' : 'new'}`}>
            <div className="prediction-header">
              <div className="prediction-title">
                <h3>
                  <span className="section-icon">🎯</span>
                  Today's Prediction
                </h3>
                {prediction.cache_hit && (
                  <div className="cache-badge">
                    ⚡ CACHED &lt;24H
                  </div>
                )}
                {!prediction.cache_hit && (
                  <div className="new-badge">
                    🔄 NEW FORECAST
                  </div>
                )}
              </div>
              
              <div className="confidence-badge">
                {prediction.confidence || 85}% Confidence
              </div>
            </div>

            <div className="prediction-content">
              <div className="predicted-value">
                <div className="predicted-price">{formatPrice(prediction.predicted_close)}</div>
                <div className="value-label">PREDICTED CLOSE</div>
              </div>
              
              <div className="prediction-date">
                {formatDate(prediction.prediction_date || prediction.date || new Date().toISOString())}
              </div>

              <div className="comparison-section">
                <div className="comparison-row">
                  <span className="comparison-label">Yesterday's Close:</span>
                  <span className="comparison-value">
                    {formatPrice(prediction.yesterday_close || marketData?.close)}
                  </span>
                </div>
                
                <div className="comparison-row">
                  <span className="comparison-label">Expected Change:</span>
                  <span className={`change-value ${calculateChange(prediction).direction}`}>
                    {calculateChange(prediction).direction === 'positive' ? '↗ +' : '↘ '}
                    {Math.abs(calculateChange(prediction).percent).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="prediction-details">
                <div className="detail-item">
                  <span className="detail-label">Model</span>
                  <span className="detail-value">{prediction.model || 'ARIMA'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Source</span>
                  <span className="detail-value">
                    {prediction.source === 'cached' ? 'Cache (<24h)' : 
                     prediction.cache_hit ? 'Cache (<24h)' : 'Fresh'}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Data Points</span>
                  <span className="detail-value">{prediction.data_points || marketData?.data_points || 'N/A'} days</span>
                </div>
              </div>

              <div className="prediction-message">
                💡 {prediction.message || 'Forecast generated using advanced time-series analysis'}
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}

export default MarketList;