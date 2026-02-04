/**
 * Dashboard Module
 * Handles dashboard statistics and charts
 * Updated for async API operations
 */

const Dashboard = {
    charts: {},

    /**
     * Initialize dashboard
     */
    async init() {
        await this.updateStats();
        await this.initCharts();
        await this.renderRecentProducts();
        this.bindEvents();
    },

    /**
     * Bind events
     */
    bindEvents() {
        const viewAllBtn = document.getElementById('viewAllProducts');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                UI.switchPage('products');
            });
        }
    },

    /**
     * Animate number counting
     */
    animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        if (!obj) return;

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);

            // Format number if it's large
            obj.textContent = value.toLocaleString('id-ID');

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    },

    /**
     * Update dashboard statistics (async)
     */
    async updateStats() {
        try {
            const products = await Storage.getProducts();

            // Total products
            const totalProducts = products.length;
            this.animateValue('statTotalProducts', 0, totalProducts, 1500);

            // Total stock
            const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
            this.animateValue('statTotalStock', 0, totalStock, 2000);

            // Out of stock count
            const outOfStock = products.filter(p => p.stock === 0).length;
            this.animateValue('statOutOfStockCount', 0, outOfStock, 1000);

            // Low stock (< 10)
            const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length;
            this.animateValue('statLowStockCount', 0, lowStock, 1200);
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    },

    /**
     * Initialize charts
     */
    async initCharts() {
        await this.initStockChart();
    },

    /**
     * Initialize stock distribution chart (async)
     */
    async initStockChart() {
        const ctx = document.getElementById('stockChart');
        if (!ctx) return;

        try {
            const products = await Storage.getProducts();

            const outOfStock = products.filter(p => p.stock === 0).length;
            const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length;
            const normalStock = products.filter(p => p.stock >= 10 && p.stock < 50).length;
            const highStock = products.filter(p => p.stock >= 50).length;

            if (this.charts.stock) {
                this.charts.stock.destroy();
            }

            const isMobile = window.innerWidth < 768;

            this.charts.stock = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Habis', 'Rendah (<10)', 'Normal (10-50)', 'Banyak (>50)'],
                    datasets: [{
                        data: [outOfStock, lowStock, normalStock, highStock],
                        backgroundColor: [
                            '#ef4444', // Red for Out of Stock
                            '#f59e0b', // Orange for Low Stock
                            '#3b82f6', // Blue for Normal
                            '#22c55e'  // Green for High Stock
                        ],
                        borderWidth: 0,
                        hoverOffset: 10,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            position: isMobile ? 'bottom' : 'right',
                            align: isMobile ? 'center' : 'center',
                            labels: {
                                color: '#94a3b8',
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: {
                                    family: 'Outfit',
                                    size: 12,
                                    weight: 500
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(18, 18, 26, 0.9)',
                            titleFont: { family: 'Outfit', size: 13 },
                            bodyFont: { family: 'Outfit', size: 13 },
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: true
                        }
                    },
                    cutout: '75%',
                    layout: {
                        padding: 20
                    },
                    onResize: (chart, size) => {
                        chart.options.plugins.legend.position = size.width < 768 ? 'bottom' : 'right';
                        chart.update('none');
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing chart:', error);
        }
    },

    /**
     * Render Out of Stock page (async)
     */
    async renderOutOfStockPage() {
        try {
            const products = await Storage.getProducts();
            const outOfStockProducts = products.filter(p => p.stock === 0);

            const container = document.getElementById('outOfStockPageList');
            const countEl = document.getElementById('outOfStockPageCount');

            if (countEl) {
                countEl.textContent = outOfStockProducts.length + ' produk';
            }

            if (container) {
                if (outOfStockProducts.length === 0) {
                    container.innerHTML = `
                        <div class="empty-stock">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 16px; color: var(--success);">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            <p style="font-size: 16px; font-weight: 500;">Semua produk memiliki stok!</p>
                            <p style="margin-top: 8px;">Tidak ada produk yang stoknya habis.</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = outOfStockProducts.map(product => `
                        <div class="stock-product-item" onclick="Dashboard.goToProduct('${product.id}')">
                            <img 
                                class="stock-product-img" 
                                src="${product.image || Products.getPlaceholderImage()}" 
                                alt="${product.name}"
                            >
                            <div class="stock-product-info">
                                <div class="stock-product-name">${product.name}</div>
                                ${product.sku ? `<div class="stock-product-sku">${product.sku}</div>` : ''}
                            </div>
                            <div class="stock-product-badge">
                                <span class="badge badge-danger">0</span>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error rendering out of stock page:', error);
        }
    },

    /**
     * Render Low Stock page (async)
     */
    async renderLowStockPage() {
        try {
            const products = await Storage.getProducts();
            const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 10);

            const container = document.getElementById('lowStockPageList');
            const countEl = document.getElementById('lowStockPageCount');

            if (countEl) {
                countEl.textContent = lowStockProducts.length + ' produk';
            }

            if (container) {
                if (lowStockProducts.length === 0) {
                    container.innerHTML = `
                        <div class="empty-stock">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 16px; color: var(--success);">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            <p style="font-size: 16px; font-weight: 500;">Stok aman!</p>
                            <p style="margin-top: 8px;">Tidak ada produk dengan stok rendah.</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = lowStockProducts.map(product => `
                        <div class="stock-product-item" onclick="Dashboard.goToProduct('${product.id}')">
                            <img 
                                class="stock-product-img" 
                                src="${product.image || Products.getPlaceholderImage()}" 
                                alt="${product.name}"
                            >
                            <div class="stock-product-info">
                                <div class="stock-product-name">${product.name}</div>
                                ${product.sku ? `<div class="stock-product-sku">${product.sku}</div>` : ''}
                            </div>
                            <div class="stock-product-badge">
                                <span class="badge badge-warning">${product.stock}</span>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error rendering low stock page:', error);
        }
    },

    /**
     * Go to product detail page
     */
    goToProduct(id) {
        UI.switchPage('productDetail', id);
    },

    /**
     * Render product detail page (async)
     */
    async renderProductDetail(id) {
        try {
            const product = await Storage.getProduct(id);
            if (!product) {
                UI.switchPage('dashboard');
                return;
            }

            // Store current product ID for edit/delete actions
            this.currentProductId = id;

            // Update image
            const imageEl = document.getElementById('productDetailImage');
            if (imageEl) {
                imageEl.src = product.image || Products.getPlaceholderImage();
                imageEl.alt = product.name;
            }

            // Update name
            const nameEl = document.getElementById('productDetailName');
            if (nameEl) {
                nameEl.textContent = product.name;
            }

            // Update SKU
            const skuEl = document.getElementById('productDetailSku');
            if (skuEl) {
                skuEl.textContent = product.sku ? `SKU: ${product.sku}` : '';
                skuEl.style.display = product.sku ? 'block' : 'none';
            }

            // Update original price (if different from sale price)
            const originalPriceEl = document.getElementById('productDetailOriginalPrice');
            if (originalPriceEl) {
                if (product.originalPrice && product.originalPrice > product.salePrice) {
                    originalPriceEl.textContent = UI.formatCurrency(product.originalPrice);
                    originalPriceEl.style.display = 'inline';
                } else {
                    originalPriceEl.style.display = 'none';
                }
            }

            // Update sale price
            const priceEl = document.getElementById('productDetailPrice');
            if (priceEl) {
                priceEl.textContent = UI.formatCurrency(product.salePrice);
            }

            // Update stock with styling
            const stockEl = document.getElementById('productDetailStock');
            if (stockEl) {
                stockEl.textContent = product.stock;
                stockEl.className = 'product-detail-stock';
                if (product.stock === 0) {
                    stockEl.classList.add('out-of-stock');
                } else if (product.stock < 10) {
                    stockEl.classList.add('low-stock');
                } else {
                    stockEl.classList.add('in-stock');
                }
            }

            // Update weight
            const weightEl = document.getElementById('productDetailWeight');
            if (weightEl) {
                weightEl.textContent = product.weight ? `${product.weight} gram` : '-';
            }

            // Update size (clothing)
            const sizeEl = document.getElementById('productDetailSize');
            if (sizeEl) {
                sizeEl.textContent = product.size || '-';
            }

            // Update panjang bawahan
            const panjangBawahanEl = document.getElementById('productDetailPanjangBawahan');
            if (panjangBawahanEl) {
                panjangBawahanEl.textContent = product.panjangBawahan ? `${product.panjangBawahan} cm` : '-';
            }

            // Update lingkar pinggang
            const lingkarPinggangEl = document.getElementById('productDetailLingkarPinggang');
            if (lingkarPinggangEl) {
                lingkarPinggangEl.textContent = product.lingkarPinggang ? `${product.lingkarPinggang} cm` : '-';
            }

            // Update lingkar paha
            const lingkarPahaEl = document.getElementById('productDetailLingkarPaha');
            if (lingkarPahaEl) {
                lingkarPahaEl.textContent = product.lingkarPaha ? `${product.lingkarPaha} cm` : '-';
            }

            // Bind action buttons
            const editBtn = document.getElementById('productDetailEditBtn');
            if (editBtn) {
                editBtn.onclick = () => {
                    UI.openProductModal(product);
                };
            }

            const deleteBtn = document.getElementById('productDetailDeleteBtn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    UI.openDeleteModal(product.id, product.name);
                };
            }
        } catch (error) {
            console.error('Error rendering product detail:', error);
            UI.switchPage('dashboard');
        }
    },

    /**
     * Render recent products (async)
     */
    async renderRecentProducts() {
        const container = document.getElementById('recentProductsList');
        if (!container) return;

        try {
            const allProducts = await Storage.getProducts();
            const products = allProducts.slice(0, 5);

            if (products.length === 0) {
                container.innerHTML = `
                    <div class="empty-recent">
                        <p>Belum ada produk</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = products.map(product => {
                const escapedId = String(product.id).replace(/'/g, "\\'");
                return `
                    <div class="recent-product-item" data-product-id="${product.id}">
                        <img 
                            class="recent-product-img" 
                            src="${product.image || Products.getPlaceholderImage()}" 
                            alt="${product.name}"
                        >
                        <div class="recent-product-info">
                            <div class="recent-product-name">${product.name}</div>
                            <div class="recent-product-price">${UI.formatCurrency(product.salePrice)}</div>
                        </div>
                        <div class="recent-product-stock">
                            <span class="${UI.getStockBadge(product.stock)}">${product.stock}</span>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click event listeners
            container.querySelectorAll('.recent-product-item').forEach(item => {
                item.addEventListener('click', () => {
                    const productId = item.dataset.productId;
                    this.goToProduct(productId);
                });
            });
        } catch (error) {
            console.error('Error rendering recent products:', error);
            container.innerHTML = `
                <div class="empty-recent">
                    <p>Gagal memuat produk</p>
                </div>
            `;
        }
    },

    /**
     * Refresh all dashboard data (async)
     */
    async refresh() {
        await this.updateStats();
        await this.initCharts();
        await this.renderRecentProducts();
    }
};
