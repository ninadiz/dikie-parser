<?php

// Библиотека для сведения "сырых" фраз направлений к закрытому списку
// канонических регионов — используется и автоматическим путём
// (build_region_dictionary.php, нужен ключ Anthropic), и ручным
// (export_dictionary_for_chat.php / import_dictionary_results.php, без
// ключа — через обычный чат). Ничего не выполняет при подключении (как и
// extract.php) — безопасно require'ить из нескольких CLI-обёрток.

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/anthropic_api.php';

const STARTER_REGIONS = [
    'Алтай', 'Урал', 'Кавказ', 'Крым', 'Карелия', 'Кольский полуостров',
    'Байкал', 'Камчатка', 'Сахалин', 'Кавказские Минеральные Воды',
    'Ленинградская область', 'Подмосковье',
    'Турция', 'Таиланд', 'Грузия', 'Абхазия', 'Армения', 'Азербайджан',
    'Казахстан', 'Киргизия', 'Узбекистан', 'Китай', 'Вьетнам', 'Шри-Ланка',
    'Индонезия', 'Непал', 'Индия', 'ОАЭ', 'Египет',
];

function getUnmappedRawPhrases(): array
{
    $pdo = getDbConnection();

    return $pdo->query(
        'SELECT DISTINCT region_raw FROM posts WHERE region_raw IS NOT NULL AND region IS NULL'
    )->fetchAll(PDO::FETCH_COLUMN);
}

function getCanonicalRegionsSeed(): array
{
    $pdo = getDbConnection();
    $existingRegions = $pdo->query('SELECT DISTINCT region FROM region_dictionary')->fetchAll(PDO::FETCH_COLUMN);

    return array_values(array_unique(array_merge(STARTER_REGIONS, $existingRegions)));
}

function buildDictionaryPrompt(array $knownRegions): string
{
    $regionsList = implode(', ', $knownRegions);

    return <<<PROMPT
Ты помогаешь классифицировать направления путешествий и походов, упомянутые в постах группы ВКонтакте про турпоходы, по каноническим регионам.

Дан список уникальных "сырых" фраз, которыми люди описывали направление поездки — это могут быть не только официальные названия регионов/стран, а конкретные локации внутри них: озёра, горы, перевалы, посёлки, тропы.

Стартовый список известных канонических регионов (используй его, если фраза точно про один из них; если нет — не бойся предложить своё каноническое название, даже если такое направление в списке фраз встретилось всего один раз): {$regionsList}

Для каждой фразы определи, к какому каноническому региону она относится, используя свои знания географии (например "Белуха", "Мультинские", "Аккем" — всё это регион "Алтай"). Если фраза — это реальное узнаваемое место (страна, регион, город, гора, ущелье и т.п.), дай ему чистое каноническое название, даже если оно единственное такое в списке (например "Марокко" → "Марокко", "Кейптаун" → "Кейптаун"). Регион "other" используй только если фраза ДЕЙСТВИТЕЛЬНО не про конкретное направление — шум, опечатка, слишком общее понятие ("куда-нибудь", целый континент без уточнения) и т.п.

Ответь СТРОГО JSON-массивом без пояснений и markdown-разметки, по одному элементу на каждую входную фразу, raw_phrase — точно как во входном списке:
{"raw_phrase": "<фраза>", "region": "<канонический регион>"}
PROMPT;
}

function parseDictionaryResponse(string $rawResponse): array
{
    $cleaned = trim(preg_replace('/^```(?:json)?|```$/mu', '', trim($rawResponse)));
    $decoded = json_decode($cleaned, true);
    if (!is_array($decoded)) {
        return [];
    }

    $mappings = [];
    foreach ($decoded as $item) {
        if (!is_array($item) || !isset($item['raw_phrase'], $item['region'])) {
            continue;
        }
        if (!is_string($item['raw_phrase']) || !is_string($item['region']) || $item['region'] === '') {
            continue;
        }

        $mappings[] = ['raw_phrase' => $item['raw_phrase'], 'region' => $item['region']];
    }

    return $mappings;
}

function saveDictionaryMappings(array $mappings): int
{
    $pdo = getDbConnection();
    $insert = $pdo->prepare(
        'INSERT INTO region_dictionary (raw_phrase, region) VALUES (:raw_phrase, :region)
         ON DUPLICATE KEY UPDATE region = VALUES(region)'
    );

    $count = 0;
    foreach ($mappings as $mapping) {
        $insert->execute($mapping);
        echo "{$mapping['raw_phrase']} => {$mapping['region']}\n";
        $count++;
    }

    return $count;
}

function applyDictionaryToPosts(): int
{
    $pdo = getDbConnection();

    return $pdo->exec(
        'UPDATE posts p JOIN region_dictionary d ON p.region_raw = d.raw_phrase
         SET p.region = d.region
         WHERE p.region IS NULL'
    );
}

function runDictionaryBuild(): array
{
    $config = require __DIR__ . '/config.php';
    $aiConfig = $config['ai'] ?? null;
    if ($aiConfig === null) {
        throw new AnthropicApiException('В config.php не настроена секция "ai"');
    }

    $rawPhrases = getUnmappedRawPhrases();
    if (empty($rawPhrases)) {
        return ['mapped' => 0, 'updated' => 0, 'hadWork' => false];
    }

    $systemPrompt = buildDictionaryPrompt(getCanonicalRegionsSeed());

    $mapped = 0;
    $chunks = array_chunk($rawPhrases, 200); // защита от слишком длинного запроса разом
    foreach ($chunks as $chunk) {
        $userContent = implode("\n", $chunk);
        $rawResponse = anthropicMessage($aiConfig['api_key'], $aiConfig['model'], $systemPrompt, $userContent);
        $mappings = parseDictionaryResponse($rawResponse);
        $mapped += saveDictionaryMappings($mappings);
    }

    $updated = applyDictionaryToPosts();

    return ['mapped' => $mapped, 'updated' => $updated, 'hadWork' => true];
}
