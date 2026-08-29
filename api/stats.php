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

$datePattern = '/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/';
$dateFrom = !empty($_GET['date_from']) ? $_GET['date_from'] : null;
$dateTo = !empty($_GET['date_to']) ? $_GET['date_to'] : null;

if (($dateFrom !== null && !preg_match($datePattern, $dateFrom))
    || ($dateTo !== null && !preg_match($datePattern, $dateTo))) {
    http_response_code(400);
    echo json_encode(['error' => 'Некорректный формат даты, ожидается YYYY-MM-DD или YYYY-MM-DD HH:MM:SS']);
    exit;
}

echo json_encode(['count' => getPostsCount($dateFrom, $dateTo)]);
