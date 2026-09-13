<?php

// Ручной способ извлечения (без API-ключа): собирает пачку ещё не обработанных
// постов + инструкцию для модели в один файл, готовый для вставки в обычный
// чат на claude.ai. Ответ нейросети (JSON) сохрани в chat_import.json рядом
// с проектом и запусти import_batch_results.php.
//
// Необязательный аргумент — сколько постов взять за раз (по умолчанию —
// EXTRACTION_BATCH_SIZE): php export_batch_for_chat.php 50

require __DIR__ . '/extract.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

$count = isset($argv[1]) ? max(1, (int) $argv[1]) : EXTRACTION_BATCH_SIZE;

$posts = getPostsPendingExtraction($count);
if (empty($posts)) {
    echo "Нет постов, ожидающих обработки.\n";
    exit(0);
}

$knownRegions = getKnownRegions();
$systemPrompt = buildExtractionPrompt($knownRegions);
[$userContent] = buildBatchUserContent($posts);

$outFile = __DIR__ . '/chat_export.txt';
$content = $systemPrompt . "\n\nПосты:\n\n" . $userContent . "\n";
file_put_contents($outFile, $content);

echo "Постов в пачке: " . count($posts) . ".\n";
echo "Текст для вставки в чат сохранён в: {$outFile}\n";
echo "Дальше: скопируй содержимое файла целиком в чат с Claude (claude.ai) -> ";
echo "сохрани её ответ (только JSON, без пояснений) в chat_import.json рядом с проектом -> ";
echo "запусти: php import_batch_results.php\n";
