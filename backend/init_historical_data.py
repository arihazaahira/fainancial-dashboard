# backend/init_historical_data.py
from fetch_api import fetch_multiple_markets
from datetime import datetime

def main():
    """Initialise les données avec garantie 30 jours"""
    print("🚀 INITIALISATION DES DONNÉES")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("Objectif: 30 jours minimum par marché")
    print("=" * 60)
    
    markets = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA",
        "META", "NVDA", "NFLX", "JPM", "V"
    ]
    
    print(f"{len(markets)} marchés à initialiser")
    print("⏳ Estimation: ~2.5 minutes (15s entre chaque appel)")
    print()
    
    results = fetch_multiple_markets(markets, min_days=30)
    
    print("\n" + "=" * 60)
    print("✅ INITIALISATION TERMINÉE")
    print("=" * 60)
    
    # Stats
    successful = sum(1 for count in results.values() if count >= 30)
    
    print(f"📈 Résultats:")
    print(f"   • Marchés avec 30+ jours: {successful}/{len(markets)}")
    
    if successful < len(markets):
        print(f"\n⚠️ Certains marchés n'ont pas 30 jours")
        print(f"   Vous pouvez relancer ce script")
        print(f"   Limite API Alpha Vantage: ~25 appels/jour")

if __name__ == "__main__":
    main()