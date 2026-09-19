<?php

// Ручной способ сведения направлений к канону (без API-ключа) — собирает
// ещё не сопоставленные "сырые" фразы + инструкцию в файл для вставки в чат
// на claude.ai. Ответ сохрани в chat_import.json и запусти
// import_dictionary_results.php.

require __DIR__ . '/build_dictionary.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

$rawPhrases = getUnmappedRawPhrases();
if (empty($rawPhrases)) {
    echo "Нет новых нераспознанных направлений — нечего обрабатывать.\n";
    exit(0);
}

$systemPrompt = buildDictionaryPrompt(getCanonicalRegionsSeed());
$userContent = implode("\n", $rawPhrases);

$outFile = __DIR__ . '/chat_export.txt';
file_put_contents($outFile, $systemPrompt . "\n\nФразы:\n\n" . $userContent . "\n");

echo "Нераспознанных фраз: " . count($rawPhrases) . ".\n";
echo "Текст для вставки в чат сохранён в: {$outFile}\n";
echo "Дальше: скопируй содержимое файла целиком в чат с Claude (claude.ai) -> ";
echo "сохрани её ответ (только JSON, без пояснений) в chat_import.json рядом с проектом -> ";
echo "запусти: php import_dictionary_results.php\n";
