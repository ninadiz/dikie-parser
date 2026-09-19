<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/anthropic_api.php';

const EXTRACTION_VERSION = 1;
const EXTRACTION_BATCH_SIZE = 25;
const EXTRACTION_MAX_ITERATIONS = 200; // защита от бесконечного цикла

function getPostsPendingExtraction(int $limit): array
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT id, text FROM posts
         WHERE extraction_version IS NULL OR extraction_version < :version
         ORDER BY id ASC
         LIMIT :limit'
    );
    $stmt->bindValue(':version', EXTRACTION_VERSION, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function getKnownRegions(): array
{
    $pdo = getDbConnection();
    $stmt = $pdo->query('SELECT DISTINCT region FROM region_dictionary ORDER BY region');

    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function getRegionDictionaryMap(): array
{
    $pdo = getDbConnection();
    $stmt = $pdo->query('SELECT raw_phrase, region FROM region_dictionary');

    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[$row['raw_phrase']] = $row['region'];
    }

    return $map;
}

function buildExtractionPrompt(array $knownRegions): string
{
    $regionsList = empty($knownRegions) ? '(пока пусто)' : implode(', ', $knownRegions);

    return <<<PROMPT
Ты анализируешь посты из группы ВКонтакте про пешие походы и путешествия. Для каждого поста определи:

- is_travel_post: true, если пост — предложение или поиск попутчиков для конкретной поездки/похода, иначе false (общие объявления, фото-отчёты, обсуждения не про конкретную поездку).
- region_raw: если упомянуто конкретное направление/место поездки — фраза как она написана в тексте (например "Мультинские", "Алтай", "Турция"). Если направлений несколько — выбери главное. Если направление не упомянуто или is_travel_post=false — null.
- mentioned_month: месяц поездки (число 1-12), если в тексте упомянута дата/период, иначе null. Не пытайся определить год — только месяц.
- mentioned_day: конкретный день месяца (число 1-31), если указан точно (например "12 марта" → month=3, day=12), иначе null.

Уже известные канонические регионы (если пост явно про один из них — пиши region_raw максимально близко к этому названию, чтобы упростить дальнейшее сопоставление): {$regionsList}

Ответь СТРОГО JSON-массивом без каких-либо пояснений, markdown-разметки или текста до/после. Ровно один элемент на каждый пост из списка, формат элемента:
{"post_id": <int>, "is_travel_post": <bool>, "region_raw": <string|null>, "mentioned_month": <int 1-12|null>, "mentioned_day": <int 1-31|null>}
PROMPT;
}

function buildBatchUserContent(array $posts): array
{
    $userContentParts = [];
    $requestedIds = [];
    foreach ($posts as $post) {
        $requestedIds[(int) $post['id']] = true;
        $userContentParts[] = "post_id: {$post['id']}\ntext: {$post['text']}";
    }

    return [implode("\n---\n", $userContentParts), $requestedIds];
}

function extractBatch(array $posts, string $systemPrompt, array $aiConfig): array
{
    [$userContent, $requestedIds] = buildBatchUserContent($posts);

    $rawResponse = anthropicMessage(
        $aiConfig['api_key'],
        $aiConfig['model'],
        $systemPrompt,
        $userContent
    );

    return parseExtractionResponse($rawResponse, $requestedIds);
}

function parseExtractionResponse(string $rawResponse, ?array $requestedIds): array
{
    // Модель попросили отвечать чистым JSON, но на всякий случай снимаем
    // возможную markdown-обёртку (```json ... ```), если она всё же появилась
    // — актуально и для ответа API, и для вручную вставленного ответа из чата.
    $cleaned = trim(preg_replace('/^```(?:json)?|```$/mu', '', trim($rawResponse)));

    $decoded = json_decode($cleaned, true);
    if (!is_array($decoded)) {
        return [];
    }

    $results = [];
    foreach ($decoded as $item) {
        if (!is_array($item) || !isset($item['post_id'])) {
            continue;
        }

        $postId = (int) $item['post_id'];
        if ($requestedIds !== null && !isset($requestedIds[$postId])) {
            continue; // модель вернула post_id, которого не было в запросе
        }

        $isTravelPost = $item['is_travel_post'] ?? false;
        if (!is_bool($isTravelPost)) {
            continue;
        }

        $regionRaw = $item['region_raw'] ?? null;
        if ($regionRaw !== null && (!is_string($regionRaw) || $regionRaw === '')) {
            continue;
        }
        if ($regionRaw !== null) {
            // substr(), не mb_substr() — mbstring не гарантирован в окружении
            // (отсутствует локально); реальные названия мест всегда далеко
            // меньше 255 байт, так что риска обрезать посреди символа нет.
            $regionRaw = substr(trim($regionRaw), 0, 255);
        }

        $mentionedMonth = $item['mentioned_month'] ?? null;
        if ($mentionedMonth !== null && (!is_int($mentionedMonth) || $mentionedMonth < 1 || $mentionedMonth > 12)) {
            continue;
        }

        $mentionedDay = $item['mentioned_day'] ?? null;
        if ($mentionedDay !== null && (!is_int($mentionedDay) || $mentionedDay < 1 || $mentionedDay > 31)) {
            continue;
        }

        if (!$isTravelPost) {
            // Не про поездку — направление/дата не имеют смысла, даже если
            // модель что-то туда написала.
            $regionRaw = null;
            $mentionedMonth = null;
            $mentionedDay = null;
        }

        $results[$postId] = [
            'is_travel_post' => $isTravelPost,
            'region_raw' => $regionRaw,
            'mentioned_month' => $mentionedMonth,
            'mentioned_day' => $mentionedDay,
        ];
    }

    return $results;
}

function saveExtractionResult(int $postId, array $result, array $regionDictionary): void
{
    $region = $result['region_raw'] !== null
        ? ($regionDictionary[$result['region_raw']] ?? null)
        : null;

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'UPDATE posts SET
            is_travel_post = :is_travel_post,
            region_raw = :region_raw,
            region = :region,
            mentioned_month = :mentioned_month,
            mentioned_day = :mentioned_day,
            extraction_version = :extraction_version
         WHERE id = :id'
    );
    $stmt->execute([
        'is_travel_post' => (int) $result['is_travel_post'],
        'region_raw' => $result['region_raw'],
        'region' => $region,
        'mentioned_month' => $result['mentioned_month'],
        'mentioned_day' => $result['mentioned_day'],
        'extraction_version' => EXTRACTION_VERSION,
        'id' => $postId,
    ]);
}

