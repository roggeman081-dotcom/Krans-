<?php
declare(strict_types=1);

/** Skapar tabellerna om de saknas och lägger in årets pass om inga finns. */
function krans_install_schema(PDO $db): void
{
    $tail = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_swedish_ci';

    $db->exec('CREATE TABLE IF NOT EXISTS ' . T_SETTINGS . ' (
        name VARCHAR(50) NOT NULL PRIMARY KEY,
        value TEXT NOT NULL
    )' . $tail);

    $db->exec('CREATE TABLE IF NOT EXISTS ' . T_SESSIONS . ' (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        starts_at DATETIME NOT NULL,
        ends_at DATETIME NOT NULL,
        capacity SMALLINT UNSIGNED NOT NULL DEFAULT 10,
        price INT UNSIGNED NOT NULL DEFAULT 495,
        active TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY uq_starts_at (starts_at)
    )' . $tail);

    $db->exec('CREATE TABLE IF NOT EXISTS ' . T_BOOKINGS . ' (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ref CHAR(7) NOT NULL,
        session_id INT UNSIGNED NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(190) NOT NULL,
        persons TINYINT UNSIGNED NOT NULL,
        message TEXT NULL,
        amount INT UNSIGNED NOT NULL,
        status ENUM(\'ny\',\'bekraftad\',\'avbokad\') NOT NULL DEFAULT \'ny\',
        payment_status ENUM(\'obetald\',\'betald\',\'aterbetald\') NOT NULL DEFAULT \'obetald\',
        visitor CHAR(16) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_ref (ref),
        KEY idx_session_status (session_id, status),
        KEY idx_created (created_at),
        CONSTRAINT fk_krans_booking_session FOREIGN KEY (session_id) REFERENCES ' . T_SESSIONS . ' (id)
    )' . $tail);

    $db->exec('CREATE TABLE IF NOT EXISTS ' . T_EVENTS . ' (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        session_id INT UNSIGNED NULL,
        visitor CHAR(16) NOT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_type_created (type, created_at),
        KEY idx_session_type (session_id, type),
        KEY idx_visitor_created (visitor, created_at)
    )' . $tail);

    $db->exec('CREATE TABLE IF NOT EXISTS ' . T_TOKENS . ' (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        created_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL
    )' . $tail);

    $db->exec('CREATE TABLE IF NOT EXISTS ' . T_ATTEMPTS . ' (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ip_key CHAR(16) NOT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_ip_created (ip_key, created_at)
    )' . $tail);

    $db->exec('CREATE TABLE IF NOT EXISTS ' . T_MESSAGES . ' (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(190) NOT NULL,
        message TEXT NOT NULL,
        handled TINYINT(1) NOT NULL DEFAULT 0,
        visitor CHAR(16) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        KEY idx_created (created_at)
    )' . $tail);

    if ((int) $db->query('SELECT COUNT(*) FROM ' . T_SESSIONS)->fetchColumn() === 0) {
        $st = $db->prepare('INSERT INTO ' . T_SESSIONS . ' (starts_at, ends_at, capacity, price) VALUES (?, ?, 10, 495)');
        foreach ([
            ['2026-11-14 13:00:00', '2026-11-14 16:00:00'],
            ['2026-11-15 13:00:00', '2026-11-15 16:00:00'],
            ['2026-11-29 10:00:00', '2026-11-29 13:00:00'],
            ['2026-11-29 15:00:00', '2026-11-29 17:00:00'],
        ] as $pass) {
            $st->execute($pass);
        }
    }
}
