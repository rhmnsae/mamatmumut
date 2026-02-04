/**
 * API Client Module
 * Handles all HTTP requests to the backend API
 */

const ApiClient = {
    // ================================
    // KONFIGURASI - GANTI DENGAN URL API ANDA
    // ================================
    BASE_URL: 'http://localhost/latranshop/api', // Ganti dengan URL hosting Anda

    // Token storage key
    TOKEN_KEY: 'latranshop_auth_token',

    // Request timeout in milliseconds (3 seconds for faster fallback)
    REQUEST_TIMEOUT: 3000,

    // API availability flag
    _isApiAvailable: null,

    /**
     * Get stored auth token
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /**
     * Set auth token
     */
    setToken(token) {
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
        } else {
            localStorage.removeItem(this.TOKEN_KEY);
        }
    },

    /**
     * Check if API is available (quick ping test)
     */
    async isAvailable() {
        // Return cached result if already checked
        if (this._isApiAvailable !== null) {
            return this._isApiAvailable;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout for ping

            const response = await fetch(`${this.BASE_URL}/categories.php`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            this._isApiAvailable = response.ok;
            console.log(this._isApiAvailable ? '🌐 API online' : '⚠️ API unavailable');
            return this._isApiAvailable;
        } catch (e) {
            console.warn('⚠️ API offline - using localStorage');
            this._isApiAvailable = false;
            return false;
        }
    },

    /**
     * Reset API availability (force recheck)
     */
    resetAvailability() {
        this._isApiAvailable = null;
    },

    /**
     * Make HTTP request with timeout
     */
    async request(endpoint, options = {}) {
        // Skip API if known to be unavailable
        if (this._isApiAvailable === false) {
            throw new Error('API offline');
        }

        const url = `${this.BASE_URL}/${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if exists
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Parse JSON response
            const data = await response.json();

            // Check for errors
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);

            // Mark API as unavailable if aborted (timeout)
            if (error.name === 'AbortError') {
                this._isApiAvailable = false;
                console.warn('API request timeout - switching to offline mode');
            }

            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    /**
     * Upload file
     */
    async upload(file) {
        // Skip if API unavailable
        if (this._isApiAvailable === false) {
            throw new Error('API offline');
        }

        const formData = new FormData();
        formData.append('image', file);

        const url = `${this.BASE_URL}/upload.php`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s for uploads

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Upload Error:', error);
            throw error;
        }
    },

    // ========================================
    // AUTH API
    // ========================================

    /**
     * Login
     */
    async login(username, password) {
        const result = await this.post('auth.php?action=login', { username, password });

        if (result.success && result.token) {
            this.setToken(result.token);
        }

        return result;
    },

    /**
     * Logout
     */
    async logout() {
        try {
            await this.get('auth.php?action=logout');
        } catch (e) {
            // Ignore logout errors
        }
        this.setToken(null);
    },

    /**
     * Check authentication
     */
    async checkAuth() {
        try {
            const result = await this.get('auth.php?action=check');
            return result.authenticated;
        } catch (e) {
            return false;
        }
    },

    /**
     * Initialize default admin
     */
    async initAdmin() {
        return this.get('auth.php?action=init');
    },

    // ========================================
    // PRODUCTS API
    // ========================================

    /**
     * Get all products
     */
    async getProducts() {
        return this.get('products.php');
    },

    /**
     * Get product by ID
     */
    async getProduct(id) {
        return this.get(`products.php?id=${id}`);
    },

    /**
     * Search products
     */
    async searchProducts(query) {
        return this.get(`products.php?search=${encodeURIComponent(query)}`);
    },

    /**
     * Create product
     */
    async createProduct(productData) {
        return this.post('products.php', productData);
    },

    /**
     * Update product
     */
    async updateProduct(id, productData) {
        return this.put(`products.php?id=${id}`, productData);
    },

    /**
     * Delete product
     */
    async deleteProduct(id) {
        return this.delete(`products.php?id=${id}`);
    },

    // ========================================
    // CATEGORIES API
    // ========================================

    /**
     * Get all categories
     */
    async getCategories() {
        return this.get('categories.php');
    },

    /**
     * Add category
     */
    async addCategory(name) {
        return this.post('categories.php', { name });
    },

    /**
     * Delete category
     */
    async deleteCategory(name) {
        return this.delete(`categories.php?name=${encodeURIComponent(name)}`);
    }
};

// Export for use in other modules
window.ApiClient = ApiClient;
