/**
 * Products Module
 * Handles product CRUD operations and table rendering
 */

const Products = {
  /**
   * Initialize products module
   */
  init() {
    this.bindEvents();
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Empty state add button
    const emptyAddBtn = document.getElementById('emptyAddBtn');
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => UI.openProductModal());
    }

    // Product form submit
    UI.elements.productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProduct();
    });
  },

  /**
   * Bind header action events (called when switching to products page)
   */
  bindHeaderEvents() {
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => UI.openProductModal());
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderTable(e.target.value);
      });
    }
  },

  /**
   * Render products table
   */
  renderTable(searchQuery = '') {
    const products = searchQuery
      ? Storage.searchProducts(searchQuery)
      : Storage.getProducts();

    const tbody = UI.elements.productsTableBody;
    const emptyState = document.getElementById('emptyState');
    const table = UI.elements.productsTable;
    const productsCard = document.getElementById('productsContentCard');
    const mobileCards = document.getElementById('mobileProductCards');

    if (products.length === 0) {
      tbody.innerHTML = '';
      if (mobileCards) mobileCards.innerHTML = '';
      if (productsCard) productsCard.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    if (productsCard) productsCard.classList.remove('hidden');
    table.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Render desktop table with clickable images
    tbody.innerHTML = products.map((product, index) => `
            <tr data-id="${product.id}">
                <td class="text-center text-muted text-sm">${index + 1}</td>
                <td class="table-img-cell">
                    <img 
                        class="table-img" 
                        src="${product.image || this.getPlaceholderImage()}" 
                        alt="${product.name}"
                        onclick="UI.openImageModal('${product.image || ''}')"
                    >
                </td>
                <td>
                    <code class="mono text-xs text-muted">${product.sku || '-'}</code>
                </td>
                <td>
                    <div class="product-name-link" onclick="Products.viewProduct('${product.id}')" style="cursor: pointer;">
                        <div class="font-medium text-primary line-clamp-2">${product.name}</div>
                    </div>
                </td>
                <td>
                    <span class="text-sm text-secondary">${product.category || '-'}</span>
                </td>
                <td class="text-right">
                    <span class="text-sm text-muted">${product.originalPrice ? UI.formatCurrency(product.originalPrice) : '-'}</span>
                </td>
                <td class="text-right">
                    <span class="font-semibold text-success">${UI.formatCurrency(product.salePrice)}</span>
                </td>
                <td class="text-right">
                    <span class="text-sm text-secondary">${product.weight ? `${product.weight}g` : '-'}</span>
                </td>
                <td>
                    <span class="text-sm text-secondary text-xs">
                        ${product.dimensions && (product.dimensions.l || product.dimensions.w || product.dimensions.h)
        ? `${product.dimensions.l || 0}x${product.dimensions.w || 0}x${product.dimensions.h || 0}`
        : '-'}
                    </span>
                </td>
                <td class="text-center">
                    <span 
                        class="inline-edit" 
                        data-id="${product.id}" 
                        data-field="stock"
                        title="Klik untuk edit"
                    >
                        <span class="${UI.getStockBadge(product.stock)}">${product.stock}</span>
                    </span>
                </td>
                <td>

                    <div class="table-actions">
                        <button class="btn btn-ghost btn-icon" onclick="Products.editProduct('${product.id}')" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-icon text-danger" onclick="Products.deleteProduct('${product.id}', '${product.name.replace(/'/g, "\\'")}')" title="Hapus">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    // Render mobile cards with clickable images
    if (mobileCards) {
      this.renderMobileCards(products, mobileCards);
    }

    // Setup inline edit
    this.setupInlineEdit();
  },

  /**
   * Get placeholder image SVG
   */
  getPlaceholderImage() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
  },

  /**
   * Render mobile product cards
   */
  renderMobileCards(products, container) {
    const getStockClass = (stock) => {
      if (stock === 0) return 'out-of-stock';
      if (stock < 10) return 'low-stock';
      return '';
    };

    container.innerHTML = products.map(product => `
            <div class="mobile-product-card" data-id="${product.id}">
                <div class="mobile-product-header">
                    <img 
                        class="mobile-product-img" 
                        src="${product.image || this.getPlaceholderImage()}" 
                        alt="${product.name}"
                        onclick="UI.openImageModal('${product.image || ''}')"
                    >
                    <div class="mobile-product-info" onclick="Products.viewProduct('${product.id}')" style="cursor: pointer;">
                        <div class="mobile-product-name">${product.name}</div>
                        ${product.sku ? `<div class="mobile-product-sku">${product.sku}</div>` : ''}
                        ${product.category ? `<span class="mobile-product-category">${product.category}</span>` : ''}
                    </div>
                </div>
                <div class="mobile-product-details">
                    <div class="mobile-product-detail">
                        <span class="mobile-product-label">Harga</span>
                        <span class="mobile-product-value price">${UI.formatCurrency(product.salePrice)}</span>
                    </div>
                    <div class="mobile-product-detail">
                        <span class="mobile-product-label">Stok</span>
                        <span class="mobile-product-value ${getStockClass(product.stock)}">${product.stock}</span>
                    </div>
                </div>
                <div class="mobile-product-actions">
                    <button class="btn btn-secondary btn-sm" onclick="Products.editProduct('${product.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="Products.deleteProduct('${product.id}', '${product.name.replace(/'/g, "\\'")}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        <span>Hapus</span>
                    </button>
                </div>
            </div>
        `).join('');
  },

  /**
   * Setup inline stock edit
   */
  setupInlineEdit() {
    const editables = document.querySelectorAll('.inline-edit');

    editables.forEach(el => {
      el.addEventListener('click', () => {
        if (el.classList.contains('editing')) return;

        const id = el.dataset.id;
        const currentValue = el.querySelector('.badge').textContent;

        el.classList.add('editing');
        el.innerHTML = `<input type="number" value="${currentValue}" min="0">`;

        const input = el.querySelector('input');
        input.focus();
        input.select();

        const saveValue = () => {
          const newValue = parseInt(input.value) || 0;
          Storage.updateProduct(id, { stock: newValue });
          this.renderTable(document.getElementById('searchInput')?.value || '');
          UI.showToast('Stok berhasil diupdate');

          // Refresh dashboard if exists
          if (typeof Dashboard !== 'undefined') {
            Dashboard.refresh();
          }
        };

        input.addEventListener('blur', saveValue);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveValue();
          }
          if (e.key === 'Escape') {
            this.renderTable(document.getElementById('searchInput')?.value || '');
          }
        });
      });
    });
  },

  /**
   * Save product (add or update)
   */
  saveProduct() {
    const id = document.getElementById('productId').value;

    const productData = {
      name: document.getElementById('productName').value.trim(),
      sku: document.getElementById('productSku').value.trim(),
      category: document.getElementById('productCategory').value.trim(),
      originalPrice: parseFloat(document.getElementById('productOriginalPrice').value) || 0,
      salePrice: parseFloat(document.getElementById('productSalePrice').value),
      stock: parseInt(document.getElementById('productStock').value),
      weight: parseFloat(document.getElementById('productWeight').value) || 0,
      dimensions: {
        l: parseFloat(document.getElementById('productLength').value) || 0,
        w: parseFloat(document.getElementById('productWidth').value) || 0,
        h: parseFloat(document.getElementById('productHeight').value) || 0
      },
      image: UI.currentImage || null
    };

    if (id) {
      Storage.updateProduct(id, productData);
      UI.showToast('Produk berhasil diupdate');
    } else {
      Storage.addProduct(productData);
      UI.showToast('Produk berhasil ditambahkan');
    }

    UI.closeProductModal();
    this.renderTable(document.getElementById('searchInput')?.value || '');

    // Refresh dashboard
    if (typeof Dashboard !== 'undefined') {
      Dashboard.refresh();
    }
  },

  /**
   * Edit product
   */
  editProduct(id) {
    const product = Storage.getProduct(id);
    if (product) {
      UI.openProductModal(product);
    }
  },

  /**
   * Delete product - opens confirmation modal
   */
  deleteProduct(id, name) {
    UI.openDeleteModal(id, name);
  },

  /**
   * View product detail
   */
  viewProduct(id) {
    UI.switchPage('productDetail', id);
  }
};
