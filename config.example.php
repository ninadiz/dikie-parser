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
