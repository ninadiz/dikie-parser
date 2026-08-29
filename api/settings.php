<?php

require __DIR__ . '/../session_init.php';
initSession();
header('Content-Type: application/json');

require __DIR__ . '/../db.php';

if (empty($_SESSION['authenticated'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Release the session lock now that auth is checked — see api/posts.php for why.
session_write_close();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $baselineDate = $input['baseline_date'] ?? '';

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $baselineDate)) {
        http_response_code(400);
        echo json_encode(['error' => 'Некорректный формат даты, ожидается YYYY-MM-DD']);
        exit;
    }

    setSetting('baseline_date', $baselineDate);
}

echo json_encode(['baseline_date' => getSetting('baseline_date')]);
