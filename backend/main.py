from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import random
from datetime import datetime

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models de base
class Market(BaseModel):
    name: str
    symbol: str

class MarketData(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: int

class PredictionResponse(BaseModel):
    predicted_close: float
    confidence: float
    model: str

# Données mockées pour démarrer
MOCK_MARKETS = [
    {"name": "Apple", "symbol": "AAPL"},
    {"name": "Microsoft", "symbol": "MSFT"},
    {"name": "Google", "symbol": "GOOGL"},
    {"name": "Tesla", "symbol": "TSLA"},
    {"name": "Amazon", "symbol": "AMZN"},
    {"name": "Bitcoin", "symbol": "BTC-USD"},
    {"name": "Ethereum", "symbol": "ETH-USD"}
]

@app.get("/")
async def root():
    return {"message": "Financial Dashboard API is running!"}

@app.get("/api/markets", response_model=List[Market])
async def get_markets():
    """Retourne la liste des marchés disponibles"""
    return MOCK_MARKETS

@app.get("/api/market-data/{symbol}")
async def get_market_data(symbol: str):
    """Données mockées du marché"""
    # Prix de base selon le symbole
    base_prices = {
        "AAPL": 180, "MSFT": 380, "GOOGL": 140, 
        "TSLA": 240, "AMZN": 150, "BTC-USD": 45000, "ETH-USD": 2500
    }
    
    base_price = base_prices.get(symbol, 100)
    
    return MarketData(
        open=round(base_price * 0.99, 2),
        high=round(base_price * 1.02, 2),
        low=round(base_price * 0.98, 2),
        close=round(base_price, 2),
        volume=random.randint(1000000, 50000000)
    )

@app.get("/api/predict/{symbol}")
async def predict_close_price(symbol: str):
    """Prédiction mockée pour les deux modèles"""
    # Récupérer les données actuelles
    market_data = await get_market_data(symbol)
    current_close = market_data.close
    
    # Générer des prédictions réalistes
    arima_prediction = PredictionResponse(
        predicted_close=round(current_close * (1 + random.uniform(-0.02, 0.04)), 2),
        confidence=round(random.uniform(85, 92), 1),
        model="ARIMA"
    )
    
    prophet_prediction = PredictionResponse(
        predicted_close=round(current_close * (1 + random.uniform(-0.01, 0.03)), 2),
        confidence=round(random.uniform(88, 95), 1),
        model="Prophet"
    )
    
    return {
        "arima": arima_prediction,
        "prophet": prophet_prediction,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}