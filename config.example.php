<?php

// Скопировать в config.php и заполнить реальными значениями.
// config.php не должен попадать в репозиторий (см. .gitignore).

return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'vk_wall_parser',
        'user' => 'db_user',
        'password' => 'db_password',
    ],
    'vk' => [
        // Must be a "сервисный ключ доступа" (service access token) — the only token type
        // that both works with wall.get and never expires. A community/group token does NOT
        // work here (VK error 27, "method is unavailable with group auth"), and a regular user
        // token expires after 1 hour. Get it by creating an app via VK ID's authorization
        // service (requires VK Business ID verification) — see DEPLOY.md.
        'access_token' => 'YOUR_VK_ACCESS_TOKEN',
        'group_domain' => 'group_short_name_or_id',
        'api_version' => '5.199',
    ],
    'ai' => [
        // Ключ Anthropic API (console.anthropic.com -> API Keys) — используется
        // extract.php/build_region_dictionary.php для извлечения направления
        // поездки из текста постов. Без этой секции экстракция просто не
        // выполняется (fetch.php молча пропускает её, остальной функционал
        // не затрагивается).
        'api_key' => 'YOUR_ANTHROPIC_API_KEY',
        'model' => 'claude-haiku-4-5-20251001',
    ],
];
