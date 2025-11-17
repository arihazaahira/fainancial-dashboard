
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const marketService = {
  getMarkets: () => api.get('/markets'),
  getMarketData: (symbol) => api.get(`/market-data/${symbol}`),
  predictClose: (symbol) => api.get(`/predict/${symbol}`),
};

export default api;