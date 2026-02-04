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

        // Show loading briefly
        this.showLoading();

        try {
            // Initialize Auth first (fast, localStorage only)
            await Auth.init();

            // Check if user is logged in IMMEDIATELY
            if (!Auth.isLoggedIn()) {
                window.location.href = 'login.html';
                return;
            }

            // Initialize UI modules first (DOM setup only, no data needed)
            UI.init();
            Products.init();
            Export.init();
            this.setupLogout();
            this.setupThemeToggle();

            // CRITICAL: Wait for Storage.init() to complete
            // This ensures data is fetched from API if localStorage is empty (new device)
            await Storage.init();

            // Hide loading after storage is ready
            this.hideLoading();

            // Show dashboard page - data is now available
            UI.switchPage('dashboard');
            await Dashboard.init();

            console.log(`🛒 Latranshop initialized in ${Date.now() - startTime}ms`);

            // Render products table (data is ready)
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
    },

    /**
     * Setup theme toggle (dark/light mode)
     */
    setupThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;

        toggle.addEventListener('click', () => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            // Apply theme
            if (newTheme === 'dark') {
                html.removeAttribute('data-theme');
            } else {
                html.setAttribute('data-theme', newTheme);
            }

            // Save to localStorage
            localStorage.setItem('latranshop_theme', newTheme === 'dark' ? '' : newTheme);

            // Update aria-label for accessibility
            toggle.setAttribute('aria-label',
                newTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'
            );

            console.log(`🎨 Theme switched to ${newTheme} mode`);
        });
    }
};

// Start the application
App.init();
