"""Bygger public_html/index.html från site/boka.html: samma design, men kopplad till API:t."""
import pathlib
root = pathlib.Path(__file__).resolve().parents[2]
s = (root / 'site/boka.html').read_text(encoding='utf-8')

def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:60], s.count(a))
    s = s.replace(a, b)

rep('https://roggeman081-dotcom.github.io/Krans-/krans720.jpg', 'https://krans.liroelteknik.se/krans720.jpg')
rep('.dates+.small{margin-top:10px}', '.date.full{cursor:default;opacity:.55}.date.full .pick{visibility:hidden}.dates .empty{padding:18px 16px;color:var(--muted)}.left{font-weight:700;color:var(--olive2)}.error{display:none;margin-top:14px;padding:12px 14px;border-radius:var(--r2);background:#f6e7e1;color:#8a3b2a}.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.submit:disabled{opacity:.6;cursor:default}')
a = s.index('<div class="dates">'); b = s.index('</section>', a)
s = s[:a] + '<div class="dates" id="dates" aria-live="polite"><p class="empty">Laddar tillfällen…</p></div>' + s[b:]
rep('<input type="hidden" id="chosenDate">', '<input type="hidden" id="chosenDate"><p class="hp" aria-hidden="true"><label>Lämna tomt<input id="website" name="website" tabindex="-1" autocomplete="off"></label></p>')
rep('<div id="success" class="success" role="status" aria-live="polite"></div>', '<div id="formError" class="error" role="alert"></div><div id="success" class="success" role="status" aria-live="polite"></div>')
rep('<div class="note">Din bokning är en förfrågan tills den har bekräftats.</div>', '<div class="note">Din bokning är en förfrågan tills den har bekräftats. Dina uppgifter används bara för att hantera bokningen.</div>')
rep('Frågor om workshopen? <b>Kontakta Linda</b>.<br>Telefon och e-post läggs in när bokningen kopplas skarpt.', 'Frågor om workshopen? <b>Kontakta Linda</b>.')

js = (pathlib.Path(__file__).parent / 'boka.js').read_text(encoding='utf-8')
a = s.index('<script>'); b = s.index('</script>') + 9
s = s[:a] + '<script>\n' + js + '</script>' + s[b:]
(root / 'loopia/public_html/index.html').write_text(s, encoding='utf-8')
print('index.html byggd')
