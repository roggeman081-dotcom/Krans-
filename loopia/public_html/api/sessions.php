<?php
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';
api_start();

$out = [];
foreach (sessions_with_counts(true) as $s) {
    $out[] = [
        'id'          => $s['id'],
        'label'       => $s['label'],
        'weekday'     => $s['weekday'],
        'day'         => $s['day'],
        'month_short' => $s['month_short'],
        'time'        => $s['time'],
        'price'       => $s['price'],
        'capacity'    => $s['capacity'],
        'left'        => $s['left'],
        'past'        => strtotime($s['starts_at']) < time(),
    ];
}
json_out(['ok' => true, 'sessions' => $out]);
