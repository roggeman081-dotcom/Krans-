<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
require __DIR__ . '/../app/admin.php';

$token = require_admin();
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    csrf_check($token);
    admin_logout();
}
header('Location: login.php');
