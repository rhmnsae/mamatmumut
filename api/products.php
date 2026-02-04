<?php
/**
 * Products API
 * CRUD operations for products
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$search = $_GET['search'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getProduct($id);
        } elseif ($search) {
            searchProducts($search);
        } else {
            getAllProducts();
        }
        break;
        
    case 'POST':
        createProduct();
        break;
        
    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'Product ID required'], 400);
        }
        updateProduct($id);
        break;
        
    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'Product ID required'], 400);
        }
        deleteProduct($id);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

/**
 * Get all products
 */
function getAllProducts() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM products ORDER BY created_at DESC");
    $products = $stmt->fetchAll();
    
    // Format products for frontend compatibility
    $formatted = array_map(function($p) {
        return [
            'id' => $p['id'],
            'name' => $p['name'],
            'sku' => $p['sku'],
            'category' => $p['category'],
            'originalPrice' => floatval($p['original_price']),
            'salePrice' => floatval($p['sale_price']),
            'stock' => intval($p['stock']),
            'weight' => floatval($p['weight']),
            'dimensions' => [
                'l' => floatval($p['dimension_l']),
                'w' => floatval($p['dimension_w']),
                'h' => floatval($p['dimension_h'])
            ],
            'image' => $p['image_url'],
            'createdAt' => $p['created_at'],
            'updatedAt' => $p['updated_at']
        ];
    }, $products);
    
    jsonResponse($formatted);
}

/**
 * Get single product by ID
 */
function getProduct($id) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    
    if (!$product) {
        jsonResponse(['error' => 'Product not found'], 404);
    }
    
    jsonResponse([
        'id' => $product['id'],
        'name' => $product['name'],
        'sku' => $product['sku'],
        'category' => $product['category'],
        'originalPrice' => floatval($product['original_price']),
        'salePrice' => floatval($product['sale_price']),
        'stock' => intval($product['stock']),
        'weight' => floatval($product['weight']),
        'dimensions' => [
            'l' => floatval($product['dimension_l']),
            'w' => floatval($product['dimension_w']),
            'h' => floatval($product['dimension_h'])
        ],
        'image' => $product['image_url'],
        'createdAt' => $product['created_at'],
        'updatedAt' => $product['updated_at']
    ]);
}

/**
 * Search products
 */
function searchProducts($query) {
    $db = getDB();
    $searchTerm = "%$query%";
    
    $stmt = $db->prepare("
        SELECT * FROM products 
        WHERE name LIKE ? OR sku LIKE ? OR category LIKE ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
    $products = $stmt->fetchAll();
    
    // Format products
    $formatted = array_map(function($p) {
        return [
            'id' => $p['id'],
            'name' => $p['name'],
            'sku' => $p['sku'],
            'category' => $p['category'],
            'originalPrice' => floatval($p['original_price']),
            'salePrice' => floatval($p['sale_price']),
            'stock' => intval($p['stock']),
            'weight' => floatval($p['weight']),
            'dimensions' => [
                'l' => floatval($p['dimension_l']),
                'w' => floatval($p['dimension_w']),
                'h' => floatval($p['dimension_h'])
            ],
            'image' => $p['image_url'],
            'createdAt' => $p['created_at'],
            'updatedAt' => $p['updated_at']
        ];
    }, $products);
    
    jsonResponse($formatted);
}

/**
 * Create new product
 */
function createProduct() {
    $data = getJsonInput();
    
    if (empty($data['name'])) {
        jsonResponse(['error' => 'Product name is required'], 400);
    }
    
    $db = getDB();
    $id = generateId();
    
    $stmt = $db->prepare("
        INSERT INTO products 
        (id, name, sku, category, original_price, sale_price, stock, weight, dimension_l, dimension_w, dimension_h, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $dimensions = $data['dimensions'] ?? [];
    
    $stmt->execute([
        $id,
        $data['name'],
        $data['sku'] ?? null,
        $data['category'] ?? null,
        $data['originalPrice'] ?? 0,
        $data['salePrice'] ?? 0,
        $data['stock'] ?? 0,
        $data['weight'] ?? null,
        $dimensions['l'] ?? null,
        $dimensions['w'] ?? null,
        $dimensions['h'] ?? null,
        $data['image'] ?? null
    ]);
    
    // Return created product
    getProduct($id);
}

/**
 * Update existing product
 */
function updateProduct($id) {
    $data = getJsonInput();
    
    $db = getDB();
    
    // Check if product exists
    $checkStmt = $db->prepare("SELECT id FROM products WHERE id = ?");
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonResponse(['error' => 'Product not found'], 404);
    }
    
    // Build update query dynamically
    $fields = [];
    $values = [];
    
    $fieldMap = [
        'name' => 'name',
        'sku' => 'sku',
        'category' => 'category',
        'originalPrice' => 'original_price',
        'salePrice' => 'sale_price',
        'stock' => 'stock',
        'weight' => 'weight',
        'image' => 'image_url'
    ];
    
    foreach ($fieldMap as $jsField => $dbField) {
        if (isset($data[$jsField])) {
            $fields[] = "$dbField = ?";
            $values[] = $data[$jsField];
        }
    }
    
    // Handle dimensions separately
    if (isset($data['dimensions'])) {
        $dims = $data['dimensions'];
        if (isset($dims['l'])) {
            $fields[] = "dimension_l = ?";
            $values[] = $dims['l'];
        }
        if (isset($dims['w'])) {
            $fields[] = "dimension_w = ?";
            $values[] = $dims['w'];
        }
        if (isset($dims['h'])) {
            $fields[] = "dimension_h = ?";
            $values[] = $dims['h'];
        }
    }
    
    if (empty($fields)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }
    
    $values[] = $id;
    
    $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($values);
    
    // Return updated product
    getProduct($id);
}

/**
 * Delete product
 */
function deleteProduct($id) {
    $db = getDB();
    
    // Get product first to delete image
    $stmt = $db->prepare("SELECT image_url FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    
    if (!$product) {
        jsonResponse(['error' => 'Product not found'], 404);
    }
    
    // Delete from database
    $deleteStmt = $db->prepare("DELETE FROM products WHERE id = ?");
    $deleteStmt->execute([$id]);
    
    // Delete image file if exists
    if ($product['image_url'] && strpos($product['image_url'], 'uploads/') !== false) {
        $imagePath = __DIR__ . '/' . basename($product['image_url']);
        if (file_exists($imagePath)) {
            unlink($imagePath);
        }
    }
    
    jsonResponse(['success' => true, 'message' => 'Product deleted']);
}
