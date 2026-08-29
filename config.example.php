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
    'auth' => [
        'username' => 'admin',
        // сгенерировать: php -r "echo password_hash('пароль', PASSWORD_DEFAULT), PHP_EOL;"
        'password_hash' => '$2y$10$REPLACE_WITH_GENERATED_HASH',
    ],
];
