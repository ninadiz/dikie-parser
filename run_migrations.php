<?php

require __DIR__ . '/db.php';

function applyMigrations(): array
{
    $pdo = getDbConnection();

    // Bootstrap: migrations table must exist before we can check what's applied
    // (003_create_migrations_table.sql duplicates this, harmlessly, as IF NOT EXISTS).
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255),
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    $applied = $pdo->query('SELECT filename FROM migrations')->fetchAll(PDO::FETCH_COLUMN);

    $files = glob(__DIR__ . '/migrations/*.sql');
    sort($files);

    $newlyApplied = [];
    foreach ($files as $file) {
        $filename = basename($file);
        if (in_array($filename, $applied, true)) {
            continue;
        }

        $sql = file_get_contents($file);
        $pdo->exec($sql);

        $insert = $pdo->prepare('INSERT INTO migrations (filename) VALUES (:filename)');
        $insert->execute(['filename' => $filename]);

        $newlyApplied[] = $filename;
    }

    return $newlyApplied;
}

if (php_sapi_name() === 'cli') {
    $applied = applyMigrations();

    if (empty($applied)) {
        echo "Нет новых миграций для применения.\n";
    } else {
        foreach ($applied as $filename) {
            echo "Применена миграция: {$filename}\n";
        }
    }
}
