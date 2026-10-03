<?php
// Kopiera den här filen till config.php och fyll i uppgifterna från Loopia Kundzon.
// config.php ska ALDRIG läggas i GitHub.
return [
    // Databas (Loopia Kundzon > Databaser)
    'db_host' => 'mysqlXXX.loopia.se',
    'db_port' => 3306,
    'db_name' => '',
    'db_user' => '',
    'db_pass' => '',

    // Engångsnyckel för installationen (setup.php). Välj själv, minst 12 tecken.
    'setup_key' => '',

    // Sidor som får skicka bokningar till API:t.
    'allowed_origins' => [
        'https://krans.liroelteknik.se',
        'https://roggeman081-dotcom.github.io',
    ],

    // E-post. Sätt mail_enabled till true när avsändaradressen finns hos Loopia.
    'mail_enabled'   => false,
    'mail_from'      => 'bokning@liroelteknik.se',
    'mail_from_name' => 'Kransbindning på Olsgård',
    // Fyll i för att Linda ska få ett mejl vid varje ny bokning (kräver mail_enabled).
    'notify_email'   => '',
];
