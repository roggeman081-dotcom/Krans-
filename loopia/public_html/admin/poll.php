<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
require __DIR__ . '/../app/admin.php';

header('Cache-Control: no-store');
if (!is_installed() || admin_current() === null) {
    json_out(['ok' => false], 401);
}
$row = db()->query('SELECT COUNT(*) AS n, COALESCE(MAX(updated_at), \'\') AS u FROM ' . T_BOOKINGS)->fetch();
json_out(['ok' => true, 'sig' => $row['n'] . '|' . $row['u']]);
