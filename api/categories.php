<?php
/**
 * Categories API
 * CRUD operations for categories
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getAllCategories();
        break;
        
    case 'POST':
        addCategory();
        break;
        
    case 'DELETE':
        $name = $_GET['name'] ?? null;
        if (!$name) {
            jsonResponse(['error' => 'Category name required'], 400);
        }
        deleteCategory($name);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

/**
 * Get all categories
 */
function getAllCategories() {
    $db = getDB();
    $stmt = $db->query("SELECT name FROM categories ORDER BY name ASC");
    $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // If no categories, return defaults
    if (empty($categories)) {
        $defaults = [
            'Elektronik',
            'Fashion',
            'Makanan & Minuman',
            'Kesehatan',
            'Rumah Tangga',
            'Olahraga',
            'Hobi',
            'Lainnya'
        ];
        
        // Insert defaults
        $db = getDB();
        $stmt = $db->prepare("INSERT IGNORE INTO categories (name) VALUES (?)");
        foreach ($defaults as $cat) {
            $stmt->execute([$cat]);
        }
        
        $categories = $defaults;
    }
    
    jsonResponse($categories);
}

/**
 * Add new category
 */
function addCategory() {
    $data = getJsonInput();
    $name = $data['name'] ?? '';
    
    if (empty($name)) {
        jsonResponse(['error' => 'Category name required'], 400);
    }
    
    $db = getDB();
    
    // Check if exists
    $checkStmt = $db->prepare("SELECT id FROM categories WHERE name = ?");
    $checkStmt->execute([$name]);
    if ($checkStmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Kategori sudah ada'], 400);
    }
    
    $stmt = $db->prepare("INSERT INTO categories (name) VALUES (?)");
    $stmt->execute([$name]);
    
    jsonResponse(['success' => true, 'message' => 'Kategori ditambahkan']);
}

/**
 * Delete category
 */
function deleteCategory($name) {
    $db = getDB();
    
    $stmt = $db->prepare("DELETE FROM categories WHERE name = ?");
    $stmt->execute([$name]);
    
    jsonResponse(['success' => true, 'message' => 'Kategori dihapus']);
}
