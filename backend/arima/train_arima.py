# backend/arima/train_arima.py
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error
import numpy as np
import warnings
warnings.filterwarnings('ignore')

def train_arima(df, order=(2,1,2), plot_results=False):
    """
    Entraîne un modèle ARIMA sur les données financières
    
    Args:
        df (DataFrame): Doit contenir la colonne 'close'
        order (tuple): Paramètres (p,d,q) pour ARIMA
    
    Returns:
        model_fit: Modèle ARIMA entraîné
    """
    print(f"\n🧠 ENTRAÎNEMENT ARIMA{order}")
    print("-" * 40)
    
    # Validation
    if df.empty or 'close' not in df.columns:
        raise ValueError("Données invalides")
    
    # Préparation
    df = df.sort_index()
    data = df['close'].values
    
    # Division train/test (80/20)
    train_size = int(len(data) * 0.8)
    train, test = data[:train_size], data[train_size:]
    
    print(f"📊 Données: {len(df)} jours total")
    print(f"   Entraînement: {len(train)} jours")
    print(f"   Test: {len(test)} jours")
    print(f"   Prix actuel: ${data[-1]:.2f}")
    
    try:
        # Entraînement
        print("⚡ Entraînement en cours...")
        model = ARIMA(train, order=order)
        model_fit = model.fit()
        
        # Prédictions test
        predictions = model_fit.forecast(steps=len(test))
        
        # Évaluation
        rmse = np.sqrt(mean_squared_error(test, predictions))
        mae = np.mean(np.abs(test - predictions))
        
        print(f"\n📈 PERFORMANCE:")
        print(f"   RMSE: {rmse:.2f} points")
        print(f"   MAE: {mae:.2f} points")
        
        # Ré-entraîner sur toutes les données pour prédiction
        final_model = ARIMA(data, order=order)
        final_fit = final_model.fit()
        
        print(f"\n✅ Modèle ARIMA{order} entraîné avec succès")
        return final_fit
        
    except Exception as e:
        print(f"❌ Erreur entraînement: {e}")
        
        # Fallback: modèle simple
        try:
            simple_model = ARIMA(data, order=(1,1,1))
            simple_fit = simple_model.fit()
            print("✅ Modèle simple (1,1,1) réussi")
            return simple_fit
        except:
            raise ValueError("Échec de l'entraînement ARIMA")