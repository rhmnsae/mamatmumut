/**
 * Cloudflare Worker Backend for Latranshop
 * Replaces PHP/MySQL with Workers/D1
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
};

function getCorsHeaders(request) {
    const origin = request.headers.get('Origin');
    // For now, allow all origins by echoing back the request origin
    // In production, you might want to validate against a whitelist
    return {
        ...CORS_HEADERS,
        'Access-Control-Allow-Origin': origin || '*'
    };
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: getCorsHeaders(request) });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        let response;

        try {
            if (path.endsWith('/api/auth.php')) {
                response = await handleAuth(request, env);
            }
            else if (path.endsWith('/api/products.php')) {
                response = await handleProducts(request, env);
            }
            else if (path.endsWith('/api/categories.php')) {
                response = await handleCategories(request, env);
            }
            else if (path.endsWith('/api/upload.php')) {
                // Fallback to Base64 (Client handles error)
                response = jsonResponse({ error: 'Upload not supported in free version' }, 400);
            }
            else {
                response = new Response('Not Found', { status: 404 });
            }

        } catch (err) {
            response = jsonResponse({ error: err.message }, 500);
        }

        // Apply CORS headers to response
        const newHeaders = new Headers(response.headers);
        const cors = getCorsHeaders(request);
        for (const [key, value] of Object.entries(cors)) {
            newHeaders.set(key, value);
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });
    }
};

// ==========================================
// Handlers
// ==========================================

async function handleAuth(request, env) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'init') {
        // Check if admin exists
        const existing = await env.DB.prepare("SELECT id FROM users WHERE username = 'admin'").first();
        if (existing) {
            return jsonResponse({ success: true, message: 'Admin already exists' });
        }

        // Create default admin
        const passwordHash = await hashPassword('otongsurotong99!');
        await env.DB.prepare("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')")
            .bind(passwordHash)
            .run();

        return jsonResponse({
            success: true,
            message: 'Default admin created',
            credentials: { username: 'admin', password: 'otongsurotong99!' }
        });
    }

    if (action === 'login' && request.method === 'POST') {
        const data = await request.json();
        const { username, password } = data;

        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();

        if (!user) {
            return jsonResponse({ success: false, message: 'User not found' });
        }

        const inputHash = await hashPassword(password);
        if (inputHash !== user.password_hash) {
            return jsonResponse({ success: false, message: 'Invalid password' });
        }

        // Create token
        const token = crypto.randomUUID().replace(/-/g, '');
        await env.DB.prepare("UPDATE users SET session_token = ?, last_login = datetime('now') WHERE id = ?")
            .bind(token, user.id)
            .run();

        return jsonResponse({
            success: true,
            user: { id: user.id, username: user.username, role: user.role },
            token: token
        });
    }

    if (action === 'check') {
        const token = getBearerToken(request);
        if (!token) return jsonResponse({ authenticated: false });

        const user = await env.DB.prepare("SELECT id, username, role FROM users WHERE session_token = ?").bind(token).first();
        return jsonResponse({ authenticated: !!user, user: user || null });
    }

    if (action === 'logout') {
        const token = getBearerToken(request);
        if (token) {
            await env.DB.prepare("UPDATE users SET session_token = NULL WHERE session_token = ?").bind(token).run();
        }
        return jsonResponse({ success: true, message: 'Logged out' });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
}

async function handleProducts(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const id = url.searchParams.get('id');
    const search = url.searchParams.get('search');

    if (method === 'GET') {
        if (id) {
            const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
            // Parse dimensions logic if needed, but we store columns. API expects object? 
            // PHP schema had dimension_l etc. 
            // JS frontend expects dimensions: { l, w, h }
            if (product) formatProductDimensions(product);
            return jsonResponse(product);
        }

        if (search) {
            const query = `%${search}%`;
            const products = await env.DB.prepare("SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? ORDER BY created_at DESC")
                .bind(query, query)
                .all();
            products.results.forEach(formatProductDimensions);
            return jsonResponse(products.results);
        }

        const products = await env.DB.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
        products.results.forEach(formatProductDimensions);
        return jsonResponse(products.results);
    }

    if (method === 'POST') {
        const data = await request.json();
        const newId = generateId();

        // Handle image: Frontend sends base64 or URL. We save it to image_url.
        // If it's base64, it might be large, but D1 supports Text up to a limit.

        await env.DB.prepare(`
      INSERT INTO products (id, name, sku, category, original_price, sale_price, stock, weight, dimension_l, dimension_w, dimension_h, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
            newId,
            data.name,
            data.sku,
            data.category,
            data.originalPrice || 0,
            data.salePrice || 0,
            data.stock || 0,
            data.weight || 0,
            data.dimensions?.l || 0,
            data.dimensions?.w || 0,
            data.dimensions?.h || 0,
            data.image || null
        ).run();

        return jsonResponse({ success: true, id: newId, ...data });
    }

    if (method === 'PUT') {
        if (!id) return jsonResponse({ error: 'Missing ID' }, 400);
        const data = await request.json();

        let sql = "UPDATE products SET updated_at = datetime('now')";
        const binds = [];

        const fields = {
            name: data.name,
            sku: data.sku,
            category: data.category,
            original_price: data.originalPrice,
            sale_price: data.salePrice,
            stock: data.stock,
            weight: data.weight,
            dimension_l: data.dimensions?.l,
            dimension_w: data.dimensions?.w,
            dimension_h: data.dimensions?.h,
            image_url: data.image
        };

        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                sql += `, ${key} = ?`;
                binds.push(val);
            }
        }

        sql += " WHERE id = ?";
        binds.push(id);

        await env.DB.prepare(sql).bind(...binds).run();
        return jsonResponse({ success: true });
    }

    if (method === 'DELETE') {
        if (!id) return jsonResponse({ error: 'Missing ID' }, 400);
        await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
        return jsonResponse({ success: true });
    }
}

async function handleCategories(request, env) {
    const method = request.method;
    const url = new URL(request.url);

    if (method === 'GET') {
        const cats = await env.DB.prepare("SELECT name FROM categories ORDER BY name").all();
        return jsonResponse(cats.results.map(c => c.name));
    }

    if (method === 'POST') {
        const data = await request.json();
        if (!data.name) return jsonResponse({ error: 'Name required' }, 400);

        try {
            await env.DB.prepare("INSERT INTO categories (name) VALUES (?)").bind(data.name).run();
            return jsonResponse({ success: true });
        } catch (e) {
            return jsonResponse({ success: false, message: 'Category exists' }, 400);
        }
    }

    if (method === 'DELETE') {
        const name = url.searchParams.get('name');
        if (!name) return jsonResponse({ error: 'Name required' }, 400);

        await env.DB.prepare("DELETE FROM categories WHERE name = ?").bind(name).run();
        return jsonResponse({ success: true });
    }
}

// ==========================================
// Helpers
// ==========================================

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

function getBearerToken(request) {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.substring(7);
}

async function hashPassword(text) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function formatProductDimensions(p) {
    p.dimensions = {
        l: p.dimension_l,
        w: p.dimension_w,
        h: p.dimension_h
    };
    p.originalPrice = p.original_price;
    p.salePrice = p.sale_price;
    p.image = p.image_url;
    // Cleanup db specific fields if needed, but JS handles extra keys fine
}
