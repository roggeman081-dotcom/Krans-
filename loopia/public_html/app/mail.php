<?php
declare(strict_types=1);

/**
 * E-post är förberett men avstängt tills 'mail_enabled' => true i config.php.
 * Avsändaradressen (mail_from) måste finnas som e-postkonto hos Loopia.
 */
function krans_send_mail(string $to, string $subject, string $body): bool
{
    if (!cfg('mail_enabled', false)) {
        return false;
    }
    $from = (string) cfg('mail_from', '');
    if ($from === '' || !filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $fromName = mb_encode_mimeheader((string) cfg('mail_from_name', 'Kransbindning'), 'UTF-8', 'B');
    $headers = [
        'From: ' . $fromName . ' <' . $from . '>',
        'Reply-To: ' . $from,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    return @mail($to, mb_encode_mimeheader($subject, 'UTF-8', 'B'), $body, implode("\r\n", $headers), '-f' . $from);
}

/** Bekräftelse till kunden och, om notify_email är ifylld, ett meddelande till Linda. */
function krans_mail_new_booking(array $booking, string $sessionLabel): void
{
    $lines = [
        'Hej ' . $booking['name'] . '!',
        '',
        'Tack för din bokningsförfrågan till kransbindning på Olsgård.',
        '',
        'Bokningsnummer: ' . $booking['ref'],
        'Tillfälle: ' . $sessionLabel,
        'Antal personer: ' . $booking['persons'],
        'Belopp: ' . $booking['amount'] . ' kr',
        '',
        'Vi hör av oss med bekräftelse.',
        '',
        'Varmt välkommen!',
    ];
    krans_send_mail($booking['email'], 'Din bokning – kransbindning på Olsgård', implode("\n", $lines));

    $notify = (string) cfg('notify_email', '');
    if ($notify !== '') {
        $admin = [
            'Ny bokning ' . $booking['ref'],
            '',
            $booking['name'] . ', ' . $booking['phone'] . ', ' . $booking['email'],
            $sessionLabel,
            $booking['persons'] . ' personer, ' . $booking['amount'] . ' kr',
            $booking['message'] !== '' ? 'Meddelande: ' . $booking['message'] : '',
        ];
        krans_send_mail($notify, 'Ny kransbokning: ' . $booking['name'], implode("\n", $admin));
    }
}
