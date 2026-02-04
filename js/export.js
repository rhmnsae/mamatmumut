/**
 * Export Module
 * Handles data export to XLSX (Excel) format
 * Uses SheetJS (xlsx) library for proper Excel file generation
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
            // Remove old listeners by cloning
            const newBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newBtn, exportBtn);
            newBtn.addEventListener('click', () => this.exportToXLSX());
        }
    },

    /**
     * Export products to XLSX (Excel)
     */
    async exportToXLSX() {
        try {
            const products = await Storage.getProducts();

            if (!products || products.length === 0) {
                UI.showToast('Tidak ada data untuk di-export', 'error');
                return;
            }

            UI.showToast('Memproses export...', 'info');

            // Prepare data for Excel with clothing size fields
            const excelData = products.map((p, index) => ({
                'No': index + 1,
                'Nama Produk': p.name || '',
                'SKU': p.sku || '-',
                'Harga Asli (Rp)': p.originalPrice || 0,
                'Harga Jual (Rp)': p.salePrice || 0,
                'Stok': p.stock || 0,
                'Berat (gram)': p.weight || 0,
                'Ukuran': p.size || '-',
                'Panjang Bawahan (cm)': p.panjangBawahan || 0,
                'Lingkar Pinggang (cm)': p.lingkarPinggang || 0,
                'Lingkar Paha (cm)': p.lingkarPaha || 0,
                'Tanggal Dibuat': this.formatDateExcel(p.createdAt),
                'Tanggal Update': this.formatDateExcel(p.updatedAt)
            }));

            // Create workbook and worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths for better readability
            ws['!cols'] = [
                { wch: 5 },   // No
                { wch: 35 },  // Nama Produk
                { wch: 15 },  // SKU
                { wch: 15 },  // Harga Asli
                { wch: 15 },  // Harga Jual
                { wch: 8 },   // Stok
                { wch: 12 },  // Berat
                { wch: 10 },  // Ukuran
                { wch: 18 },  // Panjang Bawahan
                { wch: 18 },  // Lingkar Pinggang
                { wch: 15 },  // Lingkar Paha
                { wch: 18 },  // Tanggal Dibuat
                { wch: 18 }   // Tanggal Update
            ];

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Produk');

            // Add summary sheet
            const summaryData = [
                { 'Keterangan': 'Total Produk', 'Nilai': products.length },
                { 'Keterangan': 'Total Stok', 'Nilai': products.reduce((sum, p) => sum + (p.stock || 0), 0) },
                { 'Keterangan': 'Stok Habis', 'Nilai': products.filter(p => (p.stock || 0) === 0).length },
                { 'Keterangan': 'Stok Rendah (<10)', 'Nilai': products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length },
                { 'Keterangan': 'Total Nilai Inventori (Harga Jual)', 'Nilai': products.reduce((sum, p) => sum + ((p.salePrice || 0) * (p.stock || 0)), 0) },
                { 'Keterangan': 'Tanggal Export', 'Nilai': new Date().toLocaleString('id-ID') }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

            // Generate filename with date
            const filename = `Latranshop_Produk_${this.getDateString()}.xlsx`;

            // Write and download
            XLSX.writeFile(wb, filename);

            UI.showToast(`${products.length} produk berhasil di-export ke Excel`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            UI.showToast('Gagal export: ' + error.message, 'error');
        }
    },

    /**
     * Format date for Excel display
     */
    formatDateExcel(isoString) {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '-';

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (e) {
            return '-';
        }
    },

    /**
     * Get current date string for filename
     */
    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    }
};
