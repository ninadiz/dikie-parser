<?php

// Разовая коррекция данных: иногда модераторы вставляют прямую ссылку на
// профиль человека прямым текстом в самом конце поста (без "От", без разметки
// [id|Имя]) — например "...пишите в личку https://vk.ru/id141720188". Раньше
// fetch.php такую ссылку просто клал в "Ссылки" наравне со всеми остальными —
// теперь (см. fetch.php: extractTrailingProfileLink()) такая ссылка считается
// кредитом автора и уходит в author_link, а не в links.
//
// Для уже загруженных постов текст и ссылки уже полностью сохранены в БД —
// в отличие от бэкфилла signer_id, поход в VK API не нужен, всё берётся из
// уже сохранённого text/links. Не трогает посты, где author_link уже
// заполнен (из signer_id/from_id/разметки в тексте).
//
// Безопасно запускать только один раз — второй запуск откажет по флагу в
// settings.

require __DIR__ . '/db.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

const FLAG_KEY = 'trailing_profile_author_links_backfilled';

if (getSetting(FLAG_KEY) !== null) {
    echo "Уже применено ранее — повторный запуск отменён (см. settings." . FLAG_KEY . ").\n";
    exit(0);
}

function isOwnGroupLink(string $url, ?int $ownerId, string $groupDomain): bool
{
    $clean = rtrim($url, ').",');

    if ($ownerId !== null && preg_match('~^https?://(?:www\.|m\.)?vk\.(?:com|ru)/club' . abs($ownerId) . '(?:[/?#].*)?$~u', $clean)) {
        return true;
    }

    return (bool) preg_match('~^https?://(?:www\.|m\.)?vk\.(?:com|ru)/' . preg_quote($groupDomain, '~') . '(?:[/?#].*)?$~u', $clean);
}

function isProfileLink(string $url): bool
{
    if (!preg_match('~^https?://(?:www\.|m\.)?vk\.(?:com|ru)/([a-zA-Z0-9_.]+)~u', $url, $m)) {
        return false;
    }

    $path = $m[1];
    if (preg_match('~^id\d+$~', $path)) {
        return true;
    }

    if (preg_match('~^(wall|club|public|topic|board|album|photo|video|audio|doc|market|im|feed|app|page)~i', $path)) {
        return false;
    }

    return (bool) preg_match('~^[a-zA-Z_][a-zA-Z0-9_.]{3,31}$~', $path);
}

function extractTrailingProfileLink(string $text, ?int $ownerId, string $groupDomain): ?string
{
    preg_match_all('/https?:\/\/\S+/u', $text, $matches);
    if (empty($matches[0])) {
        return null;
    }

    $last = rtrim(end($matches[0]), ').",');
    if (!str_ends_with(rtrim($text), $last)) {
        return null;
    }

    if ($ownerId !== null && isOwnGroupLink($last, $ownerId, $groupDomain)) {
        return null;
    }

    return isProfileLink($last) ? $last : null;
}

$config = require __DIR__ . '/config.php';
$vkConfig = $config['vk'];
$ownerId = getOwnerId();

$pdo = getDbConnection();
$pdo->beginTransaction();

$rows = $pdo->query('SELECT id, text, links FROM posts WHERE author_link IS NULL')->fetchAll();
$update = $pdo->prepare('UPDATE posts SET author_link = :author_link, links = :links WHERE id = :id');
$count = 0;

foreach ($rows as $row) {
    $authorLink = extractTrailingProfileLink($row['text'] ?? '', $ownerId, $vkConfig['group_domain']);
    if ($authorLink === null) {
        continue;
    }

    $links = json_decode($row['links'] ?? '[]', true) ?? [];
    $filteredLinks = array_values(array_filter(
        $links,
        fn (string $url): bool => rtrim($url, ').",') !== rtrim($authorLink, ').",')
    ));

    $update->execute([
        'author_link' => $authorLink,
        'links' => json_encode($filteredLinks, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        'id' => $row['id'],
    ]);
    $count++;
}

setSetting(FLAG_KEY, date('Y-m-d H:i:s'));
$pdo->commit();

echo "Проставлено ссылок автора из текста поста: {$count}.\n";
