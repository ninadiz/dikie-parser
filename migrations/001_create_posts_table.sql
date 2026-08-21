CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vk_post_id BIGINT UNIQUE NOT NULL,
    text TEXT,
    published_at DATETIME NOT NULL,
    author_id BIGINT,
    author_link VARCHAR(255),
    links JSON,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
