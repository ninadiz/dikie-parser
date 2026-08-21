<?php

require __DIR__ . '/session_init.php';
initSession();
header('Content-Type: application/json');

$config = require __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (
    hash_equals($config['auth']['username'], $username)
    && password_verify($password, $config['auth']['password_hash'])
) {
    $_SESSION['authenticated'] = true;
    echo json_encode(['success' => true]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Неверный логин или пароль']);
}
