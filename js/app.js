/**
 * App Module
 * Main application entry point
 * OPTIMIZED: Fast initialization with parallel data loading
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
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    /**
     * Bootstrap application
     */
    async bootstrap() {
        console.log('🚀 Starting Latranshop...');
        const startTime = Date.now();

        // Show loading
        this.showLoading();

        try {
            // Initialize auth and storage in parallel for speed
            await Promise.all([
                Auth.init(),
                Storage.init()
            ]);

            // Check if user is logged in
            if (!Auth.isLoggedIn()) {
                window.location.href = 'login.html';
                return;
            }

            console.log(`🛒 Latranshop initialized in ${Date.now() - startTime}ms`);

            // Initialize UI modules (synchronous, fast)
            UI.init();
            Products.init();
            Export.init();

            // Setup logout button
            this.setupLogout();

            // Show dashboard page by default and init dashboard
            UI.switchPage('dashboard');
            Dashboard.init();

            // Pre-render products table in background (don't await)
            Products.renderTable().catch(e => console.warn('Products render:', e));

        } catch (e) {
            console.error('Bootstrap error:', e);
            // Still try to load what we can
            try {
                UI.init();
                Products.init();
                Dashboard.init();
                Export.init();
                UI.switchPage('dashboard');
                this.setupLogout();
            } catch (e2) {
                console.error('Fallback init error:', e2);
            }
        } finally {
            // Hide loading immediately
            this.hideLoading();
        }
    },

    /**
     * Setup logout functionality
     */
    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                this.showLoading();

                try {
                    await Auth.logout();
                    window.location.href = 'login.html';
                } catch (err) {
                    console.error('Logout error:', err);
                    // Force logout anyway
                    localStorage.clear();
                    window.location.href = 'login.html';
                }
            });
        }
    }
};

// Start the application
App.init();
