# backend/test_influx_query.py
from influxdb_client import InfluxDBClient
from influxdb_client.client.query_api import QueryApi

INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "_eUyZZY91Y0Lvq3kQeLOP0-iC_jRtnSTUxUnbbsfdKEhCaC5GpTopqT8QiDB0dcVlewES29Gf8R0TsuSJXs0YQ=="
INFLUX_ORG = "NOSQL"
INFLUX_BUCKET = "Data-Finance"

client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
query_api = client.query_api()

def test_query(symbol):
    """Teste différentes requêtes Flux"""
    queries = [
        # Version 1 - Simple
        f'''
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: -10d)
          |> filter(fn: (r) => r["_measurement"] == "stock_prices")
          |> filter(fn: (r) => r["symbol"] == "{symbol}")
          |> filter(fn: (r) => r["_field"] == "close")
        ''',
        
        # Version 2 - Plus simple
        f'''
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: -10d)
          |> filter(fn: (r) => r.symbol == "{symbol}")
          |> filter(fn: (r) => r._field == "close")
        ''',
        
        # Version 3 - Vérifier ce qui existe
        f'''
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: -1d)
          |> filter(fn: (r) => r.symbol == "{symbol}")
          |> group()
          |> limit(n: 5)
        '''
    ]
    
    for i, query in enumerate(queries, 1):
        print(f"\n🔍 Test requête {i} pour {symbol}:")
        print(f"Query: {query[:100]}...")
        
        try:
            result = query_api.query(query=query, org=INFLUX_ORG)
            print(f"✅ Succès! {len(result)} tables")
            
            for table in result:
                print(f"  Table: {len(table.records)} records")
                for j, record in enumerate(table.records[:3]):  # 3 premiers
                    print(f"    Record {j}: time={record.get_time()}, value={record.get_value()}, field={record.get_field()}")
                    if j >= 2:  # Limiter à 3
                        print(f"    ...")
                        break
                        
        except Exception as e:
            print(f"❌ Erreur: {type(e).__name__} - {str(e)[:100]}")

def list_measurements():
    """Liste toutes les measurements"""
    query = '''
    import "influxdata/influxdb/schema"
    schema.measurements(bucket: "Data-Finance")
    '''
    
    try:
        result = query_api.query(query=query, org=INFLUX_ORG)
        print("\n📋 Measurements disponibles:")
        for table in result:
            for record in table.records:
                print(f"  - {record.get_value()}")
    except Exception as e:
        print(f"Erreur: {e}")

def list_symbols():
    """Liste tous les symboles"""
    query = '''
    from(bucket: "Data-Finance")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "stock_prices")
      |> group(columns: ["symbol"])
      |> distinct(column: "symbol")
      |> sort(columns: ["symbol"])
    '''
    
    try:
        result = query_api.query(query=query, org=INFLUX_ORG)
        print("\n📊 Symboles disponibles:")
        symbols = []
        for table in result:
            for record in table.records:
                symbol = record.values.get("symbol")
                if symbol:
                    symbols.append(symbol)
                    print(f"  - {symbol}")
        return symbols
    except Exception as e:
        print(f"Erreur: {e}")
        return []

if __name__ == "__main__":
    print("🧪 Test des requêtes InfluxDB")
    print("=" * 50)
    
    list_measurements()
    symbols = list_symbols()
    
    for symbol in ["AAPL", "MSFT", "GOOGL"]:
        test_query(symbol)