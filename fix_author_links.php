<?php

// Разовая коррекция данных: buildAuthorLink() в fetch.php раньше возвращал ссылку на
// страницу самой группы (https://vk.com/club...) для постов, опубликованных от имени
// сообщества (author_id < 0), из-за чего колонка "Автор" почти всегда указывала на саму
// группу, а не на реального автора. Теперь buildAuthorLink() возвращает null в этом
// случае — этот скрипт обнуляет уже сохранённые author_link для таких постов задним
// числом. Безопасно запускать только один раз — второй запуск откажет, ориентируясь
// на флаг в settings.

require __DIR__ . '/db.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

const FLAG_KEY = 'author_links_fixed';

if (getSetting(FLAG_KEY) !== null) {
    echo "Уже применено ранее — повторный запуск отменён (см. settings." . FLAG_KEY . ").\n";
    exit(0);
}

$pdo = getDbConnection();
$pdo->beginTransaction();

$update = $pdo->prepare('UPDATE posts SET author_link = NULL WHERE author_id < 0 AND author_link IS NOT NULL');
$update->execute();
$count = $update->rowCount();

setSetting(FLAG_KEY, date('Y-m-d H:i:s'));
$pdo->commit();

echo "Исправлено записей: {$count}.\n";
