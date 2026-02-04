/**
 * API Client Module
 * Handles all HTTP requests to the backend API
 */

const ApiClient = {
    // ================================
    // KONFIGURASI - GANTI DENGAN URL API ANDA
    // ================================
    // BASE_URL: 'http://localhost/latranshop/api', // OLD (Localhost)
    BASE_URL: 'https://latranshop-api.saepulrohman3445.workers.dev/api', // NEW (Update with your Cloudflare Worker URL)

    // Token storage key
    TOKEN_KEY: 'latranshop_auth_token',

    // Request timeout in milliseconds (3 seconds for faster fallback)
    REQUEST_TIMEOUT: 3000,

    // API availability flag
    _isApiAvailable: null,

    // Cache products from availability check to avoid double-fetch
    _cachedProducts: null,

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
     * Check if API is available and fetch products in one call
     * Mengambil data sekaligus saat check API untuk menghindari double-fetch
     */
    async isAvailable() {
        try {
            const controller = new AbortController();
            // 2 detik timeout
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            // Fetch products - this both checks availability AND gets data
            const response = await fetch(`${this.BASE_URL}/products`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                // Cache the products data to avoid fetching again
                const data = await response.json();
                this._cachedProducts = data;
                this._isApiAvailable = true;
                console.log('🌐 API online - data dimuat');
                return true;
            }

            this._isApiAvailable = false;
            return false;
        } catch (e) {
            console.warn('⚠️ API offline - menggunakan data lokal');
            this._isApiAvailable = false;
            this._cachedProducts = null;
            return false;
        }
    },

    /**
     * Get cached products from availability check
     */
    getCachedProducts() {
        const cached = this._cachedProducts;
        this._cachedProducts = null; // Clear after use
        return cached;
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
                throw new Error('Koneksi lambat/timeout. Beralih ke mode offline.');
            }

            if (!navigator.onLine) {
                throw new Error('Tidak ada koneksi internet.');
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
        return this.get('products');
    },

    /**
     * Get product by ID
     */
    async getProduct(id) {
        return this.get(`products?id=${id}`);
    },

    /**
     * Search products
     */
    async searchProducts(query) {
        return this.get(`products?search=${encodeURIComponent(query)}`);
    },

    /**
     * Create product
     */
    async createProduct(productData) {
        return this.post('products', productData);
    },

    /**
     * Update product
     */
    async updateProduct(id, productData) {
        return this.put(`products?id=${id}`, productData);
    },

    /**
     * Delete product
     */
    async deleteProduct(id) {
        return this.delete(`products?id=${id}`);
    }
};

// Export for use in other modules
window.ApiClient = ApiClient;
