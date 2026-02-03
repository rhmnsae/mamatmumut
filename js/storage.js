/**
 * Storage Module
 * Handles localStorage operations for products and categories
 */

const Storage = {
  KEYS: {
    PRODUCTS: 'produk_manager_products',
    CATEGORIES: 'produk_manager_categories'
  },

  // Default categories
  defaultCategories: [
    'Elektronik',
    'Fashion',
    'Makanan & Minuman',
    'Kesehatan',
    'Rumah Tangga',
    'Olahraga',
    'Hobi',
    'Lainnya'
  ],

  /**
   * Initialize storage with default data if empty
   */
  init() {
    if (!this.getCategories().length) {
      this.saveCategories(this.defaultCategories);
    }
    if (!this.getProducts()) {
      this.saveProducts([]);
    }
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // ===== Products =====

  /**
   * Get all products
   */
  getProducts() {
    try {
      const data = localStorage.getItem(this.KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading products:', e);
      return [];
    }
  },

  /**
   * Save all products
   */
  saveProducts(products) {
    try {
      localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(products));
      return true;
    } catch (e) {
      console.error('Error saving products:', e);
      return false;
    }
  },

  /**
   * Get single product by ID
   */
  getProduct(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id);
  },

  /**
   * Add new product
   */
  addProduct(product) {
    const products = this.getProducts();
    const newProduct = {
      ...product,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    products.unshift(newProduct);
    this.saveProducts(products);
    return newProduct;
  },

  /**
   * Update existing product
   */
  updateProduct(id, updates) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveProducts(products);
      return products[index];
    }
    return null;
  },

  /**
   * Delete product
   */
  deleteProduct(id) {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    this.saveProducts(filtered);
    return true;
  },

  /**
   * Search products
   */
  searchProducts(query) {
    const products = this.getProducts();
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
  getCategories() {
    try {
      const data = localStorage.getItem(this.KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading categories:', e);
      return [];
    }
  },

  /**
   * Save all categories
   */
  saveCategories(categories) {
    try {
      localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(categories));
      return true;
    } catch (e) {
      console.error('Error saving categories:', e);
      return false;
    }
  },

  /**
   * Add new category
   */
  addCategory(name) {
    const categories = this.getCategories();
    if (!categories.includes(name)) {
      categories.push(name);
      this.saveCategories(categories);
      return true;
    }
    return false;
  },

  /**
   * Delete category
   */
  deleteCategory(name) {
    const categories = this.getCategories();
    const filtered = categories.filter(c => c !== name);
    this.saveCategories(filtered);
    return true;
  }
};

// Initialize storage on load
Storage.init();
