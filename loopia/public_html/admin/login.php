<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
require __DIR__ . '/../app/admin.php';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

if (!is_installed()) {
    header('Location: ../setup.php');
    exit;
}
if (admin_current() !== null) {
    header('Location: ./');
    exit;
}

$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (login_blocked()) {
        $error = 'För många försök. Vänta en kvart och försök igen.';
    } elseif (password_verify((string) ($_POST['password'] ?? ''), (string) setting('admin_password_hash'))) {
        admin_login();
        header('Location: ./');
        exit;
    } else {
        login_failed();
        $error = 'Fel lösenord.';
    }
}

admin_page_head('Logga in – kransbokning');
?>
<header class="top"><b>Kransbokning</b></header>
<section class="section narrow">
  <h1>Logga in</h1>
  <?php if ($error !== ''): ?><p class="flash err" style="margin:16px 0 0"><?= h($error) ?></p><?php endif; ?>
  <form method="post" class="card pad">
    <div class="field"><label for="p">Lösenord</label><input id="p" name="password" type="password" autocomplete="current-password" required autofocus></div>
    <div class="field"><button class="btn" type="submit">Logga in</button></div>
  </form>
  <p class="small" style="margin-top:12px">Du förblir inloggad på den här enheten i 30 dagar.</p>
</section>
<?php admin_page_foot();
