/**
 * Storage Module
 * Handles data operations via API (online database)
 * Dengan fallback ke localStorage untuk offline mode
 * 
 * OPTIMIZED: Fast localStorage fallback when API unavailable
 */

const Storage = {
  // Cache untuk mengurangi API calls
  _productsCache: null,
  _lastFetch: null,

  // Cache duration (15 detik untuk data lebih segar)
  CACHE_DURATION: 15000,

  // Flag untuk mode offline
  _offlineMode: false,

  // Flag untuk background sync
  _isSyncing: false,

  /**
   * Initialize storage - FAST ONLINE LOADING
   * Data online diambil bersamaan dengan cek API (hanya 1x fetch!)
   * Fallback ke localStorage hanya jika offline
   */
  async init() {
    console.log('🚀 Memulai loading data...');

    // Load localStorage in parallel (for fallback only)
    this._loadFromLocalStorage();

    // Check API availability - this ALSO fetches products data in one call!
    const apiAvailable = await ApiClient.isAvailable();

    if (apiAvailable) {
      this._offlineMode = false;

      // Use cached products from isAvailable() - NO DOUBLE FETCH!
      const cachedProducts = ApiClient.getCachedProducts();
      if (cachedProducts && Array.isArray(cachedProducts)) {
        this._productsCache = cachedProducts;
        this._lastFetch = Date.now();
        localStorage.setItem('produk_manager_products', JSON.stringify(cachedProducts));
        console.log(`✅ Data online berhasil dimuat: ${cachedProducts.length} produk`);
      } else {
        // Fallback: if cached products not available, fetch directly
        console.log('⚠️ Cache kosong, mengambil data langsung dari API...');
        try {
          await this._fetchProducts();
          console.log(`✅ Data fetched: ${this._productsCache?.length || 0} produk`);
        } catch (e) {
          console.warn('⚠️ Gagal fetch data:', e);
        }
      }
    } else {
      console.log('📦 Offline mode - menggunakan data lokal');
      this._offlineMode = true;
    }
  },

  /**
   * Fetch fresh data from API in background without blocking
   */
  async _fetchInBackground() {
    try {
      // Fetch products from API
      await this._fetchProducts();
      console.log('📦 API data fetched in background');

      // Sync unsynced items in background (don't await)
      this._syncInBackground();
    } catch (e) {
      console.warn('⚠️ Background fetch failed, using localStorage');
    }
  },

  /**
   * Sync local changes to API in background (non-blocking)
   */
  async _syncInBackground() {
    // Prevent multiple syncs
    if (this._isSyncing) return;
    this._isSyncing = true;

    try {
      if (!this._productsCache) return;

      // Find unsynced products
      const unsynced = this._productsCache.filter(p => p._synced === false);

      if (unsynced.length === 0) {
        return;
      }

      console.log(`🔄 Background sync: ${unsynced.length} items...`);

      // Process all unsynced items in parallel for speed
      const syncPromises = unsynced.map(async (product) => {
        try {
          // Try to create/update directly without checking first
          await ApiClient.createProduct(product).catch(async () => {
            // If create fails (maybe exists), try update
            await ApiClient.updateProduct(product.id, product);
          });
          product._synced = true;
        } catch (err) {
          console.warn(`Sync failed for ${product.id}`);
        }
      });

      await Promise.allSettled(syncPromises);

      // Save updated _synced status
      localStorage.setItem('produk_manager_products', JSON.stringify(this._productsCache));
      console.log('✅ Background sync completed');
    } finally {
      this._isSyncing = false;
    }
  },

  /**
   * Manual sync (for explicit user action)
   */
  async sync() {
    return this._syncInBackground();
  },

  /**
   * Load data from localStorage into cache
   */
  _loadFromLocalStorage() {
    const productsData = localStorage.getItem('produk_manager_products');
    this._productsCache = productsData ? JSON.parse(productsData) : [];
    this._lastFetch = Date.now();
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Check if cache is valid
   */
  _isCacheValid() {
    return this._lastFetch && (Date.now() - this._lastFetch < this.CACHE_DURATION);
  },

  /**
   * Invalidate cache
   */
  _invalidateCache() {
    this._productsCache = null;
    this._lastFetch = null;
  },

  // ===== Products =====

  /**
   * Fetch products from API (internal)
   */
  async _fetchProducts() {
    const products = await ApiClient.getProducts();
    this._productsCache = products;
    this._lastFetch = Date.now();
    localStorage.setItem('produk_manager_products', JSON.stringify(products));
    return products;
  },

  /**
   * Get all products
   */
  async getProducts() {
    // Return from cache if valid
    if (this._isCacheValid() && this._productsCache) {
      return this._productsCache;
    }

    // Offline mode - use localStorage directly
    if (this._offlineMode) {
      const data = localStorage.getItem('produk_manager_products');
      this._productsCache = data ? JSON.parse(data) : [];
      this._lastFetch = Date.now();
      return this._productsCache;
    }

    try {
      return await this._fetchProducts();
    } catch (e) {
      console.warn('API failed, using localStorage:', e);
      this._offlineMode = true;
      const data = localStorage.getItem('produk_manager_products');
      return data ? JSON.parse(data) : [];
    }
  },

  /**
   * Get single product by ID
   */
  async getProduct(id) {
    // Try from cache first
    if (this._productsCache) {
      const cached = this._productsCache.find(p => p.id === id || p.id === parseInt(id));
      if (cached) return cached;
    }

    // Offline mode
    if (this._offlineMode) {
      const products = await this.getProducts();
      return products.find(p => p.id === id || p.id === parseInt(id));
    }

    try {
      return await ApiClient.getProduct(id);
    } catch (e) {
      const products = await this.getProducts();
      return products.find(p => p.id === id || p.id === parseInt(id));
    }
  },

  /**
   * Add new product
   */
  async addProduct(product) {
    this._invalidateCache();

    // Offline mode
    if (this._offlineMode) {
      return this._addProductLocal(product);
    }

    try {
      const newProduct = await ApiClient.createProduct(product);
      return newProduct;
    } catch (e) {
      console.warn('API failed, saving to localStorage:', e);
      return this._addProductLocal(product, false); // false = not synced
    }
  },

  /**
   * Add product to localStorage (internal)
   */
  async _addProductLocal(product, synced = true) {
    const products = await this.getProducts();
    const newProduct = {
      ...product,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _synced: synced // Mark sync status
    };
    products.unshift(newProduct);
    localStorage.setItem('produk_manager_products', JSON.stringify(products));
    this._productsCache = products;
    return newProduct;
  },

  /**
   * Update existing product
   */
  async updateProduct(id, updates) {
    this._invalidateCache();

    // Offline mode
    if (this._offlineMode) {
      return this._updateProductLocal(id, updates);
    }

    try {
      return await ApiClient.updateProduct(id, updates);
    } catch (e) {
      console.warn('API failed, updating localStorage:', e);
      return this._updateProductLocal(id, updates, false);
    }
  },

  /**
   * Update product in localStorage (internal)
   */
  async _updateProductLocal(id, updates, synced = true) {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === id || p.id === parseInt(id));
    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        _synced: synced
      };
      localStorage.setItem('produk_manager_products', JSON.stringify(products));
      this._productsCache = products;
      return products[index];
    }
    return null;
  },

  /**
   * Delete product
   */
  async deleteProduct(id) {
    this._invalidateCache();

    // Offline mode
    if (this._offlineMode) {
      return this._deleteProductLocal(id);
    }

    try {
      await ApiClient.deleteProduct(id);
      return true;
    } catch (e) {
      console.warn('API failed, deleting from localStorage:', e);
      return this._deleteProductLocal(id);
    }
  },

  /**
   * Delete product from localStorage (internal)
   */
  async _deleteProductLocal(id) {
    const products = await this.getProducts();
    const filtered = products.filter(p => p.id !== id && p.id !== parseInt(id));
    localStorage.setItem('produk_manager_products', JSON.stringify(filtered));
    this._productsCache = filtered;
    return true;
  },

  /**
   * Search products
   */
  async searchProducts(query) {
    // Offline mode - search locally
    if (this._offlineMode) {
      return this._searchProductsLocal(query);
    }

    try {
      return await ApiClient.searchProducts(query);
    } catch (e) {
      return this._searchProductsLocal(query);
    }
  },

  /**
   * Search products locally (internal)
   */
  async _searchProductsLocal(query) {
    const products = await this.getProducts();
    const lowerQuery = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.sku && p.sku.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Upload image - always use base64 for simplicity
   * (Supabase Storage requires additional setup)
   */
  async uploadImage(file) {
    return this._imageToBase64(file);
  },

  /**
   * Convert image to base64 (internal)
   */
  _imageToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Check if in offline mode
   */
  isOffline() {
    return this._offlineMode;
  }
};

// Initialize storage
// Note: Init is now async, called from App.bootstrap()
