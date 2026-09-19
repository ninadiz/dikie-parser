<?php

// Тонкая CLI-обёртка над build_dictionary.php (автоматический путь, нужен
// ключ Anthropic в config.php). Без ключа — см. export_dictionary_for_chat.php
// / import_dictionary_results.php (тот же результат, вручную через чат).

require __DIR__ . '/build_dictionary.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

try {
    $result = runDictionaryBuild();

    if (!$result['hadWork']) {
        echo "Нет новых нераспознанных направлений — нечего обрабатывать.\n";
        exit(0);
    }

    echo "---\n";
    echo "Сопоставлено новых фраз: {$result['mapped']}.\n";
    echo "Обновлено постов: {$result['updated']}.\n";
} catch (AnthropicApiException $e) {
    fwrite(STDERR, 'Ошибка Anthropic API: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
