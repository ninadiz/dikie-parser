<?php

header('Content-Type: application/json');

require __DIR__ . '/../db.php';

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
