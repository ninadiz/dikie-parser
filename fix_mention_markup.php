<?php

// Разовая коррекция данных: VK хранит упоминания прямо в тексте поста как
// [id123|Имя]/[club123|Имя] (см. fetch.php). До этого fetch.php никак их не
// разбирал — такие посты сохранялись с буквальными квадратными скобками в
// тексте, а если пост был опубликован от имени группы, но в конце текста был
// кредит вида "От [id123|Имя]", ссылка на реального автора терялась (author_link
// оставался null). Этот скрипт задним числом чистит текст уже сохранённых
// постов от разметки и подставляет кредитную ссылку туда, где author_link ещё
// пуст. Не трогает уже существующие непустые author_link. Безопасно запускать
// только один раз — второй запуск откажет, ориентируясь на флаг в settings.

require __DIR__ . '/db.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

const FLAG_KEY = 'mention_markup_cleaned';

if (getSetting(FLAG_KEY) !== null) {
    echo "Уже применено ранее — повторный запуск отменён (см. settings." . FLAG_KEY . ").\n";
    exit(0);
}

function extractCreditedAuthorLink(string $text): ?string
{
    if (!preg_match('/(?:^|\s)[Оо]т\s+\[(id|club)(\d+)\|[^\]]*\]\s*$/u', trim($text), $m)) {
        return null;
    }

    return $m[1] === 'club'
        ? 'https://vk.com/club' . $m[2]
        : 'https://vk.com/id' . $m[2];
}

function cleanMentionMarkup(string $text): string
{
    return preg_replace('/\[(?:id|club)\d+\|([^\]]*)\]/u', '$1', $text);
}

$pdo = getDbConnection();
$rows = $pdo->query("SELECT id, text, author_link FROM posts WHERE text LIKE '%[id%' OR text LIKE '%[club%'")->fetchAll();

$update = $pdo->prepare('UPDATE posts SET text = :text, author_link = :author_link WHERE id = :id');

$pdo->beginTransaction();
$count = 0;

foreach ($rows as $row) {
    $creditedLink = $row['author_link'] ?? extractCreditedAuthorLink($row['text']);
    $update->execute([
        'text' => cleanMentionMarkup($row['text']),
        'author_link' => $creditedLink,
        'id' => $row['id'],
    ]);
    $count++;
}

setSetting(FLAG_KEY, date('Y-m-d H:i:s'));
$pdo->commit();

echo "Обработано записей: {$count} из " . count($rows) . ".\n";
