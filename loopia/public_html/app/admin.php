<?php
declare(strict_types=1);

const ADMIN_COOKIE = 'krans_admin';
const ADMIN_DAYS = 30;

function admin_cookie_options(int $expires): array
{
    return ['expires' => $expires, 'path' => '/admin', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax'];
}

/** Giltig inloggning? Returnerar inloggningsnyckeln, annars null. */
function admin_current(): ?string
{
    $token = (string) ($_COOKIE[ADMIN_COOKIE] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }
    $st = db()->prepare('SELECT 1 FROM ' . T_TOKENS . ' WHERE token_hash = ? AND expires_at > ?');
    $st->execute([hash('sha256', $token), now()]);
    return $st->fetchColumn() ? $token : null;
}

function require_admin(): string
{
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
    header('X-Frame-Options: DENY');
    if (!is_installed()) {
        header('Location: ../setup.php');
        exit;
    }
    $token = admin_current();
    if ($token === null) {
        header('Location: login.php');
        exit;
    }
    return $token;
}

function admin_login(): void
{
    $token = bin2hex(random_bytes(32));
    $expires = time() + ADMIN_DAYS * 86400;
    $db = db();
    $db->prepare('DELETE FROM ' . T_TOKENS . ' WHERE expires_at < ?')->execute([now()]);
    $db->prepare('INSERT INTO ' . T_TOKENS . ' (token_hash, created_at, expires_at) VALUES (?, ?, ?)')
       ->execute([hash('sha256', $token), now(), date('Y-m-d H:i:s', $expires)]);
    setcookie(ADMIN_COOKIE, $token, admin_cookie_options($expires));
}

function admin_logout(): void
{
    $token = (string) ($_COOKIE[ADMIN_COOKIE] ?? '');
    if ($token !== '') {
        db()->prepare('DELETE FROM ' . T_TOKENS . ' WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    }
    setcookie(ADMIN_COOKIE, '', admin_cookie_options(time() - 3600));
}

function csrf_token(string $token): string
{
    return hash_hmac('sha256', 'csrf|' . $token, secret());
}

function csrf_check(string $token): void
{
    if (!hash_equals(csrf_token($token), (string) ($_POST['csrf'] ?? ''))) {
        http_response_code(400);
        exit('Ogiltig begäran. Ladda om sidan och försök igen.');
    }
}

/** Högst 5 felaktiga lösenord per kvart och adress. */
function login_blocked(): bool
{
    $st = db()->prepare('SELECT COUNT(*) FROM ' . T_ATTEMPTS . ' WHERE ip_key = ? AND created_at > ?');
    $st->execute([ip_key(), date('Y-m-d H:i:s', time() - 900)]);
    return (int) $st->fetchColumn() >= 5;
}

function login_failed(): void
{
    $db = db();
    $db->prepare('INSERT INTO ' . T_ATTEMPTS . ' (ip_key, created_at) VALUES (?, ?)')->execute([ip_key(), now()]);
    $db->prepare('DELETE FROM ' . T_ATTEMPTS . ' WHERE created_at < ?')->execute([date('Y-m-d H:i:s', time() - 86400)]);
}

function phone_link(string $phone): string
{
    $clean = preg_replace('/[^0-9+]/', '', $phone);
    return (string) preg_replace('/(?!^)\+/', '', $clean);
}

/** Gemensam sidmall för admin, inloggning och installation. */
function admin_page_head(string $title): void
{
    ?><!doctype html>
<html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f3eee4">
<title><?= h($title) ?></title>
<style>
:root{--ink:#28251f;--body:#4f4a43;--muted:#7a7368;--olive:#56634c;--olive2:#3d4936;--cream:#f3eee4;--paper:#fbf8f1;--line:#ddd3c4;--tint:#edf2e8;--warn:#8a3b2a;--warnbg:#f6e7e1;--serif:Georgia,"Times New Roman",serif;--r:14px;--r2:10px}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--body);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.page{max-width:720px;margin:auto;min-height:100vh;padding-bottom:env(safe-area-inset-bottom)}
.top{height:54px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:20;background:#fbf8f2f2;border-bottom:1px solid var(--line)}
.top b{font-family:var(--serif);font-weight:500;color:var(--ink)}
.top a{color:var(--olive2);font-size:13px;font-weight:700;text-decoration:none}
h1,h2{font-family:var(--serif);font-weight:500;color:var(--ink);margin:0}
h1{font-size:26px;line-height:1.2}
h2{font-size:26px;line-height:1.2}
p{margin:0}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.small{font-size:13px;color:var(--muted)}
.section{padding:28px 20px}
.section+.section{border-top:1px solid var(--line)}
.card{margin-top:16px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.pad{padding:18px}
.kpis{display:grid;grid-template-columns:repeat(3,1fr)}
.kpis div{padding:14px 12px;text-align:center}
.kpis div+div{border-left:1px solid var(--line)}
.kpis strong{display:block;font-family:var(--serif);font-weight:500;font-size:26px;line-height:1.15;color:var(--ink);white-space:nowrap}
.row{display:block;padding:14px 16px;color:inherit;text-decoration:none}
.row+.row{border-top:1px solid var(--line)}
.row.on{background:var(--tint)}
.row-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.row-head b{color:var(--ink)}
.row-head span{font-size:13px;font-weight:700;color:var(--olive2);white-space:nowrap}
.row-head span.full{color:var(--warn)}
.bar{height:6px;margin-top:9px;border-radius:3px;background:#e9e1d3;overflow:hidden}
.bar i{display:block;height:100%;background:var(--olive)}
.booking{padding:16px}
.booking+.booking{border-top:1px solid var(--line)}
.booking.off .who,.booking.off .what{opacity:.5}
.who{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.who b{color:var(--ink)}
.who span{font-size:13px;color:var(--muted);white-space:nowrap}
.what{margin-top:2px;color:var(--ink)}
.contact{margin-top:8px;font-size:13px;color:var(--muted);overflow-wrap:anywhere}
.contact a{color:var(--olive2)}
.msg{margin-top:10px;padding:10px 12px;border-radius:var(--r2);background:var(--cream);color:var(--ink);font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.btn{display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:var(--r2);background:var(--olive);color:#fff;font:inherit;font-weight:700;text-decoration:none;border:0;cursor:pointer;width:100%}
.btn.ghost{background:transparent;color:var(--olive2);border:1px solid var(--line)}
.states{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
label{display:block;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 4px}
input,select{width:100%;font:inherit;min-height:44px;padding:9px 12px;border:1px solid var(--line);border-radius:var(--r2);background:#fffdfa;color:var(--ink)}
input:focus,select:focus{outline:2px solid var(--olive);outline-offset:1px}
.field+.field{margin-top:14px}
.field label{font-size:13px;letter-spacing:0;text-transform:none;color:var(--ink)}
.flash{margin:16px 20px 0;padding:12px 14px;border-radius:var(--r2);background:var(--tint);color:var(--ink)}
.flash.err{background:var(--warnbg);color:var(--warn)}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:10px 8px;text-align:right;border-top:1px solid var(--line)}
th{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-top:0}
th:first-child,td:first-child{text-align:left;padding-left:16px;color:var(--ink);white-space:nowrap}th{white-space:nowrap}
th:last-child,td:last-child{padding-right:16px}
.empty{padding:22px 16px;color:var(--muted)}
.narrow{max-width:420px;margin:auto}
@media(min-width:640px){.section{padding:36px 32px}.top{padding:0 32px}.flash{margin:20px 32px 0}}
</style></head><body><div class="page">
<?php
}

function admin_page_foot(): void
{
    echo '</div></body></html>';
}
