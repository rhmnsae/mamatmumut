<?php
/**
 * Authentication API
 * Handles login, logout, and session verification
 */

require_once __DIR__ . '/config.php';

session_start();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'login':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleLogin();
        break;
        
    case 'logout':
        handleLogout();
        break;
        
    case 'check':
        checkSession();
        break;
        
    case 'register':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleRegister();
        break;
        
    case 'init':
        initDefaultAdmin();
        break;
        
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

/**
 * Handle user login
 */
function handleLogin() {
    $data = getJsonInput();
    
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Username dan password wajib diisi'], 400);
    }
    
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Username tidak ditemukan']);
    }
    
    if (!password_verify($password, $user['password_hash'])) {
        jsonResponse(['success' => false, 'message' => 'Password salah']);
    }
    
    // Create session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['login_at'] = date('Y-m-d H:i:s');
    
    // Generate session token for stateless auth
    $token = bin2hex(random_bytes(32));
    
    // Store token in database
    $tokenStmt = $db->prepare("UPDATE users SET session_token = ?, last_login = NOW() WHERE id = ?");
    $tokenStmt->execute([$token, $user['id']]);
    
    jsonResponse([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ],
        'token' => $token
    ]);
}

/**
 * Handle user logout
 */
function handleLogout() {
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = str_replace('Bearer ', '', $token);
    
    if ($token) {
        $db = getDB();
        $stmt = $db->prepare("UPDATE users SET session_token = NULL WHERE session_token = ?");
        $stmt->execute([$token]);
    }
    
    session_destroy();
    
    jsonResponse(['success' => true, 'message' => 'Logout berhasil']);
}

/**
 * Check if session is valid
 */
function checkSession() {
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = str_replace('Bearer ', '', $token);
    
    if (empty($token)) {
        jsonResponse(['authenticated' => false]);
    }
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id, username, role FROM users WHERE session_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if ($user) {
        jsonResponse([
            'authenticated' => true,
            'user' => $user
        ]);
    } else {
        jsonResponse(['authenticated' => false]);
    }
}

/**
 * Handle user registration
 */
function handleRegister() {
    $data = getJsonInput();
    
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? 'user';
    
    if (empty($username) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Username dan password wajib diisi'], 400);
    }
    
    $db = getDB();
    
    // Check if username exists
    $checkStmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $checkStmt->execute([$username]);
    if ($checkStmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Username sudah digunakan'], 400);
    }
    
    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert user
    $stmt = $db->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
    $stmt->execute([$username, $passwordHash, $role]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Registrasi berhasil',
        'userId' => $db->lastInsertId()
    ]);
}

/**
 * Initialize default admin user
 */
function initDefaultAdmin() {
    $db = getDB();
    
    // Check if admin exists
    $stmt = $db->prepare("SELECT id FROM users WHERE username = 'admin'");
    $stmt->execute();
    
    if ($stmt->fetch()) {
        jsonResponse(['success' => true, 'message' => 'Admin sudah ada']);
    }
    
    // Create default admin
    $passwordHash = password_hash('otongsurotong99!', PASSWORD_DEFAULT);
    
    $insertStmt = $db->prepare("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')");
    $insertStmt->execute([$passwordHash]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Admin default berhasil dibuat',
        'credentials' => [
            'username' => 'admin',
            'password' => 'otongsurotong99!'
        ]
    ]);
}
