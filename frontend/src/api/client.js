/**
 * TaylorDx API Client
 * Centralized API client to prevent hardcoded URLs throughout the frontend
 * Handles authentication, error handling, and response standardization
 */

class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

class ApiClient {
  constructor() {
    // Use environment variable or fallback to current host
    this.baseURL = this.getBaseURL();
    this.defaultTimeout = 10000; // 10 seconds
  }

  getBaseURL() {
    // Priority: Environment variable > Current host with port 5000
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5000';
    }
    
    // Production: Same host, different port
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  getAuthHeaders() {
    const token = this.getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      timeout: this.defaultTimeout,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // Handle non-2xx responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Response body might not be JSON
          errorData = { message: `HTTP ${response.status} ${response.statusText}` };
        }
        
        throw new ApiError(
          response.status,
          errorData.error?.message || errorData.message || `HTTP ${response.status}`,
          errorData
        );
      }
      
      // Parse response
      const data = await response.json();
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout', null);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(0, error.message || 'Network error', null);
    }
  }

  // Convenience methods
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth-specific methods
  async login(username, password) {
    const response = await this.post('/api/auth/login', { username, password });
    if (response.success && response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    return response;
  }

  async logout() {
    localStorage.removeItem('auth_token');
    try {
      return await this.post('/api/auth/logout');
    } catch (error) {
      // Logout locally even if server call fails
      return { success: true };
    }
  }

  // Service-specific methods
  async getServices() {
    return this.get('/api/services');
  }

  async getService(id) {
    return this.get(`/api/services/${id}`);
  }

  async createService(serviceData) {
    return this.post('/api/services', serviceData);
  }

  async updateService(id, serviceData) {
    return this.put(`/api/services/${id}`, serviceData);
  }

  async deleteService(id) {
    return this.delete(`/api/services/${id}`);
  }

  async testService(id) {
    return this.post(`/api/services/${id}/test`);
  }

  // Stats methods
  async getServiceStats(serviceType, serviceId = null) {
    const endpoint = serviceId 
      ? `/api/${serviceType}/${serviceId}/stats`
      : `/api/${serviceType}/stats`;
    return this.get(endpoint);
  }

  // Health check
  async checkHealth() {
    return this.get('/api/health');
  }

  // Docker methods
  async getDockerContainers() {
    return this.get('/api/docker/containers');
  }

  async getDockerImages() {
    return this.get('/api/docker/images');
  }

  // Discovery methods
  async discoverServices(networkRange) {
    return this.post('/api/discovery/scan', { range: networkRange });
  }

  // Error handling helper
  handleError(error, context = '') {
    console.error(`API Error ${context}:`, error);
    
    if (error.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return;
    }
    
    if (error.status === 403) {
      throw new Error('Access denied. You do not have permission for this action.');
    }
    
    if (error.status === 404) {
      throw new Error('Resource not found.');
    }
    
    if (error.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (error.status === 0) {
      throw new Error('Unable to connect to server. Check your internet connection.');
    }
    
    throw error;
  }
}

// Export singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { ApiError };