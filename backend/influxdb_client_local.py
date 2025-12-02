# backend/influxdb_client_local.py
import pandas as pd
from datetime import datetime, timedelta

# Configuration InfluxDB
INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "_eUyZZY91Y0Lvq3kQeLOP0-iC_jRtnSTUxUnbbsfdKEhCaC5GpTopqT8QiDB0dcVlewES29Gf8R0TsuSJXs0YQ=="
INFLUX_ORG = "NOSQL"
INFLUX_BUCKET = "finance"

from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# Initialiser le client
client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG, timeout=30_000)
write_api = client.write_api(write_options=SYNCHRONOUS)
query_api = client.query_api()

print(f"✅ Client InfluxDB connecté à {INFLUX_URL}")

def get_close_from_influx(symbol):
    """Récupère les prix de clôture depuis InfluxDB"""
    try:
        query = f'''
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: -100d)
          |> filter(fn: (r) => r._measurement == "stock_prices")
          |> filter(fn: (r) => r.symbol == "{symbol}")
          |> filter(fn: (r) => r._field == "close")
          |> sort(columns: ["_time"])
        '''
        
        result = query_api.query(query=query, org=INFLUX_ORG)
        
        dates = []
        closes = []
        
        for table in result:
            for record in table.records:
                dates.append(record.get_time())
                closes.append(record.get_value())
        
        if dates:
            df = pd.DataFrame({'close': closes}, index=dates)
            df.index.name = 'date'
            df = df.sort_index()
            print(f"✅ {len(df)} jours récupérés pour {symbol}")
            return df
        else:
            print(f"⚠️ Aucune donnée pour {symbol}")
            return pd.DataFrame()
            
    except Exception as e:
        print(f"❌ Erreur récupération {symbol}: {e}")
        return pd.DataFrame()

# backend/influxdb_client_local.py - MODIFIEZ la fonction write_market_dataframe
def write_market_dataframe(symbol, df, batch_size=50):
    """Écrit un DataFrame dans InfluxDB par batch pour éviter timeout"""
    try:
        points = []
        for date, row in df.iterrows():
            point = Point("stock_prices") \
                .tag("symbol", symbol) \
                .field("close", float(row['close'])) \
                .time(date)
            points.append(point)
        
        # Écrire par batch pour éviter timeout
        total_points = len(points)
        print(f"💾 Écriture {total_points} points pour {symbol} (batch de {batch_size})...")
        
        for i in range(0, total_points, batch_size):
            batch = points[i:i + batch_size]
            try:
                write_api.write(bucket=INFLUX_BUCKET, record=batch)
                print(f"   ✅ Batch {i//batch_size + 1}/{(total_points + batch_size - 1)//batch_size}: {len(batch)} points")
            except Exception as e:
                print(f"   ❌ Erreur batch {i//batch_size + 1}: {e}")
                # Essayer point par point pour identifier le problème
                for j, point in enumerate(batch):
                    try:
                        write_api.write(bucket=INFLUX_BUCKET, record=point)
                    except Exception as point_error:
                        print(f"     ❌ Point {j} échoué: {point_error}")
                raise e
        
        print(f"✅ {total_points} points écrits avec succès pour {symbol}")
        
    except Exception as e:
        print(f"❌ Erreur écriture {symbol}: {e}")
        # Ne pas lever l'exception pour permettre la suite du processus
        # raise e  # Commenté pour ne pas bloquer

def get_recent_prediction(symbol):
    """Récupère la prédiction la plus récente (<24h)"""
    try:
        query = f'''
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: -24h)
          |> filter(fn: (r) => r._measurement == "predictions")
          |> filter(fn: (r) => r.symbol == "{symbol}")
          |> filter(fn: (r) => r._field == "predicted_close")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1)
        '''
        
        result = query_api.query(query=query, org=INFLUX_ORG)
        
        for table in result:
            for record in table.records:
                value = record.get_value()
                print(f"✅ Prédiction cache trouvée pour {symbol}: {value}")
                return value
        
        print(f"❌ Pas de prédiction récente pour {symbol}")
        return None
        
    except Exception as e:
        print(f"Erreur récupération prédiction {symbol}: {e}")
        return None

def get_prediction_for_today(symbol):
    """Vérifie si une prédiction existe pour aujourd'hui"""
    try:
        today = pd.Timestamp.now().normalize()
        yesterday = today - pd.Timedelta(days=1)
        
        query = f'''
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: {yesterday.isoformat()})
          |> filter(fn: (r) => r._measurement == "predictions")
          |> filter(fn: (r) => r.symbol == "{symbol}")
          |> filter(fn: (r) => r._field == "predicted_close")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1)
        '''
        
        result = query_api.query(query=query, org=INFLUX_ORG)
        
        for table in result:
            for record in table.records:
                record_time = record.get_time()
                if isinstance(record_time, pd.Timestamp):
                    record_date = record_time.normalize()
                else:
                    record_date = pd.Timestamp(record_time).normalize()
                
                if record_date == today:
                    value = record.get_value()
                    print(f"✅ Prédiction trouvée pour {symbol} aujourd'hui: {value}")
                    return value
        
        print(f"❌ Pas de prédiction pour {symbol} aujourd'hui")
        return None
        
    except Exception as e:
        print(f"Erreur vérification prédiction: {e}")
        return None

def write_prediction_to_influx(symbol, date, prediction):
    """Stocke une prédiction dans InfluxDB"""
    try:
        point = Point("predictions") \
            .tag("symbol", symbol) \
            .field("predicted_close", float(prediction)) \
            .field("model", "ARIMA") \
            .time(date)
        
        write_api.write(bucket=INFLUX_BUCKET, record=point)
        print(f"✅ Prédiction enregistrée: {symbol} = {prediction:.2f}")
        
    except Exception as e:
        print(f"Erreur écriture prédiction {symbol}: {e}")

def check_recent_data_exists(symbol, hours=24):
    """Vérifie si des données récentes existent"""
    try:
        df = get_close_from_influx(symbol)
        if df.empty:
            return False
        
        last_date = df.index.max()
        now = pd.Timestamp.now()
        hours_diff = (now - last_date).total_seconds() / 3600
        
        return hours_diff <= hours
        
    except Exception as e:
        print(f"Erreur vérification données récentes {symbol}: {e}")
        return False

def check_historical_data_exists(symbol, days=30):
    """Vérifie si des données historiques existent (> X jours)"""
    try:
        df = get_close_from_influx(symbol)
        if df.empty or len(df) < 20:
            return False
        
        date_range = (df.index.max() - df.index.min()).days
        return date_range >= days
        
    except Exception as e:
        print(f"Erreur vérification historique {symbol}: {e}")
        return False