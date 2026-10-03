<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
require __DIR__ . '/../app/admin.php';

header('Cache-Control: no-store');
if (!is_installed() || admin_current() === null) {
    json_out(['ok' => false], 401);
}
$row = db()->query('SELECT (SELECT COUNT(*) FROM ' . T_BOOKINGS . ') AS n, (SELECT COALESCE(MAX(updated_at), \'\') FROM ' . T_BOOKINGS . ') AS u, (SELECT COUNT(*) FROM ' . T_MESSAGES . ') AS m, (SELECT COALESCE(MAX(updated_at), \'\') FROM ' . T_MESSAGES . ') AS mu')->fetch();
json_out(['ok' => true, 'sig' => implode('|', $row)]);
