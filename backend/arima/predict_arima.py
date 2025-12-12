import pandas as pd
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

def predict_close(symbol):
    """
    PROCESSUS COMPLET selon votre use case:
    1. Vérifier prédiction <24h
    2. Si oui → retourner
    3. Si non → garantir 30 jours de données
    4. Entraîner ARIMA
    5. Prédire close d'aujourd'hui + 5 prochains jours
    6. Stocker prédictions
    """
    try:
        # Imports
        from influxdb_client_local import (
            get_close_from_influx,
            write_market_dataframe,
            get_prediction_for_today,
            write_prediction_to_influx
        )
        from fetch_api import fetch_and_ensure_30_days
        from arima.train_arima import train_arima
        
        symbol = symbol.upper()
        today = pd.Timestamp.now().normalize()
        
        print(f"\n{'='*60}")
        print(f"🎯 PRÉDICTION POUR: {symbol}")
        print(f"📅 Date: {today.date()}")
        print(f"{'='*60}")
        
        # ===== 1. VÉRIFIER PRÉDICTION <24h =====
        print("\n1️⃣ Vérification prédiction existante...")
        existing_pred = get_prediction_for_today(symbol)
        
        if existing_pred is not None:
            print(f"   ✅ PRÉDICTION CACHE TROUVÉE!")
            
            # Récupérer close d'hier pour contexte
            df = get_close_from_influx(symbol)
            yesterday_close = float(df['close'].iloc[-1]) if not df.empty else 0
            
            # Récupérer les 5 prochains jours du cache
            next_5_days = []
            for i in range(1, 6):
                future_date = today + timedelta(days=i)
                future_pred = get_prediction_for_today(symbol, date=future_date)
                if future_pred is not None:
                    next_5_days.append({
                        "date": future_date.isoformat(),
                        "predicted_close": float(future_pred),
                        "day_number": i
                    })
            
            return {
                "symbol": symbol,
                "predicted_close": float(existing_pred),
                "prediction_date": today.isoformat(),
                "yesterday_close": float(yesterday_close),
                "change_percent": round(((existing_pred - yesterday_close) / yesterday_close * 100), 2) if yesterday_close > 0 else 0,
                "model": "ARIMA",
                "source": "cached",
                "confidence": 95,
                "cache_hit": True,
                "next_5_days": next_5_days,
                "message": f"Prédiction récente (<24h) pour {today.date()}"
            }
        
        print("   ❌ Pas de prédiction récente, nouvelle prédiction nécessaire")
        
        # ===== 2. GARANTIR 30 JOURS DE DONNÉES =====
        print(f"\n2️⃣ Garantir 30 jours de données...")
        df = fetch_and_ensure_30_days(symbol, min_days=30)
        
        if df.empty or len(df) < 30:
            return {
                "error": True,
                "symbol": symbol,
                "message": f"Données insuffisantes ({len(df) if not df.empty else 0} jours, besoin 30+)"
            }
        
        # Préparer données (exclure aujourd'hui si présent)
        df = df[df.index.date < today.date()]
        df = df.sort_index()
        
        print(f"   📊 {len(df)} jours disponibles")
        print(f"   📅 Période: {df.index[0].date()} → {df.index[-1].date()}")
        print(f"   💰 Close d'hier: ${df['close'].iloc[-1]:.2f}")
        
        # ===== 3. ENTRAÎNER ARIMA =====
        print(f"\n3️⃣ Entraînement modèle ARIMA...")
        try:
            model = train_arima(df, order=(2,1,2), plot_results=False)
        except Exception as e:
            # Fallback sur modèle simple
            print(f"   ⚠️ ARIMA(2,1,2) échoué, essai (1,1,1)...")
            model = train_arima(df, order=(1,1,1), plot_results=False)
        
        # ===== 4. PRÉDIRE AUJOURD'HUI + 5 JOURS =====
        print(f"\n4️⃣ Prédiction du close pour aujourd'hui + 5 prochains jours...")
        
        # Prédire 6 jours (aujourd'hui + 5 suivants)
        forecasts = model.forecast(steps=6)
        
        prediction_today = forecasts[0]
        yesterday_close = float(df['close'].iloc[-1])
        change_percent = ((prediction_today - yesterday_close) / yesterday_close) * 100
        
        print(f"   🔮 Prédiction aujourd'hui: ${prediction_today:.2f}")
        print(f"   📈 Variation: {change_percent:+.2f}%")
        
        # ===== 5. STOCKER PRÉDICTIONS =====
        print(f"\n5️⃣ Stockage prédictions...")
        
        # Stocker aujourd'hui
        write_prediction_to_influx(symbol, today, prediction_today)
        
        # Stocker les 5 prochains jours
        next_5_days = []
        for i in range(1, 6):
            future_date = today + timedelta(days=i)
            future_prediction = forecasts[i]
            
            # Stocker dans InfluxDB
            write_prediction_to_influx(symbol, future_date, future_prediction)
            
            # Préparer pour le résultat
            prev_close = forecasts[i-1]
            future_change = ((future_prediction - prev_close) / prev_close) * 100
            
            next_5_days.append({
                "date": future_date.isoformat(),
                "predicted_close": float(future_prediction),
                "day_number": i,
                "change_from_previous": round(future_change, 2)
            })
            
            print(f"   📅 J+{i} ({future_date.date()}): ${future_prediction:.2f} ({future_change:+.2f}%)")
        
        # Calcul confiance
        confidence = min(95, 70 + min(len(df) / 2, 25))
        
        # ===== RÉSULTAT =====
        result = {
            "symbol": symbol,
            "predicted_close": float(prediction_today),
            "prediction_date": today.isoformat(),
            "yesterday_close": float(yesterday_close),
            "change_percent": round(change_percent, 2),
            "model": "ARIMA",
            "source": "new_training",
            "confidence": int(confidence),
            "data_points": len(df),
            "cache_hit": False,
            "next_5_days": next_5_days,
            "message": f"Close prédit pour {today.date()} + 5 jours suivants basé sur {len(df)} jours"
        }
        
        print(f"\n✅ PRÉDICTION COMPLÈTE")
        print(f"   Aujourd'hui: ${prediction_today:.2f} (Confiance: {confidence}%)")
        print(f"   5 jours suivants stockés")
        
        return result
        
    except Exception as e:
        print(f"\n❌ ERREUR PRÉDICTION: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "error": True,
            "symbol": symbol,
            "message": f"Erreur prédiction: {str(e)}"
        }