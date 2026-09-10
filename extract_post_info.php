<?php

// Тонкая CLI-обёртка над extract.php — сам extract.php ничего не выполняет
// при подключении (только объявления функций), поэтому его безопасно
// require'ить и из fetch.php (авто-запуск после каждого фетча), и отсюда
// (ручной/cron-запуск, в т.ч. для разового бэкфилла по истории).

require __DIR__ . '/extract.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

try {
    $result = runExtraction();
    echo "Обработано постов: {$result['processed']} (из {$result['scanned']} просканировано).\n";
} catch (AnthropicApiException $e) {
    fwrite(STDERR, 'Ошибка Anthropic API: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
