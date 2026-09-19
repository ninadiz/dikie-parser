<?php

// Вторая половина ручного способа (см. export_batch_for_chat.php) — читает
// JSON-ответ, вставленный вручную из чата с Claude, и записывает результат
// в БД той же логикой валидации, что и автоматический путь через API.
//
// По умолчанию читает chat_import.json рядом с проектом, можно указать
// другой путь первым аргументом: php import_batch_results.php путь/к/файлу.json

require __DIR__ . '/extract.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

$filePath = $argv[1] ?? (__DIR__ . '/chat_import.json');

if (!file_exists($filePath)) {
    fwrite(STDERR, "Файл не найден: {$filePath}\n");
    fwrite(STDERR, "Сохрани ответ нейросети (только JSON, без markdown-обёртки) в этот файл, ");
    fwrite(STDERR, "или укажи путь первым аргументом: php import_batch_results.php путь/к/файлу.json\n");
    exit(1);
}

$rawResponse = file_get_contents($filePath);
$results = parseExtractionResponse($rawResponse, null);

if (empty($results)) {
    fwrite(STDERR, "Не удалось разобрать ни одной записи — проверь, что в файле только JSON-массив, без пояснений и текста до/после.\n");
    exit(1);
}

$regionDictionary = getRegionDictionaryMap();
foreach ($results as $postId => $result) {
    saveExtractionResult($postId, $result, $regionDictionary);
}

echo "Сохранено записей: " . count($results) . ".\n";
