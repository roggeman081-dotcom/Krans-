<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
require __DIR__ . '/../app/mail.php';
api_start();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['ok' => false, 'error' => 'method'], 405);
}
$in = request_body();
$fail = fn (string $msg, string $code = 'invalid', int $http = 422) =>
    json_out(['ok' => false, 'error' => $code, 'message' => $msg], $http);

if (trim((string) ($in['website'] ?? '')) !== '') {
    $fail('Meddelandet kunde inte skickas.', 'spam', 400);
}
$name    = trim(preg_replace('/\s+/u', ' ', (string) ($in['name'] ?? '')));
$email   = trim((string) ($in['email'] ?? ''));
$message = trim((string) ($in['message'] ?? ''));

if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
    $fail('Fyll i ditt namn.');
}
if (mb_strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $fail('Fyll i en giltig e-postadress, så att vi kan svara.');
}
if (mb_strlen($message) < 5) {
    $fail('Skriv ditt meddelande.');
}
if (mb_strlen($message) > 2000) {
    $fail('Meddelandet är för långt (max 2000 tecken).');
}

$db = db();
$visitor = visitor_id();
$st = $db->prepare('SELECT COUNT(*) FROM ' . T_MESSAGES . ' WHERE visitor = ? AND created_at >= ?');
$st->execute([$visitor, date('Y-m-d H:i:s', time() - 3600)]);
if ((int) $st->fetchColumn() >= 3) {
    $fail('För många meddelanden på kort tid. Försök igen senare.', 'rate', 429);
}

$created = now();
$db->prepare('INSERT INTO ' . T_MESSAGES . ' (name, email, message, visitor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
   ->execute([$name, $email, $message, $visitor, $created, $created]);

try {
    krans_mail_contact($name, $email, $message);
} catch (Throwable $e) {
    error_log('krans kontakt: ' . $e->getMessage()); // meddelandet är redan sparat
}
json_out(['ok' => true]);
