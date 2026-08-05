import axios, { AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3004/api' : '/api');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data || {};
    const message = errorData.message || errorData.error || `API request failed with status ${error.response?.status}`;
    return Promise.reject(new Error(message));
  }
);

// Maintain the fetchAPI signature for backward compatibility with native fetch calls
export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const axiosOptions: AxiosRequestConfig = {
      url: endpoint,
      method: options.method || 'GET',
      headers: options.headers as any,
    };
    
    if (options.body) {
      try {
        axiosOptions.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch {
        axiosOptions.data = options.body;
      }
    }

    const response = await apiClient(axiosOptions);
    return response.data;
  } catch (error) {
    throw error;
  }
};
