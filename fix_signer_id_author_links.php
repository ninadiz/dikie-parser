<?php

// Разовая коррекция данных: VK отдаёт для постов, опубликованных от имени
// сообщества, но подписанных конкретным человеком (например, посты из
// "предложки"), отдельное поле signer_id — оно НЕ попадает в text вообще, а
// vk.ru рисует "От Имя" сам на его основе. Мы не читали и не сохраняли это
// поле раньше (см. fetch.php), поэтому у уже загруженных постов эта
// информация нигде не лежит — восстановить её можно только заново пройдя по
// стене через VK API (wall.getById для этого токена недоступен, поэтому
// используется постраничный wall.get, как в fetch.php).
//
// Заодно чистит уже сохранённые posts.links от ссылок на саму нашу группу
// (club<id>/алиас-домен) — их там не должно быть ни при каких обстоятельствах.
//
// Не require fetch.php напрямую — его нижняя часть безусловно запускает
// runFetch() при подключении. Безопасно запускать только один раз — второй
// запуск откажет по флагу в settings (кроме DB-only части с ссылками, она
// идемпотентна и перезапускается всегда).

require __DIR__ . '/db.php';
require __DIR__ . '/vk_api.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

const FLAG_KEY = 'signer_id_author_links_backfilled';
const VK_COUNT_PER_REQUEST = 100;
const VK_REQUEST_DELAY_SECONDS = 0.34;

function buildAuthorLink(?int $id): ?string
{
    return ($id === null || $id <= 0) ? null : "https://vk.com/id{$id}";
}

function isOwnGroupLink(string $url, ?int $ownerId, string $groupDomain): bool
{
    $clean = rtrim($url, ').",');

    if ($ownerId !== null && preg_match('~^https?://(?:www\.|m\.)?vk\.(?:com|ru)/club' . abs($ownerId) . '(?:[/?#].*)?$~u', $clean)) {
        return true;
    }

    return (bool) preg_match('~^https?://(?:www\.|m\.)?vk\.(?:com|ru)/' . preg_quote($groupDomain, '~') . '(?:[/?#].*)?$~u', $clean);
}

$config = require __DIR__ . '/config.php';
$vkConfig = $config['vk'];
$pdo = getDbConnection();

if (getSetting(FLAG_KEY) === null) {
    $update = $pdo->prepare('UPDATE posts SET author_link = :author_link WHERE vk_post_id = :vk_post_id AND author_link IS NULL');

    $offset = 0;
    $scanned = 0;
    $updated = 0;

    while (true) {
        $response = vkWallGet($vkConfig['group_domain'], $offset, VK_COUNT_PER_REQUEST, $vkConfig['access_token'], $vkConfig['api_version']);
        $items = $response['items'] ?? [];
        if (empty($items)) {
            break;
        }

        foreach ($items as $item) {
            $scanned++;
            $link = buildAuthorLink(isset($item['signer_id']) ? (int) $item['signer_id'] : null);
            if ($link === null) {
                continue;
            }
            $update->execute(['author_link' => $link, 'vk_post_id' => (int) $item['id']]);
            $updated += $update->rowCount();
        }

        if (count($items) < VK_COUNT_PER_REQUEST) {
            break;
        }

        $offset += VK_COUNT_PER_REQUEST;
        usleep((int) (VK_REQUEST_DELAY_SECONDS * 1_000_000));
    }

    setSetting(FLAG_KEY, date('Y-m-d H:i:s'));
    echo "Просканировано постов: {$scanned}, проставлено ссылок автора: {$updated}.\n";
} else {
    echo "signer_id-бэкфилл уже применялся ранее — повторный проход по VK API пропущен.\n";
}

$ownerId = getOwnerId();
$rows = $pdo->query('SELECT id, links FROM posts')->fetchAll();
$updateLinks = $pdo->prepare('UPDATE posts SET links = :links WHERE id = :id');
$cleanedRows = 0;

foreach ($rows as $row) {
    $links = json_decode($row['links'] ?? '[]', true) ?? [];
    $filtered = array_values(array_filter(
        $links,
        fn (string $url): bool => !isOwnGroupLink($url, $ownerId, $vkConfig['group_domain'])
    ));

    if ($filtered !== $links) {
        $updateLinks->execute([
            'links' => json_encode($filtered, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'id' => $row['id'],
        ]);
        $cleanedRows++;
    }
}

echo "Почищено записей links от самоссылок: {$cleanedRows}.\n";
