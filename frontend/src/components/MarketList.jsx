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
        console.log(`📅 Prochains 5 jours:`, res.data.next_5_days);
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

  const formatShortDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Invalid";
      
      return date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid";
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

        {/* PRÉDICTIONS 5 PROCHAINS JOURS */}
        {prediction && !prediction.error && prediction.next_5_days && prediction.next_5_days.length > 0 && (
          <div className="future-predictions">
            <div className="section-header">
              <h3>
                <span className="section-icon">📅</span>
                Next 5 Days Forecast
              </h3>
              <div className="data-subtitle">
                Extended predictions based on ARIMA model
              </div>
            </div>

            {/* CHART VISUEL */}
            <div className="forecast-chart">
              <div className="chart-container">
                <svg className="price-chart" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                  {(() => {
                    // Préparer les données avec aujourd'hui
                    const allPoints = [
                      { 
                        date: prediction.prediction_date, 
                        price: prediction.predicted_close,
                        label: "Today",
                        isToday: true
                      },
                      ...prediction.next_5_days.map(day => ({
                        date: day.date,
                        price: day.predicted_close,
                        label: formatShortDate(day.date),
                        isToday: false
                      }))
                    ];
                    
                    // Calculer min/max pour l'échelle
                    const prices = allPoints.map(p => p.price);
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const priceRange = maxPrice - minPrice;
                    const padding = priceRange * 0.2;
                    
                    // Dimensions du graphique
                    const chartWidth = 800;
                    const chartHeight = 300;
                    const margin = { top: 40, right: 60, bottom: 60, left: 60 };
                    const width = chartWidth - margin.left - margin.right;
                    const height = chartHeight - margin.top - margin.bottom;
                    
                    // Fonction de scaling
                    const scaleX = (index) => margin.left + (index / (allPoints.length - 1)) * width;
                    const scaleY = (price) => margin.top + height - ((price - minPrice + padding) / (priceRange + 2 * padding)) * height;
                    
                    // Créer le path de la ligne
                    const pathData = allPoints.map((point, i) => {
                      const x = scaleX(i);
                      const y = scaleY(point.price);
                      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                    }).join(' ');
                    
                    // Créer le gradient area path
                    const areaPathData = pathData + 
                      ` L ${scaleX(allPoints.length - 1)} ${margin.top + height}` +
                      ` L ${margin.left} ${margin.top + height} Z`;
                    
                    return (
                      <>
                        {/* Définitions des gradients */}
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                          </linearGradient>
                          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 0.3 }} />
                            <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.05 }} />
                          </linearGradient>
                        </defs>
                        
                        {/* Grille horizontale */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                          const y = margin.top + height * ratio;
                          const price = maxPrice + padding - (priceRange + 2 * padding) * ratio;
                          return (
                            <g key={i}>
                              <line
                                x1={margin.left}
                                y1={y}
                                x2={margin.left + width}
                                y2={y}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />
                              <text
                                x={margin.left - 10}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="11"
                                fill="rgba(255,255,255,0.5)"
                              >
                                ${price.toFixed(2)}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Area sous la ligne */}
                        <path
                          d={areaPathData}
                          fill="url(#areaGradient)"
                        />
                        
                        {/* Ligne principale */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="url(#lineGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Points et labels */}
                        {allPoints.map((point, i) => {
                          const x = scaleX(i);
                          const y = scaleY(point.price);
                          const isHighest = point.price === maxPrice;
                          const isLowest = point.price === minPrice;
                          
                          return (
                            <g key={i}>
                              {/* Point */}
                              <circle
                                cx={x}
                                cy={y}
                                r={point.isToday ? 6 : 5}
                                fill={point.isToday ? '#fff' : '#6366f1'}
                                stroke={point.isToday ? '#6366f1' : '#fff'}
                                strokeWidth={point.isToday ? 3 : 2}
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                              />
                              
                              {/* Label date */}
                              <text
                                x={x}
                                y={margin.top + height + 20}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight={point.isToday ? 700 : 500}
                                fill={point.isToday ? '#6366f1' : 'rgba(255,255,255,0.6)'}
                              >
                                {point.label}
                              </text>
                              
                              {/* Prix au-dessus des points extrêmes ou aujourd'hui */}
                              {(isHighest || isLowest || point.isToday) && (
                                <g>
                                  <rect
                                    x={x - 35}
                                    y={y - 30}
                                    width="70"
                                    height="20"
                                    rx="10"
                                    fill={point.isToday ? '#6366f1' : isHighest ? '#10b981' : '#ef4444'}
                                    opacity="0.9"
                                  />
                                  <text
                                    x={x}
                                    y={y - 16}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="700"
                                    fill="#fff"
                                  >
                                    ${point.price.toFixed(2)}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            <div className="future-cards-container">
              {prediction.next_5_days.map((day, index) => {
                const changeDirection = day.change_from_previous >= 0 ? 'positive' : 'negative';
                
                return (
                  <div key={index} className="future-card">
                    <div className="future-day-header">
                      <div className="day-number">Day +{day.day_number}</div>
                      <div className="future-date">{formatShortDate(day.date)}</div>
                    </div>
                    
                    <div className="future-price">
                      {formatPrice(day.predicted_close)}
                    </div>
                    
                    <div className={`future-change ${changeDirection}`}>
                      {changeDirection === 'positive' ? '↗ +' : '↘ '}
                      {Math.abs(day.change_from_previous || 0).toFixed(2)}%
                    </div>
                    
                    <div className="future-label">vs previous day</div>
                  </div>
                );
              })}
            </div>

            <div className="future-note">
              📊 These predictions are based on historical patterns and should be used as guidance only.
              Confidence decreases with distance from current date.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default MarketList;