(function(){
  var API = /github\.io$/.test(location.hostname) ? 'https://olsgaaard.se/api' : 'api';
  var $ = function(id){ return document.getElementById(id); };
  var datesEl = $('dates'), form = $('bookingForm'), errorEl = $('formError'), successEl = $('success');
  var box = $('selectedDateBox'), spots = $('spots'), button = form.querySelector('.submit');
  var sessions = [], chosen = null;

  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // text/plain ger en "enkel" förfrågan utan CORS-förkontroll; servern läser JSON ur kroppen.
  function post(path, data){
    return fetch(API + '/' + path, {method:'POST', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(data)});
  }
  function track(type, id){ try { post('track.php', {type:type, session_id:id || 0}).catch(function(){}); } catch(e){} }
  function showError(msg){ errorEl.textContent = msg; errorEl.style.display = msg ? 'block' : 'none'; }
  function leftText(s){ return s.left <= 0 ? 'Fullbokat' : s.left + (s.left === 1 ? ' plats kvar' : ' platser kvar'); }

  function setSpots(max){
    var current = Number(spots.value) || 1;
    spots.innerHTML = '';
    for (var i = 1; i <= Math.max(1, Math.min(10, max)); i++) spots.appendChild(new Option(i, i));
    spots.value = Math.min(current, spots.options.length);
  }

  function render(){
    datesEl.innerHTML = '';
    var open = sessions.filter(function(s){ return !s.past; });
    if (!open.length) { datesEl.appendChild(el('p', 'empty', 'Det finns inga tillfällen att boka just nu.')); return; }
    open.forEach(function(s){
      var full = s.left <= 0;
      var row = el('div', 'date' + (full ? ' full' : '') + (chosen === s.id ? ' selected' : ''));
      var day = el('div', 'day'); day.appendChild(el('strong', null, s.day)); day.appendChild(el('span', null, s.month_short));
      var info = el('div'); info.appendChild(el('b', null, s.weekday));
      var time = el('span', 'time', 'kl. ' + s.time + ' · '); time.appendChild(el('span', full ? null : 'left', leftText(s))); info.appendChild(time);
      var pick = el('i', 'pick'); pick.setAttribute('aria-hidden', 'true');
      row.appendChild(day); row.appendChild(info); row.appendChild(pick);
      if (!full) {
        row.setAttribute('role', 'button'); row.tabIndex = 0;
        var choose = function(){ select(s.id, true); };
        row.addEventListener('click', choose);
        row.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
      }
      datesEl.appendChild(row);
    });
  }

  function select(id, byUser){
    var s = sessions.filter(function(x){ return x.id === id; })[0];
    if (!s || s.left <= 0) { chosen = null; box.style.display = 'none'; render(); return; }
    chosen = id; $('chosenDate').value = s.label;
    box.innerHTML = ''; box.appendChild(el('b', null, 'Valt tillfälle')); box.appendChild(document.createTextNode(s.label));
    box.style.display = 'block';
    setSpots(s.left); showError(''); render();
    if (byUser) { track('date_click', id); $('boka').scrollIntoView({behavior:'smooth'}); }
  }

  function load(){
    return fetch(API + '/sessions.php', {cache:'no-store'}).then(function(r){ return r.json(); }).then(function(d){
      if (!d.ok) throw new Error(d.message || '');
      sessions = d.sessions;
      if (chosen) select(chosen, false); else render();
    }).catch(function(){
      datesEl.innerHTML = ''; datesEl.appendChild(el('p', 'empty', 'Tillfällena kunde inte laddas. Ladda om sidan eller försök igen om en stund.'));
    });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault(); showError(''); successEl.style.display = 'none';
    if (!chosen) { showError('Välj ett tillfälle först.'); $('datum').scrollIntoView({behavior:'smooth'}); return; }
    var data = {session_id: chosen, name: $('name').value.trim(), phone: $('phone').value.trim(), email: $('email').value.trim(),
                persons: Number(spots.value), message: $('message').value.trim(), website: $('website').value};
    var label = button.textContent; button.disabled = true; button.textContent = 'Skickar…';
    post('book.php', data).then(function(r){ return r.json(); }).then(function(d){
      if (!d.ok) { showError(d.message || 'Bokningen kunde inte skickas. Försök igen.'); return load(); }
      successEl.innerHTML = '';
      successEl.appendChild(el('h3', null, 'Tack, ' + data.name + '!'));
      successEl.appendChild(el('div', null, 'Din bokningsförfrågan är mottagen. Vi hör av oss med bekräftelse.'));
      var det = el('div', 'confirm-details');
      [['Bokningsnummer', d.ref], ['Tillfälle', d.session], ['Antal personer', d.persons], ['Totalt', Number(d.amount).toLocaleString('sv-SE') + ' kr']].forEach(function(p){
        var line = el('div'); line.appendChild(el('b', null, p[0] + ': ')); line.appendChild(document.createTextNode(p[1])); det.appendChild(line);
      });
      successEl.appendChild(det); successEl.style.display = 'block';
      form.reset(); chosen = null; box.style.display = 'none'; setSpots(10);
      successEl.scrollIntoView({behavior:'smooth', block:'center'});
      return load();
    }).catch(function(){
      showError('Bokningen kunde inte skickas. Kontrollera uppkopplingen och försök igen.');
    }).then(function(){ button.disabled = false; button.textContent = label; });
  });

  var cForm = $('contactForm'), cError = $('contactError'), cSuccess = $('contactSuccess'), cButton = cForm.querySelector('.submit');
  cForm.addEventListener('submit', function(e){
    e.preventDefault(); cError.style.display = 'none'; cSuccess.style.display = 'none';
    var data = {name: $('cName').value.trim(), email: $('cEmail').value.trim(), message: $('cMessage').value.trim(), website: $('cWebsite').value};
    var label = cButton.textContent; cButton.disabled = true; cButton.textContent = 'Skickar…';
    post('contact.php', data).then(function(r){ return r.json(); }).then(function(d){
      if (!d.ok) { cError.textContent = d.message || 'Meddelandet kunde inte skickas. Försök igen.'; cError.style.display = 'block'; return; }
      cSuccess.innerHTML = ''; cSuccess.appendChild(el('h3', null, 'Tack för ditt meddelande!')); cSuccess.appendChild(el('div', null, 'Linda svarar dig via e-post så snart hon kan.'));
      cSuccess.style.display = 'block'; cForm.reset();
    }).catch(function(){
      cError.textContent = 'Meddelandet kunde inte skickas. Kontrollera uppkopplingen och försök igen.'; cError.style.display = 'block';
    }).then(function(){ cButton.disabled = false; cButton.textContent = label; });
  });

  load(); track('visit');
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) load(); });
})();
