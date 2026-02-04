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
  _categoriesCache: null,
  _lastFetch: null,

  // Cache duration (30 detik untuk performance)
  CACHE_DURATION: 30000,

  // Flag untuk mode offline
  _offlineMode: false,

  /**
   * Initialize storage
   */
  async init() {
    // Quick check if API is available
    const apiAvailable = await ApiClient.isAvailable();

    if (apiAvailable) {
      try {
        // Fetch both in parallel for speed
        const [products, categories] = await Promise.all([
          this._fetchProducts(),
          this._fetchCategories()
        ]);
        console.log('📦 Storage initialized from API');
      } catch (e) {
        console.warn('⚠️ API error, using localStorage fallback');
        this._offlineMode = true;
      }
    } else {
      console.log('📦 Storage initialized from localStorage (offline mode)');
      this._offlineMode = true;
      // Load from localStorage immediately
      this._loadFromLocalStorage();
    }
  },

  /**
   * Load data from localStorage into cache
   */
  _loadFromLocalStorage() {
    const productsData = localStorage.getItem('produk_manager_products');
    const categoriesData = localStorage.getItem('produk_manager_categories');

    this._productsCache = productsData ? JSON.parse(productsData) : [];
    this._categoriesCache = categoriesData ? JSON.parse(categoriesData) : [
      'Elektronik',
      'Fashion',
      'Makanan & Minuman',
      'Kesehatan',
      'Rumah Tangga',
      'Olahraga',
      'Hobi',
      'Lainnya'
    ];
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
    this._categoriesCache = null;
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
   * Fetch categories from API (internal)
   */
  async _fetchCategories() {
    const categories = await ApiClient.getCategories();
    this._categoriesCache = categories;
    localStorage.setItem('produk_manager_categories', JSON.stringify(categories));
    return categories;
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
      return this._addProductLocal(product);
    }
  },

  /**
   * Add product to localStorage (internal)
   */
  async _addProductLocal(product) {
    const products = await this.getProducts();
    const newProduct = {
      ...product,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      return this._updateProductLocal(id, updates);
    }
  },

  /**
   * Update product in localStorage (internal)
   */
  async _updateProductLocal(id, updates) {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === id || p.id === parseInt(id));
    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...updates,
        updatedAt: new Date().toISOString()
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
      (p.sku && p.sku.toLowerCase().includes(lowerQuery)) ||
      (p.category && p.category.toLowerCase().includes(lowerQuery))
    );
  },

  // ===== Categories =====

  /**
   * Get all categories
   */
  async getCategories() {
    if (this._categoriesCache) {
      return this._categoriesCache;
    }

    // Offline mode
    if (this._offlineMode) {
      const data = localStorage.getItem('produk_manager_categories');
      if (data) {
        this._categoriesCache = JSON.parse(data);
        return this._categoriesCache;
      }
      return this._getDefaultCategories();
    }

    try {
      return await this._fetchCategories();
    } catch (e) {
      const data = localStorage.getItem('produk_manager_categories');
      if (data) {
        return JSON.parse(data);
      }
      return this._getDefaultCategories();
    }
  },

  /**
   * Get default categories
   */
  _getDefaultCategories() {
    return [
      'Elektronik',
      'Fashion',
      'Makanan & Minuman',
      'Kesehatan',
      'Rumah Tangga',
      'Olahraga',
      'Hobi',
      'Lainnya'
    ];
  },

  /**
   * Add new category
   */
  async addCategory(name) {
    this._categoriesCache = null;

    if (this._offlineMode) {
      return this._addCategoryLocal(name);
    }

    try {
      await ApiClient.addCategory(name);
      return true;
    } catch (e) {
      return this._addCategoryLocal(name);
    }
  },

  /**
   * Add category to localStorage (internal)
   */
  async _addCategoryLocal(name) {
    const categories = await this.getCategories();
    if (!categories.includes(name)) {
      categories.push(name);
      localStorage.setItem('produk_manager_categories', JSON.stringify(categories));
      this._categoriesCache = categories;
      return true;
    }
    return false;
  },

  /**
   * Delete category
   */
  async deleteCategory(name) {
    this._categoriesCache = null;

    if (this._offlineMode) {
      return this._deleteCategoryLocal(name);
    }

    try {
      await ApiClient.deleteCategory(name);
      return true;
    } catch (e) {
      return this._deleteCategoryLocal(name);
    }
  },

  /**
   * Delete category from localStorage (internal)
   */
  async _deleteCategoryLocal(name) {
    const categories = await this.getCategories();
    const filtered = categories.filter(c => c !== name);
    localStorage.setItem('produk_manager_categories', JSON.stringify(filtered));
    this._categoriesCache = filtered;
    return true;
  },

  // ===== Image Upload =====

  /**
   * Upload image
   */
  async uploadImage(file) {
    // Offline mode - use base64
    if (this._offlineMode) {
      return this._imageToBase64(file);
    }

    try {
      const result = await ApiClient.upload(file);
      return result.url;
    } catch (e) {
      console.warn('Upload failed, using base64:', e);
      return this._imageToBase64(file);
    }
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
