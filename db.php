<?php

function getDbConnection(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $db = $config['db'];

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $db['host'],
        $db['port'],
        $db['database']
    );

    $pdo = new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => true,
        PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
    ]);

    return $pdo;
}

function getPosts(?string $dateFrom, ?string $dateTo, int $limit = 150, int $offset = 0): array
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT * FROM posts
         WHERE (:dateFrom IS NULL OR published_at >= :dateFrom)
           AND (:dateTo IS NULL OR published_at <= :dateTo)
         ORDER BY published_at DESC, id DESC
         LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':dateFrom', $dateFrom);
    $stmt->bindValue(':dateTo', $dateTo);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function getPostsCount(?string $dateFrom, ?string $dateTo): int
{
    if ($dateFrom === null && $dateTo === null) {
        $dateFrom = getSetting('baseline_date');
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM posts
         WHERE (:dateFrom IS NULL OR published_at >= :dateFrom)
           AND (:dateTo IS NULL OR published_at <= :dateTo)'
    );
    $stmt->bindValue(':dateFrom', $dateFrom);
    $stmt->bindValue(':dateTo', $dateTo);
    $stmt->execute();

    return (int) $stmt->fetchColumn();
}

function upsertPost(array $post): void
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO posts (vk_post_id, text, published_at, author_id, author_link, links)
         VALUES (:vk_post_id, :text, :published_at, :author_id, :author_link, :links)
         ON DUPLICATE KEY UPDATE
             text = VALUES(text),
             published_at = VALUES(published_at),
             author_id = VALUES(author_id),
             author_link = VALUES(author_link),
             links = VALUES(links)'
    );

    $stmt->execute([
        'vk_post_id' => $post['vk_post_id'],
        'text' => $post['text'] ?? '',
        'published_at' => $post['published_at'],
        'author_id' => $post['author_id'] ?? null,
        'author_link' => $post['author_link'] ?? null,
        'links' => json_encode($post['links'] ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ]);
}

function getLastPost(): ?array
{
    $pdo = getDbConnection();
    $stmt = $pdo->query(
        'SELECT published_at, vk_post_id FROM posts
         ORDER BY published_at DESC, vk_post_id DESC
         LIMIT 1'
    );

    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function getSetting(string $key): ?string
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key` = :key');
    $stmt->execute(['key' => $key]);

    $value = $stmt->fetchColumn();
    return $value === false ? null : $value;
}

function setSetting(string $key, string $value): void
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO settings (`key`, value) VALUES (:key, :value)
         ON DUPLICATE KEY UPDATE value = VALUES(value)'
    );
    $stmt->execute(['key' => $key, 'value' => $value]);
}
