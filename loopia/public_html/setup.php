<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/schema.php';
require __DIR__ . '/app/admin.php';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$error = '';
$done = false;

try {
    db();
} catch (Throwable $e) {
    $error = 'Kunde inte ansluta till databasen. Kontrollera db_host, db_name, db_user och db_pass i app/config.php.';
}

$installed = $error === '' && is_installed();
$setupKey = (string) cfg('setup_key', '');

if ($error === '' && !$installed && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $key = (string) ($_POST['setup_key'] ?? '');
    $pw = (string) ($_POST['password'] ?? '');
    $pw2 = (string) ($_POST['password2'] ?? '');
    if (strlen($setupKey) < 12) {
        $error = 'Fyll i setup_key i app/config.php först (minst 12 tecken).';
    } elseif (!hash_equals($setupKey, $key)) {
        $error = 'Fel installationsnyckel.';
        sleep(1);
    } elseif (strlen($pw) < 10) {
        $error = 'Lösenordet måste vara minst 10 tecken.';
    } elseif ($pw !== $pw2) {
        $error = 'Lösenorden är inte lika.';
    } else {
        krans_install_schema(db());
        if (setting('secret') === null) {
            set_setting('secret', bin2hex(random_bytes(32)));
        }
        set_setting('admin_password_hash', password_hash($pw, PASSWORD_DEFAULT));
        $done = true;
    }
}

admin_page_head('Installation – kransbokning');
?>
<header class="top"><b>Kransbokning</b></header>
<section class="section narrow">
  <h1>Installation</h1>
  <?php if ($done): ?>
    <p class="flash" style="margin:16px 0 0">Klart. Databasen är skapad och lösenordet sparat.</p>
    <p style="margin-top:16px"><a class="btn" href="admin/">Öppna admin</a></p>
    <p class="small" style="margin-top:12px">Ta gärna bort setup.php från servern nu. Den går inte att köra igen, men behövs inte längre.</p>
  <?php elseif ($installed): ?>
    <p style="margin-top:10px">Installationen är redan gjord.</p>
    <p style="margin-top:16px"><a class="btn" href="admin/">Öppna admin</a></p>
  <?php else: ?>
    <p class="small" style="margin-top:4px">Skapar databastabellerna och Lindas lösenord till admin.</p>
    <?php if ($error !== ''): ?><p class="flash err" style="margin:16px 0 0"><?= h($error) ?></p><?php endif; ?>
    <form method="post" class="card pad" autocomplete="off">
      <div class="field"><label for="k">Installationsnyckel (setup_key i config.php)</label><input id="k" name="setup_key" type="password" required></div>
      <div class="field"><label for="p">Välj lösenord till admin (minst 10 tecken)</label><input id="p" name="password" type="password" minlength="10" autocomplete="new-password" required></div>
      <div class="field"><label for="p2">Upprepa lösenordet</label><input id="p2" name="password2" type="password" minlength="10" autocomplete="new-password" required></div>
      <div class="field"><button class="btn" type="submit">Installera</button></div>
    </form>
  <?php endif; ?>
</section>
<?php admin_page_foot();
