# Kransbokning – backend och admin för Loopia

PHP + MariaDB/MySQL. Allt som ska upp på servern ligger i `public_html/`.

| Adress | Vad |
|---|---|
| `krans.liroelteknik.se/` | Bokningssidan (`index.html`) |
| `krans.liroelteknik.se/admin/` | Lindas adminsida (lösenord) |
| `krans.liroelteknik.se/api/` | API som bokningssidan anropar |
| `krans.liroelteknik.se/setup.php` | Engångsinstallation |

## Installation

1. **Underdomän.** Loopia Kundzon → domänen `liroelteknik.se` → lägg till underdomänen `krans`. Slå på HTTPS (SSL) för den.
2. **Databas.** Loopia Kundzon → Databaser → skapa en MariaDB/MySQL-databas och en databasanvändare. Notera server, databasnamn, användare och lösenord.
3. **Ladda upp.** Lägg innehållet i `public_html/` i underdomänens `public_html`-mapp (FTP/SFTP eller filhanteraren). Även de dolda `.htaccess`-filerna ska med.
4. **Konfigurera.** På servern: kopiera `app/config.example.php` till `app/config.php`. Fyll i databasuppgifterna och välj en egen `setup_key` (minst 12 tecken).
5. **Installera.** Öppna `https://krans.liroelteknik.se/setup.php`. Ange `setup_key` och välj Lindas lösenord (minst 10 tecken). Tabellerna och de fyra passen skapas.
6. **Klart.** Admin finns på `https://krans.liroelteknik.se/admin/`. Ta bort `setup.php` från servern.

Kontroll: `https://krans.liroelteknik.se/app/config.php` ska ge "Forbidden". Gör den inte det läses inte `.htaccess` – hör av dig innan sidan används skarpt.

## Så fungerar det

- **Platsräkning.** Vid bokning låses passets rad (`SELECT … FOR UPDATE`) i en transaktion. Samtidiga bokningar på samma pass hanteras en i taget, så det går inte att boka fler än `capacity` (10). Avbokade bokningar frigör sina platser.
- **Admin.** Inloggning med lösenord, giltig 30 dagar per enhet. Fem felaktiga försök ger en kvarts spärr. Sidan laddar om sig själv när en ny bokning kommer in.
- **Statistik.** Besök och datumklick räknas utan cookies. Besökar-id är en dygnsvis hash som inte går att räkna tillbaka till en IP-adress.
- **E-post.** Förberett i `app/mail.php`. Sätt `'mail_enabled' => true` i `config.php` när avsändaradressen finns som e-postkonto hos Loopia. `notify_email` ger Linda ett mejl per bokning.
- **Kontaktformulär.** Meddelanden från bokningssidan sparas i databasen och visas under Meddelanden i admin. Lindas e-postadress finns aldrig på sidan. Med `mail_enabled` och `notify_email` får hon dem även som mejl.
- **Skydd.** Dolt robotfält, högst 5 bokningar per besökare och timme, API:t tar bara emot anrop från sidorna i `allowed_origins`.

## Ändra pass, pris eller antal platser

Görs i tabellen `krans_sessions` (phpMyAdmin i Loopia Kundzon): `starts_at`, `ends_at`, `capacity`, `price`, `active`.

## Utveckling

`public_html/index.html` byggs från `site/boka.html` med `python3 loopia/tools/build_index.py`. Ändra designen i `site/boka.html` och bokningslogiken i `tools/boka.js`.

## Uppdatera

Ladda upp filerna i `public_html/` igen. `app/config.php` berörs inte, och nya tabeller skapas automatiskt vid nästa sidvisning.
