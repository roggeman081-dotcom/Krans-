<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
require __DIR__ . '/../app/mail.php';
api_start();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['ok' => false, 'error' => 'method'], 405);
}

$in = request_body();
$fail = fn (string $msg, string $code = 'invalid', int $http = 422, array $extra = []) =>
    json_out(['ok' => false, 'error' => $code, 'message' => $msg] + $extra, $http);

// Dolt fält som bara robotar fyller i.
if (trim((string) ($in['website'] ?? '')) !== '') {
    $fail('Bokningen kunde inte skickas.', 'spam', 400);
}

$sessionId = (int) ($in['session_id'] ?? 0);
$name    = trim(preg_replace('/\s+/u', ' ', (string) ($in['name'] ?? '')));
$phone   = trim((string) ($in['phone'] ?? ''));
$email   = trim((string) ($in['email'] ?? ''));
$persons = (int) ($in['persons'] ?? 0);
$message = trim((string) ($in['message'] ?? ''));

if ($sessionId < 1) {
    $fail('Välj ett tillfälle först.');
}
if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
    $fail('Fyll i ditt namn.');
}
$digits = preg_replace('/\D+/', '', $phone);
if (strlen($digits) < 7 || strlen($digits) > 15 || !preg_match('/^[0-9+\-\s()]+$/', $phone)) {
    $fail('Fyll i ett giltigt mobilnummer.');
}
if (mb_strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $fail('Fyll i en giltig e-postadress.');
}
if ($persons < 1 || $persons > 10) {
    $fail('Välj antal personer, 1–10.');
}
if (mb_strlen($message) > 1000) {
    $fail('Meddelandet är för långt (max 1000 tecken).');
}

$db = db();
$visitor = visitor_id();

// Spärr mot missbruk: högst 5 bokningar per besökare och timme.
$st = $db->prepare('SELECT COUNT(*) FROM ' . T_BOOKINGS . ' WHERE visitor = ? AND created_at >= ?');
$st->execute([$visitor, date('Y-m-d H:i:s', time() - 3600)]);
if ((int) $st->fetchColumn() >= 5) {
    $fail('För många bokningar på kort tid. Försök igen senare eller kontakta oss.', 'rate', 429);
}

/*
 * Atomär platsräkning: raden för passet låses med FOR UPDATE.
 * Två samtidiga bokningar på samma pass behandlas då en i taget,
 * så den andra ser alltid den förstas platser som upptagna.
 */
$db->beginTransaction();
try {
    $st = $db->prepare('SELECT * FROM ' . T_SESSIONS . ' WHERE id = ? AND active = 1 FOR UPDATE');
    $st->execute([$sessionId]);
    $session = $st->fetch();
    if (!$session) {
        $db->rollBack();
        $fail('Tillfället finns inte längre.', 'gone', 404);
    }
    if (strtotime($session['starts_at']) < time()) {
        $db->rollBack();
        $fail('Det tillfället har redan varit.', 'past', 410);
    }

    $st = $db->prepare('SELECT COALESCE(SUM(persons), 0) FROM ' . T_BOOKINGS . ' WHERE session_id = ? AND status <> \'avbokad\'');
    $st->execute([$sessionId]);
    $left = (int) $session['capacity'] - (int) $st->fetchColumn();

    if ($persons > $left) {
        $db->rollBack();
        $msg = $left <= 0
            ? 'Det tillfället är tyvärr fullbokat.'
            : sprintf('Det finns bara %d %s kvar på det tillfället.', $left, $left === 1 ? 'plats' : 'platser');
        $fail($msg, 'full', 409, ['left' => max(0, $left)]);
    }

    $amount = $persons * (int) $session['price'];
    $created = now();
    $ins = $db->prepare('INSERT INTO ' . T_BOOKINGS . '
        (ref, session_id, name, phone, email, persons, message, amount, visitor, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $ref = '';
    for ($try = 0; $try < 5; $try++) {
        $ref = 'K';
        $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        for ($i = 0; $i < 6; $i++) {
            $ref .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        try {
            $ins->execute([$ref, $sessionId, $name, $phone, $email, $persons, $message !== '' ? $message : null, $amount, $visitor, $created, $created]);
            break;
        } catch (PDOException $e) {
            if ($try === 4 || (int) ($e->errorInfo[1] ?? 0) !== 1062) {
                throw $e;
            }
        }
    }
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    throw $e;
}

$parts = session_parts($session);

try {
    $db->prepare('INSERT INTO ' . T_EVENTS . ' (type, session_id, visitor, created_at) VALUES (\'booking\', ?, ?, ?)')
       ->execute([$sessionId, $visitor, now()]);
    krans_mail_new_booking(
        ['ref' => $ref, 'name' => $name, 'phone' => $phone, 'email' => $email, 'persons' => $persons, 'amount' => $amount, 'message' => $message],
        $parts['label']
    );
} catch (Throwable $e) {
    error_log('krans efter bokning: ' . $e->getMessage()); // bokningen är redan sparad
}

json_out([
    'ok'      => true,
    'ref'     => $ref,
    'session' => $parts['label'],
    'persons' => $persons,
    'amount'  => $amount,
    'left'    => $left - $persons,
]);
