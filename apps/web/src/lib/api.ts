'use client';

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Base API configuration
const API_URL = process.env.API_URL || 'http://localhost:4000';
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if we're in the browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  register: async (userData: any) => {
    return api.post('/api/auth/register', userData);
  },
  
  login: async (credentials: { email: string; password: string }) => {
    return api.post('/api/auth/login', credentials);
  },
  
  getProfile: async () => {
    return api.get('/api/auth/profile');
  },
};

export const plotsAPI = {
  getPlots: async (userId?: string) => {
    return api.get('/api/plots', { params: { user_id: userId } });
  },
  
  getPlot: async (id: string) => {
    return api.get(`/api/plots/${id}`);
  },
  
  getPlotById: async (id: string) => {
    return api.get(`/api/plots/${id}`);
  },
  
  createPlot: async (plotData: any) => {
    return api.post('/api/plots', plotData);
  },
  
  updatePlot: async (id: string, plotData: any) => {
    return api.put(`/api/plots/${id}`, plotData);
  },
  
  deletePlot: async (id: string) => {
    return api.delete(`/api/plots/${id}`);
  },
};

export const treesAPI = {
  getTrees: async (plotId: string) => {
    return api.get(`/api/plots/${plotId}/trees`);
  },
  
  getTreeById: async (id: string) => {
    return api.get(`/api/trees/${id}`);
  },
  
  addTree: async (plotId: string, treeData: any) => {
    return api.post(`/api/plots/${plotId}/trees`, treeData);
  },
  
  updateTree: async (id: string, treeData: any) => {
    return api.put(`/api/trees/${id}`, treeData);
  },
  
  deleteTree: async (id: string) => {
    return api.delete(`/api/trees/${id}`);
  },
};

export const carbonAPI = {
  getCarbonEstimates: async (treeId?: string) => {
    return api.get('/api/carbon', { params: { tree_id: treeId } });
  },
  
  getCarbonEstimateById: async (id: string) => {
    return api.get(`/api/carbon/${id}`);
  },
  
  createCarbonEstimate: async (carbonData: any) => {
    return api.post('/api/carbon', carbonData);
  },
  
  updateCarbonEstimate: async (id: string, carbonData: any) => {
    return api.put(`/api/carbon/${id}`, carbonData);
  },
  
  deleteCarbonEstimate: async (id: string) => {
    return api.delete(`/api/carbon/${id}`);
  },
  
  // New methods for plot-level carbon estimates
  getPlotEstimates: async (plotId: string) => {
    return api.get(`/api/plots/${plotId}/estimates`);
  },
  
  runPlotEstimates: async (plotId: string) => {
    return api.post(`/api/plots/${plotId}/estimates/run`);
  },
};

export const ledgerAPI = {
  getLedgerEntries: async (estimateId?: string) => {
    return api.get('/api/ledger', { params: { estimate_id: estimateId } });
  },
  
  getLedgerEntryById: async (id: string) => {
    return api.get(`/api/ledger/${id}`);
  },
  
  createLedgerEntry: async (ledgerData: any) => {
    return api.post('/api/ledger', ledgerData);
  },
};

export const mrvAPI = {
  exportPackage: async (plotId: string) => {
    return api.post(`/api/plots/${plotId}/mrv/export`);
  },
  
  verifyPackage: async (packageId: string) => {
    return api.get(`/api/mrv/${packageId}/verify`);
  },
};

export const estimationAPI = {
  // Run estimation for individual tree
  estimateTree: async (treeId: string) => {
    return api.post(`/api/estimate/tree/${treeId}`);
  },
  
  // Run estimation for entire plot
  estimatePlot: async (plotId: string, storeResults: boolean = true) => {
    return api.post(`/api/estimate/plot/${plotId}`, { store_results: storeResults });
  },
  
  // Manual estimation with custom parameters
  estimate: async (measurements: any) => {
    return api.post('/api/estimate', measurements);
  },
  
  // Get species data
  getSpecies: async () => {
    return api.get('/api/estimate/species');
  },
  
  // Get specific species
  getSpeciesData: async (code: string) => {
    return api.get(`/api/estimate/species/${code}`);
  },
  
  // Get plot estimation summary
  getPlotSummary: async (plotId: string) => {
    return api.get(`/api/estimate/plot/${plotId}/summary`);
  },
};

export default api;
