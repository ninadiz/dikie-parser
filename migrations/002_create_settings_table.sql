CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO settings (`key`, value)
VALUES ('baseline_date', '2021-05-06')
ON DUPLICATE KEY UPDATE `key` = `key`;
