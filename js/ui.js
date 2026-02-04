/**
 * UI Module
 * Handles UI interactions, modals, and toasts
 */

const UI = {
    // Element references
    elements: {},
    currentImage: null,
    deleteProductId: null,

    /**
     * Initialize UI elements
     */
    init() {
        this.elements = {
            // Sidebar
            sidebar: document.getElementById('sidebar'),
            sidebarOverlay: document.getElementById('sidebarOverlay'),
            menuToggle: document.getElementById('menuToggle'),
            navItems: document.querySelectorAll('.nav-item'),

            // Pages
            pageTitle: document.getElementById('pageTitle'),
            headerActions: document.getElementById('headerActions'),
            dashboardPage: document.getElementById('dashboardPage'),
            productsPage: document.getElementById('productsPage'),
            outofstockPage: document.getElementById('outofstockPage'),
            lowstockPage: document.getElementById('lowstockPage'),
            productDetailPage: document.getElementById('productDetailPage'),

            // Product Modal
            productModal: document.getElementById('productModal'),
            productForm: document.getElementById('productForm'),
            modalTitle: document.getElementById('modalTitle'),
            modalClose: document.getElementById('modalClose'),
            modalCancel: document.getElementById('modalCancel'),

            // Delete Modal
            deleteModal: document.getElementById('deleteModal'),
            deleteProductName: document.getElementById('deleteProductName'),
            deleteModalClose: document.getElementById('deleteModalClose'),
            deleteCancelBtn: document.getElementById('deleteCancelBtn'),
            deleteConfirmBtn: document.getElementById('deleteConfirmBtn'),

            // Image Modal
            imageModal: document.getElementById('imageModal'),
            imageModalImg: document.getElementById('imageModalImg'),
            imageModalClose: document.getElementById('imageModalClose'),

            // Upload
            uploadZone: document.getElementById('uploadZone'),
            productImage: document.getElementById('productImage'),
            uploadPreview: document.getElementById('uploadPreview'),

            // Table
            productsTable: document.getElementById('productsTable'),
            productsTableBody: document.getElementById('productsTableBody'),
            emptyState: document.getElementById('emptyState'),

            // Toast
            toastContainer: document.getElementById('toastContainer'),

            // Mobile Search
            floatingSearchBtn: document.getElementById('floatingSearchBtn'),
            mobileSearchOverlay: document.getElementById('mobileSearchOverlay'),
            mobileSearchInput: document.getElementById('mobileSearchInput'),
            mobileSearchClose: document.getElementById('mobileSearchClose')
        };

        this.setupEventListeners();
        this.setupMobileSearch();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        this.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(item.dataset.page);
            });
        });

        // Mobile menu toggle
        if (this.elements.menuToggle) {
            this.elements.menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Sidebar overlay click to close
        if (this.elements.sidebarOverlay) {
            this.elements.sidebarOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Close modals on backdrop click
        this.elements.productModal.addEventListener('click', (e) => {
            if (e.target === this.elements.productModal) {
                this.closeProductModal();
            }
        });

        this.elements.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.elements.deleteModal) {
                this.closeDeleteModal();
            }
        });

        this.elements.imageModal.addEventListener('click', (e) => {
            if (e.target === this.elements.imageModal) {
                this.closeImageModal();
            }
        });

        // Modal close buttons
        this.elements.modalClose.addEventListener('click', () => this.closeProductModal());
        this.elements.modalCancel.addEventListener('click', () => this.closeProductModal());

        this.elements.deleteModalClose.addEventListener('click', () => this.closeDeleteModal());
        this.elements.deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal());
        this.elements.deleteConfirmBtn.addEventListener('click', () => this.confirmDelete());

        this.elements.imageModalClose.addEventListener('click', () => this.closeImageModal());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductModal();
                this.closeDeleteModal();
                this.closeImageModal();
                this.closeSidebar();
            }
        });

        // Upload zone
        this.setupUploadZone();
    },

    /**
     * Setup upload zone drag & drop
     */
    setupUploadZone() {
        const zone = this.elements.uploadZone;
        const input = this.elements.productImage;

        zone.addEventListener('click', () => input.click());

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file);
            }
        });

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });
    },

    /**
     * Setup mobile search functionality
     */
    setupMobileSearch() {
        const { floatingSearchBtn, mobileSearchOverlay, mobileSearchInput, mobileSearchClose } = this.elements;

        if (!floatingSearchBtn || !mobileSearchOverlay) return;

        // Initially hide floating button (will be shown on products page)
        floatingSearchBtn.classList.add('hidden');

        // Open mobile search overlay
        floatingSearchBtn.addEventListener('click', () => {
            this.openMobileSearch();
        });

        // Close on close button click
        mobileSearchClose.addEventListener('click', () => {
            this.closeMobileSearch();
        });

        // Close on backdrop click
        mobileSearchOverlay.addEventListener('click', (e) => {
            if (e.target === mobileSearchOverlay) {
                this.closeMobileSearch();
            }
        });

        // Handle search input
        mobileSearchInput.addEventListener('input', (e) => {
            const searchQuery = e.target.value;
            // Sync with desktop search input if it exists
            const desktopSearch = document.getElementById('searchInput');
            if (desktopSearch) {
                desktopSearch.value = searchQuery;
            }
            // Trigger search
            Products.renderTable(searchQuery);
        });

        // Close on Enter key
        mobileSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.closeMobileSearch();
            }
        });
    },

    /**
     * Open mobile search overlay
     */
    openMobileSearch() {
        this.elements.mobileSearchOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            this.elements.mobileSearchInput.focus();
        }, 300);
    },

    /**
     * Close mobile search overlay
     */
    closeMobileSearch() {
        this.elements.mobileSearchOverlay.classList.remove('open');
        document.body.style.overflow = '';
    },

    /**
     * Handle image upload
     */
    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.showImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    },

    /**
     * Show image preview
     */
    showImagePreview(src) {
        this.elements.uploadPreview.innerHTML = `
            <div class="upload-preview-item">
                <img src="${src}" alt="Preview">
                <button type="button" onclick="UI.removeImagePreview()">×</button>
            </div>
        `;
        this.currentImage = src;
    },

    /**
     * Remove image preview
     */
    removeImagePreview() {
        this.elements.uploadPreview.innerHTML = '';
        this.elements.productImage.value = '';
        this.currentImage = null;
    },

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        const isOpen = this.elements.sidebar.classList.toggle('open');
        if (this.elements.sidebarOverlay) {
            this.elements.sidebarOverlay.classList.toggle('active', isOpen);
        }
        document.body.style.overflow = isOpen ? 'hidden' : '';
    },

    /**
     * Close sidebar
     */
    closeSidebar() {
        this.elements.sidebar.classList.remove('open');
        if (this.elements.sidebarOverlay) {
            this.elements.sidebarOverlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    },

    /**
     * Switch between pages
     */
    switchPage(page, productId = null) {
        // Update nav items
        this.elements.navItems.forEach(item => {
            // For stock pages and product detail, keep dashboard active in nav
            if (page === 'outofstock' || page === 'lowstock' || page === 'productDetail') {
                item.classList.toggle('active', item.dataset.page === 'dashboard');
            } else {
                item.classList.toggle('active', item.dataset.page === page);
            }
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            products: 'Produk',
            outofstock: 'Stok Habis',
            lowstock: 'Stok Rendah',
            productDetail: 'Detail Produk'
        };
        this.elements.pageTitle.textContent = titles[page] || 'Dashboard';

        // Hide all pages
        this.elements.dashboardPage.classList.add('hidden');
        this.elements.productsPage.classList.add('hidden');
        if (this.elements.outofstockPage) this.elements.outofstockPage.classList.add('hidden');
        if (this.elements.lowstockPage) this.elements.lowstockPage.classList.add('hidden');
        if (this.elements.productDetailPage) this.elements.productDetailPage.classList.add('hidden');

        // Show selected page
        switch (page) {
            case 'dashboard':
                this.elements.dashboardPage.classList.remove('hidden');
                break;
            case 'products':
                this.elements.productsPage.classList.remove('hidden');
                break;
            case 'outofstock':
                if (this.elements.outofstockPage) {
                    this.elements.outofstockPage.classList.remove('hidden');
                    Dashboard.renderOutOfStockPage();
                }
                break;
            case 'lowstock':
                if (this.elements.lowstockPage) {
                    this.elements.lowstockPage.classList.remove('hidden');
                    Dashboard.renderLowStockPage();
                }
                break;
            case 'productDetail':
                if (this.elements.productDetailPage && productId) {
                    this.elements.productDetailPage.classList.remove('hidden');
                    Dashboard.renderProductDetail(productId);
                }
                break;
        }

        // Update header actions
        this.updateHeaderActions(page);

        // Close mobile sidebar
        this.closeSidebar();

        // Toggle floating search button visibility (only show on products page)
        if (this.elements.floatingSearchBtn) {
            if (page === 'products') {
                this.elements.floatingSearchBtn.classList.remove('hidden');
            } else {
                this.elements.floatingSearchBtn.classList.add('hidden');
                // Clear mobile search input when leaving products page
                if (this.elements.mobileSearchInput) {
                    this.elements.mobileSearchInput.value = '';
                }
                this.closeMobileSearch();
            }
        }

        // Refresh dashboard data if needed
        if (page === 'dashboard' && typeof Dashboard !== 'undefined') {
            Dashboard.refresh();
        }
    },

    /**
     * Update header actions based on current page
     */
    updateHeaderActions(page) {
        const container = this.elements.headerActions;

        if (page === 'products') {
            container.innerHTML = `
                <div class="search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" class="form-input" id="searchInput" placeholder="Cari produk...">
                </div>
                <button class="btn btn-secondary" id="exportBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Export</span>
                </button>
                <button class="btn btn-primary" id="addProductBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span>Tambah</span>
                </button>
            `;

            // Re-bind events
            Products.bindHeaderEvents();
            Export.bindEvents();
        } else if (page === 'outofstock' || page === 'lowstock') {
            container.innerHTML = `
                <button class="btn btn-secondary" onclick="UI.switchPage('dashboard')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12 19 5 12 12 5"/>
                    </svg>
                    <span>Kembali</span>
                </button>
            `;
        } else if (page === 'productDetail') {
            container.innerHTML = `
                <button class="btn btn-secondary" onclick="UI.switchPage('dashboard')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12 19 5 12 12 5"/>
                    </svg>
                    <span>Kembali</span>
                </button>
            `;
        } else {
            container.innerHTML = `
                <button class="btn btn-primary" id="quickAddBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span>Tambah Produk</span>
                </button>
            `;

            const quickAddBtn = document.getElementById('quickAddBtn');
            if (quickAddBtn) {
                quickAddBtn.addEventListener('click', () => this.openProductModal());
            }
        }
    },

    /**
     * Open product modal
     */
    openProductModal(product = null) {
        this.elements.modalTitle.textContent = product ? 'Edit Produk' : 'Tambah Produk';
        this.elements.productForm.reset();
        this.removeImagePreview();

        if (product) {
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productSku').value = product.sku || '';
            document.getElementById('productOriginalPrice').value = product.originalPrice || '';
            document.getElementById('productSalePrice').value = product.salePrice;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productWeight').value = product.weight || '';
            document.getElementById('productLength').value = product.dimensions?.l || '';
            document.getElementById('productWidth').value = product.dimensions?.w || '';
            document.getElementById('productHeight').value = product.dimensions?.h || '';

            if (product.image) {
                this.showImagePreview(product.image);
            }
        }

        this.elements.productModal.classList.add('open');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            document.getElementById('productName').focus();
        }, 300);
    },

    /**
     * Close product modal
     */
    closeProductModal() {
        this.elements.productModal.classList.remove('open');
        this.elements.productForm.reset();
        this.removeImagePreview();
        document.body.style.overflow = '';
    },

    /**
     * Open delete confirmation modal
     */
    openDeleteModal(id, name) {
        this.deleteProductId = id;
        this.elements.deleteProductName.textContent = name;
        this.elements.deleteModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close delete modal
     */
    closeDeleteModal() {
        this.elements.deleteModal.classList.remove('open');
        this.deleteProductId = null;
        document.body.style.overflow = '';
    },

    /**
     * Confirm delete action (async)
     */
    async confirmDelete() {
        if (this.deleteProductId) {
            try {
                await Storage.deleteProduct(this.deleteProductId);
                this.showToast('Produk berhasil dihapus', 'info');
                await Products.renderTable(document.getElementById('searchInput')?.value || '');

                // Refresh dashboard and stock pages
                if (typeof Dashboard !== 'undefined') {
                    Dashboard.refresh();
                    Dashboard.renderOutOfStockPage();
                    Dashboard.renderLowStockPage();
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                this.showToast('Gagal menghapus produk', 'error');
            }
        }
        this.closeDeleteModal();
    },

    /**
     * Open image preview modal
     */
    openImageModal(src) {
        if (!src || src.includes('data:image/svg+xml')) return;

        this.elements.imageModalImg.src = src;
        this.elements.imageModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close image modal
     */
    closeImageModal() {
        this.elements.imageModal.classList.remove('open');
        this.elements.imageModalImg.src = '';
        document.body.style.overflow = '';
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `${icons[type]}<span>${message}</span>`;

        this.elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },

    /**
     * Get stock badge class
     */
    getStockBadge(stock) {
        if (stock === 0) return 'badge badge-danger';
        if (stock <= 10) return 'badge badge-warning';
        return 'badge badge-success';
    }
};
