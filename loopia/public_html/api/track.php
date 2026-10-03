<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
api_start();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || is_bot()) {
    json_out(['ok' => true]);
}
$in = request_body();
$type = (string) ($in['type'] ?? '');
if (!in_array($type, ['visit', 'date_click'], true)) {
    json_out(['ok' => false], 400);
}
$sessionId = $type === 'date_click' ? (int) ($in['session_id'] ?? 0) : 0;
$visitor = visitor_id();

$db = db();
// Tak per besökare och dygn så att ingen kan fylla tabellen.
$st = $db->prepare('SELECT COUNT(*) FROM ' . T_EVENTS . ' WHERE visitor = ? AND created_at >= ?');
$st->execute([$visitor, date('Y-m-d 00:00:00')]);
if ((int) $st->fetchColumn() < 200) {
    if ($sessionId > 0) {
        $chk = $db->prepare('SELECT 1 FROM ' . T_SESSIONS . ' WHERE id = ?');
        $chk->execute([$sessionId]);
        if (!$chk->fetchColumn()) {
            json_out(['ok' => false], 400);
        }
    }
    $ins = $db->prepare('INSERT INTO ' . T_EVENTS . ' (type, session_id, visitor, created_at) VALUES (?, ?, ?, ?)');
    $ins->execute([$type, $sessionId ?: null, $visitor, now()]);
}
json_out(['ok' => true]);
