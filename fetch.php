<?php

require __DIR__ . '/db.php';
require __DIR__ . '/vk_api.php';

const VK_REQUEST_DELAY_SECONDS = 0.34; // VK ограничивает запросы: не больше ~3 в секунду
const VK_COUNT_PER_REQUEST = 100; // максимум постов за один запрос (лимит VK)

date_default_timezone_set('UTC');

function extractLinks(string $text): array
{
    preg_match_all('/https?:\/\/\S+/u', $text, $matches);
    return $matches[0];
}

function buildAuthorLink(?int $authorId): ?string
{
    if ($authorId === null) {
        return null;
    }

    // Negative from_id means the post was published by the community itself, not a person.
    return $authorId < 0
        ? 'https://vk.com/club' . abs($authorId)
        : "https://vk.com/id{$authorId}";
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

            $text = $item['text'] ?? '';
            $authorId = isset($item['from_id']) ? (int) $item['from_id'] : null;

            upsertPost([
                'vk_post_id' => $vkPostId,
                'text' => $text,
                'published_at' => $publishedAt,
                'author_id' => $authorId,
                'author_link' => buildAuthorLink($authorId),
                'links' => extractLinks($text),
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
    require __DIR__ . '/session_init.php';
    initSession();
    header('Content-Type: application/json');

    if (empty($_SESSION['authenticated'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    // Release the session lock now that auth is checked — this request can run for a
    // while (paging through VK with rate-limit sleeps), and would otherwise block any
    // other concurrent request against the same session for its entire duration.
    session_write_close();

    try {
        $count = runFetch();
        echo json_encode(['success' => true, 'count' => $count]);
    } catch (VkApiException $e) {
        http_response_code(502);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
