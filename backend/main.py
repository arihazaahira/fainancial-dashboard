# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from arima.predict_arima import predict_close
from influxdb_client_local import get_close_from_influx
from datetime import datetime
import pandas as pd

app = FastAPI(title="Financial Prediction API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Liste des marchés
SUPPORTED_MARKETS = [
    {"symbol": "AAPL", "name": "Apple Inc."},
    {"symbol": "MSFT", "name": "Microsoft Corporation"},
    {"symbol": "GOOGL", "name": "Alphabet Inc."},
    {"symbol": "AMZN", "name": "Amazon.com Inc."},
    {"symbol": "TSLA", "name": "Tesla Inc."},
    {"symbol": "META", "name": "Meta Platforms Inc."},
    {"symbol": "NVDA", "name": "NVIDIA Corporation"},
    {"symbol": "NFLX", "name": "Netflix Inc."},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co."},
    {"symbol": "V", "name": "Visa Inc."}
]

@app.get("/")
def root():
    today = datetime.now().date()
    return {
        "service": "Financial Prediction API",
        "version": "1.0.0",
        "date": today.isoformat(),
        "process": "1) Check cache <24h 2) Fetch 30+ days 3) Train ARIMA 4) Store prediction",
        "endpoints": {
            "/markets": "Liste des marchés",
            "/market-data/{symbol}": "Données marché (close d'hier)",
            "/predict/{symbol}": "Prédiction close d'aujourd'hui"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/markets")
def get_markets():
    """Liste des marchés supportés"""
    return SUPPORTED_MARKETS

@app.get("/market-data/{symbol}")
def get_market_data(symbol: str):
    """Données marché (close d'hier)"""
    symbol = symbol.upper()
    
    try:
        df = get_close_from_influx(symbol)
        
        if df.empty:
            # Données par défaut
            default_prices = {
                "AAPL": 185.0, "MSFT": 375.0, "GOOGL": 140.0,
                "AMZN": 150.0, "TSLA": 240.0, "META": 325.0,
                "NVDA": 485.0, "NFLX": 620.0, "JPM": 170.0, "V": 260.0
            }
            last_close = default_prices.get(symbol, 100.0)
            last_date = datetime.now().date() - timedelta(days=1)
        else:
            last_close = float(df['close'].iloc[-1])
            last_date = df.index[-1].date()
        
        # Générer open, high, low
        open_price = last_close * 0.995
        high_price = last_close * 1.015
        low_price = last_close * 0.985
        
        return {
            "symbol": symbol,
            "name": next((m["name"] for m in SUPPORTED_MARKETS if m["symbol"] == symbol), symbol),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(last_close, 2),  # ⚠️ Close D'HIER
            "volume": 10000000,
            "last_updated": last_date.isoformat(),
            "data_points": len(df) if not df.empty else 0,
            "note": "Close historique (d'hier)"
        }
        
    except Exception as e:
        print(f"❌ Erreur /market-data/{symbol}: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération données")

@app.get("/predict/{symbol}")
def predict(symbol: str):
    """
    Endpoint principal - Prédiction close d'aujourd'hui
    """
    print(f"\n🌐 /predict/{symbol} appelé à {datetime.now().strftime('%H:%M:%S')}")
    
    result = predict_close(symbol)
    
    if "error" in result and result["error"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@app.get("/status/{symbol}")
def get_status(symbol: str):
    """État des données et prédictions"""
    from influxdb_client_local import get_close_from_influx, get_prediction_for_today
    
    symbol = symbol.upper()
    today = datetime.now().date()
    
    df = get_close_from_influx(symbol)
    prediction = get_prediction_for_today(symbol)
    
    return {
        "symbol": symbol,
        "today": today.isoformat(),
        "has_historical_data": not df.empty,
        "historical_days": len(df) if not df.empty else 0,
        "last_close": float(df['close'].iloc[-1]) if not df.empty else None,
        "last_date": df.index[-1].date().isoformat() if not df.empty else None,
        "has_today_prediction": prediction is not None,
        "today_prediction": prediction,
        "needs_more_data": len(df) < 30 if not df.empty else True,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 FINANCIAL PREDICTION API")
    print("=" * 60)
    print("📌 Processus:")
    print("   1. Vérifier prédiction <24h")
    print("   2. Garantir 30+ jours de données")
    print("   3. Entraîner ARIMA")
    print("   4. Prédire close d'aujourd'hui")
    print("   5. Toujours stocker la prédiction")
    print("\n🌐 Frontend: http://localhost:5173")
    print("📚 API: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)