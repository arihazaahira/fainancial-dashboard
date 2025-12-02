# backend/fetch_api.py
from alpha_vantage.timeseries import TimeSeries
import pandas as pd
import time
from datetime import datetime, timedelta
from influxdb_client_local import write_market_dataframe, get_close_from_influx

API_KEY = "VZYTGW0T2CHR5OJ1."

def fetch_from_api(symbol):
    """Récupère les données depuis Alpha Vantage"""
    try:
        print(f"📥 Fetch {symbol} depuis Alpha Vantage...")
        
        ts = TimeSeries(key=API_KEY, output_format="pandas")
        
        # Essayer compact d'abord
        try:
            df, meta_data = ts.get_daily(symbol=symbol, outputsize="compact")
            print(f"   Mode: compact (≈100 derniers jours)")
        except:
            # Fallback
            try:
                df, meta_data = ts.get_daily(symbol=symbol, outputsize="full")
                print(f"   Mode: full (historique complet)")
            except:
                df, meta_data = ts.get_daily(symbol=symbol)
                print(f"   Mode: default")
        
        # Formater les données
        if '4. close' in df.columns:
            df = df.rename(columns={'4. close': 'close'})
            df = df[['close']]
        else:
            numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
            if len(numeric_cols) > 0:
                df = df.rename(columns={numeric_cols[0]: 'close'})
                df = df[['close']]
            else:
                print(f"❌ Aucune colonne numérique trouvée")
                return pd.DataFrame()
        
        df.index = pd.to_datetime(df.index)
        df = df.sort_index()
        
        print(f"✅ {len(df)} jours récupérés ({df.index.min().date()} → {df.index.max().date()})")
        return df
        
    except Exception as e:
        print(f"❌ Erreur fetch {symbol}: {e}")
        return pd.DataFrame()

def fetch_and_ensure_30_days(symbol, min_days=30):
    """
    Garantit qu'on a au moins 30 jours de données
    1. Vérifie données existantes
    2. Si <30 jours → fetch API
    3. Fusionne et stocke
    4. Retourne ≥30 jours
    """
    print(f"\n🔄 Garantir {min_days} jours pour {symbol}")
    
    # 1. Vérifier données existantes
    existing_data = get_close_from_influx(symbol)
    
    if not existing_data.empty:
        print(f"📊 Données existantes: {len(existing_data)} jours")
        
        # Si déjà ≥30 jours, retourner
        if len(existing_data) >= min_days:
            print(f"✅ Suffisamment de données ({len(existing_data)} ≥ {min_days} jours)")
            return existing_data
    
    # 2. Fetch depuis API
    print(f"📥 Données insuffisantes, fetch API...")
    new_data = fetch_from_api(symbol)
    
    if new_data.empty:
        print(f"❌ Échec fetch API")
        # Retourner données existantes même si insuffisantes
        return existing_data if not existing_data.empty else pd.DataFrame()
    
    # 3. Fusionner
    if not existing_data.empty:
        combined = pd.concat([existing_data, new_data])
        combined = combined[~combined.index.duplicated(keep='last')]
        combined = combined.sort_index()
        nouveaux = len(combined) - len(existing_data)
        print(f"📈 Fusion: {len(combined)} jours (+{nouveaux} nouveaux)")
    else:
        combined = new_data
        print(f"📈 Nouvelles données: {len(combined)} jours")
    
    # 4. Stocker
    write_market_dataframe(symbol, combined)
    
    # 5. Vérifier
    if len(combined) >= min_days:
        print(f"✅ Objectif atteint: {len(combined)} ≥ {min_days} jours")
    else:
        print(f"⚠️ Objectif non atteint: {len(combined)} < {min_days} jours")
    
    return combined

def fetch_multiple_markets(markets, min_days=30):
    """Récupère données pour plusieurs marchés avec garantie min_days"""
    results = {}
    
    for i, symbol in enumerate(markets):
        print(f"\n[{i+1}/{len(markets)}] Traitement {symbol}")
        
        data = fetch_and_ensure_30_days(symbol, min_days)
        results[symbol] = len(data) if not data.empty else 0
        
        # Attendre 15s entre les appels API
        if i < len(markets) - 1:
            print(f"⏳ Attente 15s...")
            time.sleep(15)
    
    # Résumé
    print(f"\n{'='*50}")
    print(f"📊 RÉSUMÉ - Données garanties ({min_days} jours)")
    print(f"{'='*50}")
    
    for symbol, count in results.items():
        status = "✅" if count >= min_days else "⚠️"
        print(f"{status} {symbol}: {count} jours")
    
    return results

if __name__ == "__main__":
    # Test
    test_symbols = ["AAPL", "MSFT"]
    fetch_multiple_markets(test_symbols, min_days=30)