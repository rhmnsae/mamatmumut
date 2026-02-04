/**
 * Auth Module
 * Handles authentication via API (online database)
 * Dengan fallback ke localStorage untuk offline mode
 */

const Auth = {
    KEYS: {
        SESSION: 'latranshop_session',
        TOKEN: 'latranshop_auth_token'
    },

    /**
     * Initialize auth system
     */
    async init() {
        // Initialize local admin for authentication
        await this._initLocalAdmin();
        console.log('🔐 Auth initialized');
    },

    /**
     * Initialize local admin (fallback)
     */
    async _initLocalAdmin() {
        const users = this._getLocalUsers();

        if (users.length === 0) {
            const passwordHash = await this._hashPassword('otongsurotong99!');

            const adminUser = {
                id: 'admin_001',
                username: 'admin',
                passwordHash: passwordHash,
                role: 'admin',
                createdAt: new Date().toISOString()
            };

            this._saveLocalUsers([adminUser]);
            console.log('🔐 Local admin user created');
        }
    },

    /**
     * Hash password using SHA-256 (for local fallback)
     */
    async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Get local users (fallback)
     */
    _getLocalUsers() {
        try {
            const data = localStorage.getItem('produk_manager_users');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Save local users (fallback)
     */
    _saveLocalUsers(users) {
        localStorage.setItem('produk_manager_users', JSON.stringify(users));
    },

    /**
     * Login with username and password
     */
    async login(username, password) {
        // Use local authentication
        return await this._localLogin(username, password);
    },

    /**
     * Local login (fallback)
     */
    async _localLogin(username, password) {
        const users = this._getLocalUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            return { success: false, message: 'Username tidak ditemukan' };
        }

        const inputHash = await this._hashPassword(password);

        if (inputHash !== user.passwordHash) {
            return { success: false, message: 'Password salah' };
        }

        const session = {
            userId: user.id,
            username: user.username,
            role: user.role,
            loginAt: new Date().toISOString(),
            isOnline: false
        };

        localStorage.setItem(this.KEYS.SESSION, JSON.stringify(session));

        return { success: true, user: session };
    },

    /**
     * Logout current user
     */
    async logout() {
        localStorage.removeItem(this.KEYS.SESSION);
        localStorage.removeItem(this.KEYS.TOKEN);
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        const session = this.getSession();
        // Only check local session (no token-based auth with Supabase anon key)
        return session !== null;
    },

    /**
     * Get current session
     */
    getSession() {
        try {
            const data = localStorage.getItem(this.KEYS.SESSION);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Verify authentication status
     */
    async verifyAuth() {
        // Simply check if local session exists
        return this.getSession() !== null;
    },

    /**
     * Check auth and redirect if not logged in
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};
