<?php

require __DIR__ . '/db.php';
require __DIR__ . '/vk_api.php';

const VK_REQUEST_DELAY_SECONDS = 0.34; // VK ограничивает запросы: не больше ~3 в секунду
const VK_COUNT_PER_REQUEST = 100; // максимум постов за один запрос (лимит VK)

// VK's `date` is a UTC unix timestamp, but posts are meant to be read in Moscow local
// time (that's what vk.com itself shows, and what "утром"/"в 7 часов" in post text
// refers to) — Europe/Moscow also correctly resolves historical DST (Russia observed
// it until 2011, then was permanently UTC+4 until switching to permanent UTC+3 in
// 2014), which a flat +3h offset would get wrong for pre-2014 posts.
date_default_timezone_set('Europe/Moscow');

function extractLinks(string $text): array
{
    preg_match_all('/https?:\/\/\S+/u', $text, $matches);
    return $matches[0];
}

function buildAuthorLink(?int $authorId): ?string
{
    // Negative from_id means the post was published by the community itself, not a
    // person — there is no real distinct author to link to.
    if ($authorId === null || $authorId < 0) {
        return null;
    }

    return "https://vk.com/id{$authorId}";
}

function extractCreditedAuthorLink(string $text): ?string
{
    // Только "От [id.../club...|Имя]" (или "от") в самом конце текста —
    // это единственный надёжный признак, что модератор кредитует реального
    // автора поста, а не просто на кого-то ссылается по ходу текста.
    if (!preg_match('/(?:^|\s)[Оо]т\s+\[(id|club)(\d+)\|[^\]]*\]\s*$/u', trim($text), $m)) {
        return null;
    }

    return $m[1] === 'club'
        ? 'https://vk.com/club' . $m[2]
        : 'https://vk.com/id' . $m[2];
}

function cleanMentionMarkup(string $text): string
{
    // VK хранит упоминания прямо в тексте как [id123|Имя]/[club123|Имя] —
    // показываем только читаемое имя, без скобок/id; ссылка (если это кредит
    // автора) отдельно уходит в author_link, в тексте её не оставляем.
    return preg_replace('/\[(?:id|club)\d+\|([^\]]*)\]/u', '$1', $text);
}

function isProfileLink(string $url): bool
{
    // Настоящая ссылка на профиль человека — vk.com/id<цифры> или
    // vk.com/<никнейм>. Никогда не wall.../club.../public... и т.п. — это
    // другие сущности VK, а не профиль конкретного человека.
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
    // Модераторы иногда просто вставляют ссылку на человека прямым текстом в
    // самом конце поста (без "От", без разметки [id|Имя]) — если последняя
    // ссылка в тексте реально ведёт на профиль (а не на сам пост/группу/что-то
    // ещё), считаем её кредитом автора.
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

function captureOwnerIdIfMissing(array $items): void
{
    if (empty($items) || getSetting('vk_owner_id') !== null) {
        return;
    }

    if (isset($items[0]['owner_id'])) {
        setSetting('vk_owner_id', (string) (int) $items[0]['owner_id']);
    }
}

function isOwnGroupLink(string $url, ?int $ownerId, string $groupDomain): bool
{
    // Ссылка на саму нашу группу (по числовому club<id> или по алиасу-домену)
    // — не показываем её нигде, ни как "Автор", ни в "Ссылки".
    $clean = rtrim($url, ').",');

    if ($ownerId !== null && preg_match('~^https?://(?:www\.|m\.)?vk\.(?:com|ru)/club' . abs($ownerId) . '(?:[/?#].*)?$~u', $clean)) {
        return true;
    }

    return (bool) preg_match('~^https?://(?:www\.|m\.)?vk\.(?:com|ru)/' . preg_quote($groupDomain, '~') . '(?:[/?#].*)?$~u', $clean);
}

function runFetch(): int
{
    $config = require __DIR__ . '/config.php';
    $vkConfig = $config['vk'];

    $lastPost = getLastPost();
    $lastPublishedAt = $lastPost['published_at'] ?? null;
    $lastVkPostId = $lastPost['vk_post_id'] ?? null;

    $offset = 0;
    $newPostsCount = 0;
    $stop = false;

    while (!$stop) {
        $response = vkWallGet(
            $vkConfig['group_domain'],
            $offset,
            VK_COUNT_PER_REQUEST,
            $vkConfig['access_token'],
            $vkConfig['api_version']
        );

        $items = $response['items'] ?? [];
        if (empty($items)) {
            break;
        }

        captureOwnerIdIfMissing($items);
        $ownerId = getOwnerId();

        foreach ($items as $item) {
            $publishedAt = date('Y-m-d H:i:s', (int) $item['date']);
            $vkPostId = (int) $item['id'];
            $isPinned = !empty($item['is_pinned']);

            // A pinned post is always returned first by VK regardless of its actual
            // publish date, breaking the "items are strictly newest-to-oldest" assumption
            // the stop condition below relies on — so it must not trigger it. Skip it
            // entirely if we already have it (it never needs re-fetching once seen).
            if ($isPinned && $lastVkPostId !== null && postExists($vkPostId)) {
                continue;
            }

            if (!$isPinned && $lastPublishedAt !== null) {
                if ($publishedAt < $lastPublishedAt) {
                    $stop = true;
                    break;
                }
                if ($publishedAt === $lastPublishedAt && $vkPostId <= (int) $lastVkPostId) {
                    $stop = true;
                    break;
                }
            }

            $rawText = $item['text'] ?? '';
            $authorId = isset($item['from_id']) ? (int) $item['from_id'] : null;
            $signerId = isset($item['signer_id']) ? (int) $item['signer_id'] : null;
            $links = array_values(array_filter(
                extractLinks($rawText),
                fn (string $url): bool => !isOwnGroupLink($url, $ownerId, $vkConfig['group_domain'])
            ));
            $authorLink = buildAuthorLink($authorId)
                ?? buildAuthorLink($signerId)
                ?? extractCreditedAuthorLink($rawText)
                ?? extractTrailingProfileLink($rawText, $ownerId, $vkConfig['group_domain']);

            if ($authorLink !== null) {
                $links = array_values(array_filter(
                    $links,
                    fn (string $url): bool => rtrim($url, ').",') !== rtrim($authorLink, ').",')
                ));
            }

            $text = cleanMentionMarkup($rawText);

            upsertPost([
                'vk_post_id' => $vkPostId,
                'text' => $text,
                'published_at' => $publishedAt,
                'author_id' => $authorId,
                'author_link' => $authorLink,
                'links' => $links,
            ]);

            $newPostsCount++;
        }

        if ($stop || count($items) < VK_COUNT_PER_REQUEST) {
            break; // достигнут конец стены
        }

        $offset += VK_COUNT_PER_REQUEST;
        usleep((int) (VK_REQUEST_DELAY_SECONDS * 1_000_000));
    }

    return $newPostsCount;
}

if (php_sapi_name() === 'cli') {
    try {
        $count = runFetch();
        echo "Загружено новых постов: {$count}\n";
    } catch (VkApiException $e) {
        fwrite(STDERR, 'Ошибка VK API: ' . $e->getMessage() . PHP_EOL);
        exit(1);
    }
} else {
    header('Content-Type: application/json');

    try {
        $count = runFetch();
        echo json_encode(['success' => true, 'count' => $count]);
    } catch (VkApiException $e) {
        http_response_code(502);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
