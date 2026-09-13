<?php

// Вторая половина ручного способа сведения словаря (см.
// export_dictionary_for_chat.php) — читает вставленный вручную JSON-ответ
// и сохраняет соответствия raw_phrase -> регион, затем применяет их к уже
// сохранённым постам.
//
// По умолчанию читает chat_import.json рядом с проектом, можно указать
// другой путь первым аргументом.

require __DIR__ . '/build_dictionary.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

$filePath = $argv[1] ?? (__DIR__ . '/chat_import.json');

if (!file_exists($filePath)) {
    fwrite(STDERR, "Файл не найден: {$filePath}\n");
    fwrite(STDERR, "Сохрани ответ нейросети (только JSON, без markdown-обёртки) в этот файл, ");
    fwrite(STDERR, "или укажи путь первым аргументом: php import_dictionary_results.php путь/к/файлу.json\n");
    exit(1);
}

$rawResponse = file_get_contents($filePath);
$mappings = parseDictionaryResponse($rawResponse);

if (empty($mappings)) {
    fwrite(STDERR, "Не удалось разобрать ни одной записи — проверь, что в файле только JSON-массив, без пояснений и текста до/после.\n");
    exit(1);
}

$mapped = saveDictionaryMappings($mappings);
$updated = applyDictionaryToPosts();

echo "---\n";
echo "Сопоставлено фраз: {$mapped}.\n";
echo "Обновлено постов: {$updated}.\n";
