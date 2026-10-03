<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
require __DIR__ . '/../app/admin.php';

$token = require_admin();
$db = db();
$passFilter = (int) ($_GET['pass'] ?? 0);
$self = 'index.php' . ($passFilter ? '?pass=' . $passFilter : '');

/* ---- Ändra bokningsstatus / betalstatus ---- */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    csrf_check($token);
    $id = (int) ($_POST['id'] ?? 0);
    $status = (string) ($_POST['status'] ?? '');
    $payment = (string) ($_POST['payment_status'] ?? '');
    $msg = 'sparat';
    if ($id > 0 && isset(BOOKING_STATUSES[$status], PAYMENT_STATUSES[$payment])) {
        $db->beginTransaction();
        try {
            $st = $db->prepare('SELECT session_id FROM ' . T_BOOKINGS . ' WHERE id = ?');
            $st->execute([$id]);
            $sessionId = (int) $st->fetchColumn();
            // Samma lås som vid kundbokning, så att en återaktiverad bokning inte kan överboka passet.
            $st = $db->prepare('SELECT capacity FROM ' . T_SESSIONS . ' WHERE id = ? FOR UPDATE');
            $st->execute([$sessionId]);
            $capacity = (int) $st->fetchColumn();
            $st = $db->prepare('SELECT status, persons FROM ' . T_BOOKINGS . ' WHERE id = ?');
            $st->execute([$id]);
            $booking = $st->fetch();
            $ok = (bool) $booking;
            if ($ok && $booking['status'] === 'avbokad' && $status !== 'avbokad') {
                $st = $db->prepare('SELECT COALESCE(SUM(persons), 0) FROM ' . T_BOOKINGS . ' WHERE session_id = ? AND status <> \'avbokad\'');
                $st->execute([$sessionId]);
                if ((int) $st->fetchColumn() + (int) $booking['persons'] > $capacity) {
                    $ok = false;
                    $msg = 'fullt';
                }
            }
            if ($ok) {
                $db->prepare('UPDATE ' . T_BOOKINGS . ' SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?')
                   ->execute([$status, $payment, now(), $id]);
            }
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    } else {
        $msg = 'fel';
    }
    header('Location: ' . $self . ($passFilter ? '&' : '?') . 'msg=' . $msg . '#b' . $id);
    exit;
}

/* ---- Data ---- */
$sessions = sessions_with_counts(false);
$sessionById = array_column($sessions, null, 'id');
$totalBookings = array_sum(array_column($sessions, 'bookings'));
$totalPersons = array_sum(array_column($sessions, 'booked'));
$totalAmount = array_sum(array_column($sessions, 'amount'));
$paid = (int) $db->query('SELECT COALESCE(SUM(amount), 0) FROM ' . T_BOOKINGS . ' WHERE payment_status = \'betald\' AND status <> \'avbokad\'')->fetchColumn();

$sql = 'SELECT * FROM ' . T_BOOKINGS . ($passFilter ? ' WHERE session_id = ?' : '') . ' ORDER BY created_at DESC, id DESC';
$st = $db->prepare($sql);
$st->execute($passFilter ? [$passFilter] : []);
$bookings = $st->fetchAll();

$visits = $db->query('SELECT COUNT(*) AS total, COUNT(DISTINCT visitor) AS uniq,
        COALESCE(SUM(created_at >= CURDATE()), 0) AS today
    FROM ' . T_EVENTS . ' WHERE type = \'visit\'')->fetch();
