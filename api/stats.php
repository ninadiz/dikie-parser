<?php

header('Content-Type: application/json');

require __DIR__ . '/../db.php';

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
