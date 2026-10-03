<?php
declare(strict_types=1);

date_default_timezone_set('Europe/Stockholm');
mb_internal_encoding('UTF-8');

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Konfiguration saknas: kopiera app/config.example.php till app/config.php och fyll i uppgifterna.');
}
$GLOBALS['KRANS_CONFIG'] = require $configFile;

const T_SESSIONS = 'krans_sessions';
const T_BOOKINGS = 'krans_bookings';
const T_EVENTS   = 'krans_events';
const T_SETTINGS = 'krans_settings';
const T_TOKENS   = 'krans_admin_tokens';
const T_ATTEMPTS = 'krans_login_attempts';

const BOOKING_STATUSES = ['ny' => 'Ny', 'bekraftad' => 'Bekräftad', 'avbokad' => 'Avbokad'];
const PAYMENT_STATUSES = ['obetald' => 'Obetald', 'betald' => 'Betald', 'aterbetald' => 'Återbetald'];

function cfg(string $key, $default = null)
{
    return $GLOBALS['KRANS_CONFIG'][$key] ?? $default;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            cfg('db_host'),
            (int) cfg('db_port', 3306),
            cfg('db_name')
        );
        $pdo = new PDO($dsn, (string) cfg('db_user'), (string) cfg('db_pass'), [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function h($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function money(int $amount): string
{
    return number_format($amount, 0, ',', "\u{00A0}") . "\u{00A0}kr";
}

function setting(string $name): ?string
{
    static $cache = [];
    if (!array_key_exists($name, $cache)) {
        try {
            $st = db()->prepare('SELECT value FROM ' . T_SETTINGS . ' WHERE name = ?');
            $st->execute([$name]);
            $value = $st->fetchColumn();
            $cache[$name] = $value === false ? null : (string) $value;
        } catch (PDOException $e) {
            return null; // tabellen finns inte än (före installation)
        }
    }
    return $cache[$name];
}

function set_setting(string $name, string $value): void
{
    $st = db()->prepare('INSERT INTO ' . T_SETTINGS . ' (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)');
    $st->execute([$name, $value]);
}

function is_installed(): bool
{
    return setting('admin_password_hash') !== null && setting('secret') !== null;
}

function secret(): string
{
    $secret = setting('secret');
    if ($secret === null) {
        throw new RuntimeException('Inte installerat.');
    }
    return $secret;
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443);
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

/** Anonymt besökar-id utan cookie. Byts varje dygn och går inte att räkna tillbaka till en IP-adress. */
function visitor_id(): string
{
    $raw = date('Y-m-d') . '|' . client_ip() . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|' . secret();
    return substr(hash('sha256', $raw), 0, 16);
}

function ip_key(): string
{
    return substr(hash('sha256', client_ip() . '|' . secret()), 0, 16);
}

function is_bot(): bool
{
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    return $ua === '' || preg_match('/bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python|headless/i', $ua) === 1;
}

/** Delar av ett pass i klartext, t.ex. "Lördag 14 november kl. 13.00–16.00". */
function session_parts(array $row): array
{
    static $days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    static $months = [1 => 'januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    $start = new DateTimeImmutable($row['starts_at']);
    $end = new DateTimeImmutable($row['ends_at']);
    $weekday = $days[(int) $start->format('w')];
    $month = $months[(int) $start->format('n')];
    $time = $start->format('H.i') . '–' . $end->format('H.i');
    return [
        'weekday'     => $weekday,
        'day'         => (int) $start->format('j'),
        'month'       => $month,
        'month_short' => mb_substr($month, 0, 3),
        'time'        => $time,
        'label'       => sprintf('%s %d %s kl. %s', $weekday, (int) $start->format('j'), $month, $time),
    ];
}

/** Alla pass med antal bokade personer (avbokade räknas inte). */
function sessions_with_counts(bool $onlyActive = true): array
{
    $sql = 'SELECT s.id, s.starts_at, s.ends_at, s.capacity, s.price, s.active,
                   COALESCE(SUM(CASE WHEN b.status <> \'avbokad\' THEN b.persons ELSE 0 END), 0) AS booked,
                   COALESCE(SUM(CASE WHEN b.status <> \'avbokad\' THEN 1 ELSE 0 END), 0) AS bookings,
                   COALESCE(SUM(CASE WHEN b.status <> \'avbokad\' THEN b.amount ELSE 0 END), 0) AS amount
            FROM ' . T_SESSIONS . ' s
            LEFT JOIN ' . T_BOOKINGS . ' b ON b.session_id = s.id'
        . ($onlyActive ? ' WHERE s.active = 1' : '') . '
            GROUP BY s.id, s.starts_at, s.ends_at, s.capacity, s.price, s.active
            ORDER BY s.starts_at';
    $rows = db()->query($sql)->fetchAll();
    foreach ($rows as &$row) {
        foreach (['id', 'capacity', 'price', 'active', 'booked', 'bookings', 'amount'] as $k) {
            $row[$k] = (int) $row[$k];
        }
        $row['left'] = max(0, $row['capacity'] - $row['booked']);
        $row += session_parts($row);
    }
    return $rows;
}

function json_out(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** CORS för API:t: bara de sidor som står i config får anropa från en annan domän. */
function api_cors(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $allowed = in_array($origin, (array) cfg('allowed_origins', []), true);
    $sameSite = $origin !== '' && parse_url($origin, PHP_URL_HOST) === explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0];
    if ($origin !== '' && !$allowed && !$sameSite) {
        json_out(['ok' => false, 'error' => 'origin'], 403); // anrop från en främmande webbplats
    }
    if ($allowed) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Max-Age: 600');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function api_start(): void
{
    api_cors();
    set_exception_handler(function (Throwable $e): void {
        error_log('krans api: ' . $e->getMessage());
        json_out(['ok' => false, 'error' => 'server', 'message' => 'Något gick fel. Försök igen om en stund.'], 500);
    });
    if (!is_installed()) {
        json_out(['ok' => false, 'error' => 'not_installed', 'message' => 'Bokningen är inte aktiverad än.'], 503);
    }
}

function request_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode((string) $raw, true);
    return is_array($data) ? $data : $_POST;
}
