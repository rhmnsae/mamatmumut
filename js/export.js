/**
 * Export Module
 * Handles data export to CSV/Excel
 */

const Export = {
    /**
     * Initialize export module
     */
    init() {
        // Binding happens dynamically via bindEvents when switching to products page
    },

    /**
     * Bind events (called when switching to products page)
     */
    bindEvents() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToCSV());
        }
    },

    /**
     * Export products to CSV
     */
    exportToCSV() {
        const products = Storage.getProducts();

        if (products.length === 0) {
            UI.showToast('Tidak ada data untuk di-export', 'error');
            return;
        }

        // CSV Headers
        const headers = [
            'Nama Produk',
            'SKU',
            'Kategori',
            'Harga Asli',
            'Harga Jual',
            'Stok',
            'Berat (gram)',
            'Panjang (cm)',
            'Lebar (cm)',
            'Tinggi (cm)',
            'Tanggal Dibuat',
            'Tanggal Update'
        ];

        // CSV Rows
        const rows = products.map(p => [
            this.escapeCSV(p.name),
            this.escapeCSV(p.sku || ''),
            this.escapeCSV(p.category || ''),
            p.originalPrice || 0,
            p.salePrice,
            p.stock,
            p.weight || 0,
            p.dimensions?.l || 0,
            p.dimensions?.w || 0,
            p.dimensions?.h || 0,
            this.formatDate(p.createdAt),
            this.formatDate(p.updatedAt)
        ]);

        // Build CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Add BOM for Excel compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `latranshop_produk_${this.getDateString()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        UI.showToast(`${products.length} produk berhasil di-export`);
    },

    /**
     * Escape CSV special characters
     */
    escapeCSV(str) {
        if (typeof str !== 'string') return str;
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    },

    /**
     * Format date for display
     */
    formatDate(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    /**
     * Get current date string for filename
     */
    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    }
};
