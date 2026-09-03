<?php

// Разовая коррекция данных: до этого fetch.php интерпретировал unix-timestamp постов
// VK как UTC (date_default_timezone_set('UTC')), хотя реальное время поста — московское
// (см. fetch.php). Пересчитывает уже сохранённые published_at из "UTC" в фактическое
// Europe/Moscow. Безопасно запускать только один раз — второй запуск откажет, ориентируясь
// на флаг в settings.

require __DIR__ . '/db.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

const FLAG_KEY = 'post_times_fixed';

if (getSetting(FLAG_KEY) !== null) {
    echo "Уже применено ранее — повторный запуск отменён (см. settings." . FLAG_KEY . ").\n";
    exit(0);
}

$pdo = getDbConnection();
$rows = $pdo->query('SELECT id, published_at FROM posts')->fetchAll();

$update = $pdo->prepare('UPDATE posts SET published_at = :published_at WHERE id = :id');

$utc = new DateTimeZone('UTC');
$moscow = new DateTimeZone('Europe/Moscow');

$pdo->beginTransaction();
$count = 0;

foreach ($rows as $row) {
    $dt = new DateTime($row['published_at'], $utc);
    $dt->setTimezone($moscow);
    $corrected = $dt->format('Y-m-d H:i:s');

    if ($corrected !== $row['published_at']) {
        $update->execute(['published_at' => $corrected, 'id' => $row['id']]);
        $count++;
    }
}

setSetting(FLAG_KEY, date('Y-m-d H:i:s'));
$pdo->commit();

echo "Исправлено записей: {$count} из " . count($rows) . ".\n";
