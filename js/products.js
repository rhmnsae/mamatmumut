/**
 * Products Module
 * Handles product CRUD operations and table rendering
 * Updated for async API operations
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
      // Debounced search
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.renderTable(e.target.value);
        }, 300);
      });
    }
  },

  /**
   * Render products table (async)
   */
  async renderTable(searchQuery = '') {
    const tbody = UI.elements.productsTableBody;
    const emptyState = document.getElementById('emptyState');
    const table = UI.elements.productsTable;
    const productsCard = document.getElementById('productsContentCard');
    const mobileCards = document.getElementById('mobileProductCards');

    try {
      // Fetch products from API
      const products = searchQuery
        ? await Storage.searchProducts(searchQuery)
        : await Storage.getProducts();

      if (products.length === 0) {
        tbody.innerHTML = '';
        if (mobileCards) {
          // Show search not found message in mobile
          if (searchQuery) {
            mobileCards.innerHTML = `
              <div class="search-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <p style="font-weight: 500; margin-bottom: 4px;">Produk tidak ditemukan</p>
                <p style="font-size: 13px; opacity: 0.7;">Tidak ada produk dengan kata kunci "${searchQuery}"</p>
              </div>
            `;
          } else {
            mobileCards.innerHTML = '';
          }
        }
        if (productsCard) {
          if (searchQuery) {
            // Show search not found on productsCard
            productsCard.classList.remove('hidden');
            tbody.innerHTML = `
              <tr>
                <td colspan="10" class="text-center" style="padding: 40px;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <p style="font-weight: 500; margin-bottom: 4px;">Produk tidak ditemukan</p>
                  <p style="font-size: 13px; opacity: 0.7;">Tidak ada produk dengan kata kunci "${searchQuery}"</p>
                </td>
              </tr>
            `;
            emptyState.classList.add('hidden');
          } else {
            productsCard.classList.add('hidden');
            emptyState.classList.remove('hidden');
          }
        } else {
          emptyState.classList.remove('hidden');
        }
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
                  <td class="text-right">
                      <span class="text-sm text-muted">${product.originalPrice ? UI.formatCurrency(product.originalPrice) : '-'}</span>
                  </td>
                  <td class="text-right">
                      <span class="font-semibold text-success">${UI.formatCurrency(product.salePrice)}</span>
                  </td>
                  <td class="text-right">
                      <span class="text-sm text-secondary">${product.weight ? `${product.weight}g` : '-'}</span>
                  </td>
                  <td class="text-center">
                      <span class="text-sm text-secondary font-medium">${product.size || '-'}</span>
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

    } catch (error) {
      console.error('Error rendering products:', error);
      UI.showToast('Gagal memuat produk', 'error');
    }
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
                    </div>
                </div>
                <div class="mobile-product-details-grid">
                    <div class="mobile-product-detail-row">
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">Harga Asli</span>
                            <span class="mobile-product-value original-price">${product.originalPrice ? UI.formatCurrency(product.originalPrice) : '-'}</span>
                        </div>
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">Harga Jual</span>
                            <span class="mobile-product-value price">${UI.formatCurrency(product.salePrice)}</span>
                        </div>
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">Stok</span>
                            <span class="mobile-product-value ${getStockClass(product.stock)}">${product.stock}</span>
                        </div>
                    </div>
                    <div class="mobile-product-detail-row">
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">Berat</span>
                            <span class="mobile-product-value">${product.weight ? `${product.weight}g` : '-'}</span>
                        </div>
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">Ukuran</span>
                            <span class="mobile-product-value" style="font-weight: 600;">${product.size || '-'}</span>
                        </div>
                    </div>
                    <div class="mobile-product-detail-row">
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">P. Bawahan</span>
                            <span class="mobile-product-value">${product.panjangBawahan ? `${product.panjangBawahan} cm` : '-'}</span>
                        </div>
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">L. Pinggang</span>
                            <span class="mobile-product-value">${product.lingkarPinggang ? `${product.lingkarPinggang} cm` : '-'}</span>
                        </div>
                        <div class="mobile-product-detail">
                            <span class="mobile-product-label">L. Paha</span>
                            <span class="mobile-product-value">${product.lingkarPaha ? `${product.lingkarPaha} cm` : '-'}</span>
                        </div>
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
   * Setup inline stock edit (async)
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

        const saveValue = async () => {
          const newValue = parseInt(input.value) || 0;

          try {
            await Storage.updateProduct(id, { stock: newValue });
            await this.renderTable(document.getElementById('searchInput')?.value || '');
            UI.showToast('Stok berhasil diupdate');

            // Refresh dashboard if exists
            if (typeof Dashboard !== 'undefined') {
              Dashboard.refresh();
            }
          } catch (error) {
            console.error('Error updating stock:', error);
            UI.showToast('Gagal update stok', 'error');
          }
        };

        input.addEventListener('blur', saveValue);
        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            await saveValue();
          }
          if (e.key === 'Escape') {
            this.renderTable(document.getElementById('searchInput')?.value || '');
          }
        });
      });
    });
  },

  /**
   * Save product (add or update) - async
   */
  async saveProduct() {
    const id = document.getElementById('productId').value;
    const saveBtn = document.getElementById('modalSave');

    // Disable button during save
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';
    }

    const productData = {
      name: document.getElementById('productName').value.trim(),
      sku: document.getElementById('productSku').value.trim(),
      originalPrice: parseFloat(document.getElementById('productOriginalPrice').value) || 0,
      salePrice: parseFloat(document.getElementById('productSalePrice').value),
      stock: parseInt(document.getElementById('productStock').value),
      weight: parseFloat(document.getElementById('productWeight').value) || 0,
      size: document.getElementById('productSize').value || null,
      panjangBawahan: parseFloat(document.getElementById('productPanjangBawahan').value) || 0,
      lingkarPinggang: parseFloat(document.getElementById('productLingkarPinggang').value) || 0,
      lingkarPaha: parseFloat(document.getElementById('productLingkarPaha').value) || 0,
      image: UI.currentImage || null
    };

    try {
      if (id) {
        await Storage.updateProduct(id, productData);
        UI.showToast('Produk berhasil diupdate');
      } else {
        await Storage.addProduct(productData);
        UI.showToast('Produk berhasil ditambahkan');
      }

      UI.closeProductModal();
      await this.renderTable(document.getElementById('searchInput')?.value || '');

      // Refresh dashboard
      if (typeof Dashboard !== 'undefined') {
        Dashboard.refresh();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      UI.showToast('Gagal menyimpan produk', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan';
      }
    }
  },

  /**
   * Edit product (async)
   */
  async editProduct(id) {
    try {
      const product = await Storage.getProduct(id);
      if (product) {
        UI.openProductModal(product);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      UI.showToast('Gagal memuat produk', 'error');
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
