# 📊 Financial Dashboard

Dashboard financier intelligent avec prédictions de marchés utilisant l'IA.

## 🚀 Fonctionnalités

- 📈 Visualisation des données de marché en temps réel
- 🤖 Prédictions avec modèles ARIMA et Prophet
- 🎯 Interface utilisateur moderne et responsive
- 🔄 Données temps-réel via Alpha Vantage API

## 🛠️ Installation & Lancement

### Pré-requis
- Python 3.8+
- Node.js 16+

### 1. Backend (FastAPI)

```bash
# Aller dans le dossier backend
cd backend

# Installer les dépendances Python
pip install -r requirements.txt

# Lancer le serveur
uvicorn main:app --reload --host 0.0.0.0 --port 8000

### 2.Frontend(react vite)

# Aller dans le dossier frontend
cd frontend

# Installer les dépendances Node.js
npm install

# Lancer l'application
npm run dev