$sent = (int) $db->query('SELECT COUNT(*) FROM ' . T_BOOKINGS)->fetchColumn();
$interest = $db->query('SELECT s.id,
        (SELECT COUNT(*) FROM ' . T_EVENTS . ' e WHERE e.type = \'date_click\' AND e.session_id = s.id) AS clicks,
        (SELECT COUNT(DISTINCT e.visitor) FROM ' . T_EVENTS . ' e WHERE e.type = \'date_click\' AND e.session_id = s.id
            AND NOT EXISTS (SELECT 1 FROM ' . T_BOOKINGS . ' b WHERE b.session_id = s.id AND b.visitor = e.visitor)) AS no_booking,
        (SELECT COUNT(*) FROM ' . T_BOOKINGS . ' b WHERE b.session_id = s.id) AS sent
    FROM ' . T_SESSIONS . ' s ORDER BY clicks DESC, s.starts_at')->fetchAll();

$sig = $db->query('SELECT COUNT(*) AS n, COALESCE(MAX(updated_at), \'\') AS u FROM ' . T_BOOKINGS)->fetch();
$flash = ['sparat' => ['Sparat.', ''], 'fullt' => ['Passet är fullt – bokningen kan inte aktiveras igen.', 'err'], 'fel' => ['Kunde inte spara.', 'err']][$_GET['msg'] ?? ''] ?? null;

$short = fn (array $s): string => mb_substr($s['weekday'], 0, 3) . ' ' . date('j/n', strtotime($s['starts_at'])) . ' ' . mb_substr($s['time'], 0, 5);

admin_page_head('Admin – kransbokning');
?>
<header class="top"><b>Kransbokning</b>
  <form method="post" action="logout.php"><input type="hidden" name="csrf" value="<?= h(csrf_token($token)) ?>"><button style="all:unset;cursor:pointer;color:var(--olive2);font-size:13px;font-weight:700">Logga ut</button></form>
</header>
<?php if ($flash): ?><p class="flash <?= $flash[1] ?>"><?= h($flash[0]) ?></p><?php endif; ?>

<section class="section">
  <h1>Översikt</h1>
  <p class="small">Avbokade räknas inte. Sidan uppdateras automatiskt.</p>
  <div class="card kpis">
    <div><strong><?= $totalBookings ?></strong><span class="eyebrow">Bokningar</span></div>
    <div><strong><?= $totalPersons ?></strong><span class="eyebrow">Personer</span></div>
    <div><strong><?= h(money($totalAmount)) ?></strong><span class="eyebrow">Försäljning</span></div>
  </div>
  <p class="small" style="margin-top:10px">Varav betalt: <?= h(money($paid)) ?></p>
</section>

<section class="section">
  <h2>Pass</h2>
  <p class="small">Tryck på ett pass för att bara se dess bokningar.</p>
  <div class="card">
    <?php foreach ($sessions as $s): $pct = $s['capacity'] ? min(100, (int) round($s['booked'] / $s['capacity'] * 100)) : 0; ?>
    <a class="row<?= $passFilter === $s['id'] ? ' on' : '' ?>" href="<?= $passFilter === $s['id'] ? './' : '?pass=' . $s['id'] ?>#bokningar">
      <div class="row-head"><b><?= h($s['weekday'] . ' ' . $s['day'] . ' ' . $s['month']) ?></b><span class="<?= $s['left'] === 0 ? 'full' : '' ?>"><?= $s['left'] === 0 ? 'Fullt' : $s['left'] . ' lediga' ?></span></div>
      <div class="small">kl. <?= h($s['time']) ?> · <?= $s['booked'] ?> av <?= $s['capacity'] ?> bokade · <?= $s['bookings'] ?> <?= $s['bookings'] === 1 ? 'bokning' : 'bokningar' ?></div>
      <div class="bar"><i style="width:<?= $pct ?>%"></i></div>
    </a>
    <?php endforeach; ?>
  </div>
</section>

<section class="section" id="bokningar">
  <h2>Bokningar</h2>
  <p class="small"><?= $passFilter && isset($sessionById[$passFilter]) ? h($sessionById[$passFilter]['label']) . ' · <a href="./#bokningar" style="color:var(--olive2)">Visa alla</a>' : 'Senaste först.' ?></p>
  <div class="card">
    <?php if (!$bookings): ?><p class="empty">Inga bokningar än.</p><?php endif; ?>
    <?php foreach ($bookings as $b): $s = $sessionById[(int) $b['session_id']] ?? null; $tel = phone_link($b['phone']); ?>
    <article class="booking<?= $b['status'] === 'avbokad' ? ' off' : '' ?>" id="b<?= (int) $b['id'] ?>">
      <div class="who"><b><?= h($b['name']) ?></b><span><?= h($b['ref']) ?></span></div>
      <div class="what"><?= (int) $b['persons'] ?> <?= (int) $b['persons'] === 1 ? 'person' : 'personer' ?> · <?= h(money((int) $b['amount'])) ?></div>
      <div class="what"><?= $s ? h($s['label']) : 'Okänt pass' ?></div>
      <div class="contact"><a href="tel:<?= h($tel) ?>"><?= h($b['phone']) ?></a> · <a href="mailto:<?= h($b['email']) ?>"><?= h($b['email']) ?></a><br>Bokad <?= h(date('j/n \k\l. H.i', strtotime($b['created_at']))) ?></div>
      <?php if ((string) $b['message'] !== ''): ?><div class="msg"><?= h($b['message']) ?></div><?php endif; ?>
      <div class="actions">
        <a class="btn" href="tel:<?= h($tel) ?>">Ring kund</a>
        <a class="btn ghost" href="sms:<?= h($tel) ?>">SMS kund</a>
      </div>
      <form method="post" action="<?= h($self) ?>" class="states">
        <input type="hidden" name="csrf" value="<?= h(csrf_token($token)) ?>"><input type="hidden" name="id" value="<?= (int) $b['id'] ?>">
        <div><label for="s<?= (int) $b['id'] ?>">Bokning</label><select id="s<?= (int) $b['id'] ?>" name="status" onchange="this.form.submit()"><?php foreach (BOOKING_STATUSES as $k => $v): ?><option value="<?= $k ?>"<?= $b['status'] === $k ? ' selected' : '' ?>><?= h($v) ?></option><?php endforeach; ?></select></div>
        <div><label for="p<?= (int) $b['id'] ?>">Betalning</label><select id="p<?= (int) $b['id'] ?>" name="payment_status" onchange="this.form.submit()"><?php foreach (PAYMENT_STATUSES as $k => $v): ?><option value="<?= $k ?>"<?= $b['payment_status'] === $k ? ' selected' : '' ?>><?= h($v) ?></option><?php endforeach; ?></select></div>
        <noscript><button class="btn" type="submit">Spara</button></noscript>
      </form>
    </article>
    <?php endforeach; ?>
  </div>
</section>

<section class="section">
  <h2>Statistik</h2>
  <p class="small">Bokningssidan, sedan start.</p>
  <div class="card kpis">
    <div><strong><?= (int) $visits['total'] ?></strong><span class="eyebrow">Besök</span></div>
    <div><strong><?= (int) $visits['today'] ?></strong><span class="eyebrow">Idag</span></div>
    <div><strong><?= $sent ?></strong><span class="eyebrow">Skickade</span></div>
  </div>
  <p class="small" style="margin-top:10px"><?= (int) $visits['uniq'] ?> unika besökare (räknat per dag). Skickade bokningar inkluderar avbokade.</p>
  <div class="card">
    <table>
      <thead><tr><th>Pass</th><th>Klick</th><th>Bokn.</th><th>Ej bokat</th></tr></thead>
      <tbody>
      <?php foreach ($interest as $r): $s = $sessionById[(int) $r['id']]; ?>
        <tr><td><?= h($short($s)) ?></td><td><?= (int) $r['clicks'] ?></td><td><?= (int) $r['sent'] ?></td><td><?= (int) $r['no_booking'] ?></td></tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <p class="small" style="margin-top:10px">Sorterat efter flest klick. ”Ej bokat” = besökare som valt datumet utan att skicka en bokning på det.</p>
</section>

<script>
(function(){
  var sig = <?= json_encode($sig['n'] . '|' . $sig['u']) ?>;
  setInterval(function(){
    if (document.hidden) return;
    fetch('poll.php', {credentials:'same-origin', cache:'no-store'}).then(function(r){ return r.json(); }).then(function(d){
      if (!d.ok) { location.href = 'login.php'; return; }
      var a = document.activeElement;
      if (d.sig !== sig && !(a && a.tagName === 'SELECT')) {
        history.replaceState(null, '', location.pathname + (<?= $passFilter ?> ? '?pass=<?= $passFilter ?>' : ''));
        location.reload();
      }
    }).catch(function(){});
  }, 15000);
  if (location.search.indexOf('msg=') > -1) history.replaceState(null, '', location.pathname + (<?= $passFilter ?> ? '?pass=<?= $passFilter ?>' : '') + location.hash);
})();
</script>
<?php admin_page_foot();
