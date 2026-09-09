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

$limit = isset($_GET['limit']) ? max(1, min(500, (int) $_GET['limit'])) : 150;
$offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;

$rows = getPosts($dateFrom, $dateTo, $limit + 1, $offset);

$hasMore = count($rows) > $limit;
if ($hasMore) {
    $rows = array_slice($rows, 0, $limit);
}

$ownerId = getOwnerId();

$items = array_map(function (array $row) use ($ownerId): array {
    return [
        'id' => (int) $row['id'],
        'published_at' => $row['published_at'],
        'text' => $row['text'],
        'author_link' => $row['author_link'],
        'links' => json_decode($row['links'] ?? '[]', true) ?? [],
        'post_link' => $ownerId !== null
            ? "https://vk.com/wall{$ownerId}_{$row['vk_post_id']}"
            : null,
    ];
}, $rows);

echo json_encode(['items' => $items, 'hasMore' => $hasMore]);
