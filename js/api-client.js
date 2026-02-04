/**
 * API Client Module for Supabase
 * Handles all HTTP requests to Supabase backend
 */

const ApiClient = {
    // ================================
    // KONFIGURASI SUPABASE
    // ================================
    SUPABASE_URL: 'https://igeowsbmlfzfoojaojco.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZW93c2JtbGZ6Zm9vamFvamNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjQ4NDUsImV4cCI6MjA4NTgwMDg0NX0.1uAC-OTC2cBXTzH_oNCufg7_RLA4UIgTSa93NjnDTIk',

    // Request timeout in milliseconds
    REQUEST_TIMEOUT: 5000,

    // API availability flag
    _isApiAvailable: null,

    // Cache products from availability check
    _cachedProducts: null,

    /**
     * Get Supabase headers
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'apikey': this.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
        };
    },

    /**
     * Check if API is available and fetch products in one call
     */
    async isAvailable() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 detik timeout

            const response = await fetch(`${this.SUPABASE_URL}/rest/v1/products?order=created_at.desc`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                // Format products from snake_case to camelCase
                this._cachedProducts = data.map(p => this._formatProduct(p));
                this._isApiAvailable = true;
                console.log(`🌐 Supabase online - ${data.length} produk dimuat`);
                return true;
            }

            console.error('❌ Supabase response not ok:', response.status, response.statusText);
            this._isApiAvailable = false;
            return false;
        } catch (e) {
            console.warn('⚠️ Supabase offline - menggunakan data lokal:', e.message);
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
        this._cachedProducts = null;
        return cached;
    },

    /**
     * Reset API availability
     */
    resetAvailability() {
        this._isApiAvailable = null;
    },

    /**
     * Make HTTP request with timeout
     */
    async request(endpoint, options = {}) {
        if (this._isApiAvailable === false) {
            throw new Error('API offline');
        }

        const url = `${this.SUPABASE_URL}/rest/v1/${endpoint}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                headers: this.getHeaders(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Request failed: ${response.status}`);
            }

            // Handle empty responses (e.g., DELETE)
            const text = await response.text();
            return text ? JSON.parse(text) : { success: true };

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                this._isApiAvailable = false;
                throw new Error('Koneksi lambat/timeout. Beralih ke mode offline.');
            }

            if (!navigator.onLine) {
                throw new Error('Tidak ada koneksi internet.');
            }

            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // ========================================
    // PRODUCTS API - Supabase PostgREST
    // ========================================

    /**
     * Get all products
     */
    async getProducts() {
        const result = await this.request('products?order=created_at.desc');
        return result.map(p => this._formatProduct(p));
    },

    /**
     * Get product by ID
     */
    async getProduct(id) {
        const result = await this.request(`products?id=eq.${id}`);
        return result && result.length > 0 ? this._formatProduct(result[0]) : null;
    },

    /**
     * Search products
     */
    async searchProducts(query) {
        const encoded = encodeURIComponent(`%${query}%`);
        const result = await this.request(`products?or=(name.ilike.${encoded},sku.ilike.${encoded})&order=created_at.desc`);
        return result.map(p => this._formatProduct(p));
    },

    /**
     * Create product
     */
    async createProduct(productData) {
        const payload = this._toSnakeCase(productData);
        payload.id = payload.id || this._generateId();

        const result = await this.request('products', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        return result && result.length > 0 ? this._formatProduct(result[0]) : { success: true, id: payload.id };
    },

    /**
     * Update product
     */
    async updateProduct(id, productData) {
        const payload = this._toSnakeCase(productData);
        payload.updated_at = new Date().toISOString();

        const result = await this.request(`products?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        return result && result.length > 0 ? this._formatProduct(result[0]) : { success: true };
    },

    /**
     * Delete product
     */
    async deleteProduct(id) {
        await this.request(`products?id=eq.${id}`, {
            method: 'DELETE'
        });
        return { success: true };
    },

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Generate unique ID
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    },

    /**
     * Convert camelCase to snake_case for Supabase
     */
    _toSnakeCase(data) {
        return {
            id: data.id,
            name: data.name,
            sku: data.sku,
            original_price: data.originalPrice ?? 0,
            sale_price: data.salePrice ?? 0,
            stock: data.stock ?? 0,
            weight: data.weight ?? 0,
            size: data.size ?? null,
            panjang_bawahan: data.panjangBawahan ?? 0,
            lingkar_pinggang: data.lingkarPinggang ?? 0,
            lingkar_paha: data.lingkarPaha ?? 0,
            image_url: data.image ?? null
        };
    },

    /**
     * Format product from Supabase (snake_case to camelCase)
     */
    _formatProduct(p) {
        if (!p) return null;
        return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            originalPrice: p.original_price,
            salePrice: p.sale_price,
            stock: p.stock,
            weight: p.weight,
            size: p.size,
            panjangBawahan: p.panjang_bawahan,
            lingkarPinggang: p.lingkar_pinggang,
            lingkarPaha: p.lingkar_paha,
            image: p.image_url,
            createdAt: p.created_at,
            updatedAt: p.updated_at
        };
    }
};

// Export for use in other modules
window.ApiClient = ApiClient;
