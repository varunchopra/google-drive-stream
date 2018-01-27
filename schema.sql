CREATE TABLE stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_cache BOOLEAN DEFAULT FALSE,
    ip VARCHAR (255) DEFAULT NULL,
    date DATETIME NOT NULL,
    INDEX date_index (date)
)