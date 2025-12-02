// frontend/src/services/api.js
import axios from 'axios';

// IMPORTANT: L'URL doit pointer vers votre backend FastAPI
const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 secondes pour les prédictions
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Intercepteur pour logging
api.interceptors.request.use(
  config => {
    console.log(`🚀 ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  error => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
api.interceptors.response.use(
  response => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  error => {
    console.error('❌ Response Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url
    });
    
    // Message utilisateur convivial
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    } else if (error.response?.status === 404) {
      error.message = 'Endpoint not found.';
    } else if (!error.response) {
      error.message = 'Network error. Check if backend is running.';
    }
    
    return Promise.reject(error);
  }
);

export default api;