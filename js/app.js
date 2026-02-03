/**
 * App Module
 * Main application entry point
 */

const App = {
    /**
     * Initialize application
     */
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bootstrap());
        } else {
            this.bootstrap();
        }
    },

    /**
     * Bootstrap application
     */
    bootstrap() {
        console.log('🛒 Latranshop initialized');

        // Initialize modules
        UI.init();
        Products.init();
        Dashboard.init();
        Export.init();

        // Show dashboard page by default
        UI.switchPage('dashboard');

        // Render products table for when switching to products page
        Products.renderTable();
    }
};

// Start the application
App.init();