function runExtraction(): array
{
    $config = require __DIR__ . '/config.php';
    $aiConfig = $config['ai'] ?? null;
    if ($aiConfig === null) {
        throw new AnthropicApiException('В config.php не настроена секция "ai"');
    }

    $knownRegions = getKnownRegions();
    $systemPrompt = buildExtractionPrompt($knownRegions);
    $regionDictionary = getRegionDictionaryMap();

    $scanned = 0;
    $processed = 0;

    for ($i = 0; $i < EXTRACTION_MAX_ITERATIONS; $i++) {
        $posts = getPostsPendingExtraction(EXTRACTION_BATCH_SIZE);
        if (empty($posts)) {
            break;
        }

        $scanned += count($posts);
        $results = extractBatch($posts, $systemPrompt, $aiConfig);

        if (empty($results)) {
            // Батч целиком не дал валидного результата (сбой API/невалидный
            // JSON) — не долбим повторно в этом же запуске, посты останутся
            // pending и будут подхвачены на следующем прогоне.
            break;
        }

        foreach ($results as $postId => $result) {
            saveExtractionResult($postId, $result, $regionDictionary);
            $processed++;
        }

        if (count($posts) < EXTRACTION_BATCH_SIZE) {
            break;
        }
    }

    return ['scanned' => $scanned, 'processed' => $processed];
}
