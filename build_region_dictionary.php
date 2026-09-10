<?php

// Разово (и периодически, по мере накопления новых нераспознанных
// направлений) сводит "сырые" фразы направлений (region_raw), извлечённые
// extract.php из текста постов, к закрытому списку канонических регионов —
// используя знания географии модели (например "Белуха"/"Мультинские"/
// "Аккем" → "Алтай"), а не вручную поддерживаемый словарь синонимов.
//
// Обрабатывает только ещё не сопоставленные фразы (region IS NULL) — при
// повторном запуске не трогает уже устоявшиеся соответствия.

require __DIR__ . '/db.php';
require __DIR__ . '/anthropic_api.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

const STARTER_REGIONS = [
    'Алтай', 'Урал', 'Кавказ', 'Крым', 'Карелия', 'Кольский полуостров',
    'Байкал', 'Камчатка', 'Сахалин', 'Кавказские Минеральные Воды',
    'Ленинградская область', 'Подмосковье',
    'Турция', 'Таиланд', 'Грузия', 'Абхазия', 'Армения', 'Азербайджан',
    'Казахстан', 'Киргизия', 'Узбекистан', 'Китай', 'Вьетнам', 'Шри-Ланка',
    'Индонезия', 'Непал', 'Индия', 'ОАЭ', 'Египет',
];

function buildDictionaryPrompt(array $knownRegions): string
{
    $regionsList = implode(', ', $knownRegions);

    return <<<PROMPT
Ты помогаешь классифицировать направления путешествий и походов, упомянутые в постах группы ВКонтакте про турпоходы, по каноническим регионам.

Дан список уникальных "сырых" фраз, которыми люди описывали направление поездки — это могут быть не только официальные названия регионов/стран, а конкретные локации внутри них: озёра, горы, перевалы, посёлки, тропы.

Стартовый список известных канонических регионов (используй другие названия, только если видишь повторяющийся паттерн, явно не покрытый списком): {$regionsList}

Для каждой фразы определи, к какому каноническому региону она относится, используя свои знания географии (например "Белуха", "Мультинские", "Аккем" — всё это регион "Алтай"). Если фраза не про конкретное направление или это шум/непонятно — используй регион "other".

Ответь СТРОГО JSON-массивом без пояснений и markdown-разметки, по одному элементу на каждую входную фразу, raw_phrase — точно как во входном списке:
{"raw_phrase": "<фраза>", "region": "<канонический регион>"}
PROMPT;
}

$config = require __DIR__ . '/config.php';
$aiConfig = $config['ai'] ?? null;
if ($aiConfig === null) {
    fwrite(STDERR, "В config.php не настроена секция \"ai\".\n");
    exit(1);
}

$pdo = getDbConnection();

$rawPhrases = $pdo->query(
    'SELECT DISTINCT region_raw FROM posts WHERE region_raw IS NOT NULL AND region IS NULL'
)->fetchAll(PDO::FETCH_COLUMN);

if (empty($rawPhrases)) {
    echo "Нет новых нераспознанных направлений — нечего обрабатывать.\n";
    exit(0);
}

$existingRegions = $pdo->query('SELECT DISTINCT region FROM region_dictionary')->fetchAll(PDO::FETCH_COLUMN);
$knownRegions = array_values(array_unique(array_merge(STARTER_REGIONS, $existingRegions)));
$systemPrompt = buildDictionaryPrompt($knownRegions);

$insert = $pdo->prepare(
    'INSERT INTO region_dictionary (raw_phrase, region) VALUES (:raw_phrase, :region)
     ON DUPLICATE KEY UPDATE region = VALUES(region)'
);

$mapped = 0;
$chunks = array_chunk($rawPhrases, 200); // защита от слишком длинного запроса разом

foreach ($chunks as $chunk) {
    $userContent = implode("\n", $chunk);
    $rawResponse = anthropicMessage($aiConfig['api_key'], $aiConfig['model'], $systemPrompt, $userContent);
    $cleaned = trim(preg_replace('/^```(?:json)?|```$/mu', '', trim($rawResponse)));
    $decoded = json_decode($cleaned, true);

    if (!is_array($decoded)) {
        fwrite(STDERR, "Не удалось разобрать ответ модели для одного из чанков — пропущен.\n");
        continue;
    }

    foreach ($decoded as $item) {
        if (!is_array($item) || !isset($item['raw_phrase'], $item['region'])) {
            continue;
        }
        if (!is_string($item['raw_phrase']) || !is_string($item['region']) || $item['region'] === '') {
            continue;
        }

        $insert->execute(['raw_phrase' => $item['raw_phrase'], 'region' => $item['region']]);
        $mapped++;
        echo "{$item['raw_phrase']} => {$item['region']}\n";
    }
}

$updated = $pdo->exec(
    'UPDATE posts p JOIN region_dictionary d ON p.region_raw = d.raw_phrase
     SET p.region = d.region
     WHERE p.region IS NULL'
);

echo "---\n";
echo "Сопоставлено новых фраз: {$mapped}.\n";
echo "Обновлено постов: {$updated}.\n";
