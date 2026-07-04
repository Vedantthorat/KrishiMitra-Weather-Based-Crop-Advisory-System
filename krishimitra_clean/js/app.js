// js/app.js — KrishiMitra Application Logic
// Depends on: js/data.js

// ── API KEY CONFIGURATION ─────────────────────────────────────────────────────
// Get your free API key from: https://openweathermap.org/api
// Replace 'YOUR_OPENWEATHERMAP_API_KEY' below with your own key.
// IMPORTANT: Never commit a real API key to a public repository.
// For production, use a backend proxy to keep the key secret.
const OWM = 'YOUR_OPENWEATHERMAP_API_KEY';
let curLang = 'mr';
let priceChart = null;
let chatOpen = false, chatInit = false;
let recognition = null, isListening = false;

// ── LANGUAGE ──────────────────────────────────────────────────────────────────
function setLang(l) {
  curLang = l;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.lang-btn[onclick="setLang('${l}')"]`)?.classList.add('active');
  const d = LD[l] || LD.mr;
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  s('brandTitle', d.brandTitle); s('brandSub', d.brandSub);
  s('heroTitle', d.heroTitle); s('heroSub', d.heroSub);
  s('hb1', d.hb1); s('hb2', d.hb2); s('hb3', d.hb3);
  s('wxTitle', d.wxTitle); s('alertText', d.alert);
  ['home','advisory','prices','policies','soil','calendar','pests','loans','mandi'].forEach(k => {
    document.querySelectorAll(`[data-key="${k}"]`).forEach(el => el.textContent = d[k]);
  });
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function goTo(page) {
  document.querySelectorAll('.pg').forEach(s => s.classList.remove('act'));
  document.querySelectorAll('.nl').forEach(l => l.classList.remove('act'));
  document.getElementById('pg-' + page)?.classList.add('act');
  document.getElementById('nav-' + page)?.classList.add('act');
  const d = LD[curLang];
  const c = document.getElementById('bcrumb');
  if (c) c.textContent = page !== 'home' ? ' › ' + (d[page] || page) : '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── WEATHER ───────────────────────────────────────────────────────────────────
function fetchWX(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM}&units=metric`)
    .then(r => r.json()).then(d => {
      const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      s('wxTemp', Math.round(d.main.temp) + '°');
      s('wxDesc', d.weather[0].description);
      s('wxCity', d.name + ', Maharashtra');
      s('wxLoc', d.name);
      s('wxHum', d.main.humidity + '%');
      s('wxWind', Math.round(d.wind.speed * 3.6) + ' km/h');
      s('wxFeels', Math.round(d.main.feels_like) + '°C');
      s('wxVis', (d.visibility / 1000).toFixed(1) + ' km');
      s('wxUV', '--');
      s('wxPres', d.main.pressure + ' hPa');
      s('hTemp', Math.round(d.main.temp) + '°C');
      s('hCity', d.name);
      document.getElementById('wxIco').textContent = WXICO[d.weather[0].icon] || '🌤️';
    }).catch(() => {});
}

function fetchFC(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OWM}&units=metric`)
    .then(r => r.json()).then(d => {
      const days = d.list.filter(i => i.dt_txt.includes('12:00:00')).slice(0, 5);
      const row = document.getElementById('fcRow');
      row.innerHTML = days.map(day => {
        const date = new Date(day.dt * 1000);
        return `<div class="fc-day"><div class="dn">${DAYS[date.getDay()]}</div><div style="font-size:20px">${WXICO[day.weather[0].icon] || '🌤️'}</div><div class="ft">${Math.round(day.main.temp)}°</div><div class="fr">🌧️${Math.round(day.pop * 100)}%</div></div>`;
      }).join('');
    }).catch(() => {});
}

// ── PRICE CHART ───────────────────────────────────────────────────────────────
function updateChart() {
  const crop = document.getElementById('chartCrop')?.value || 'soybean';
  const labels = ['6 दिवसांपूर्वी', '5', '4', '3', '2', 'काल', 'आज'];
  const data = PRICE_HIST[crop];
  const names = { soybean: 'सोयाबीन', cotton: 'कापूस', onion: 'कांदा', wheat: 'गहू' };
  if (priceChart) priceChart.destroy();
  const ctx = document.getElementById('priceChart');
  if (!ctx) return;
  priceChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: names[crop] + ' (₹/क्विं.)', data, borderColor: '#1B6B3A', backgroundColor: 'rgba(27,107,58,0.1)', borderWidth: 2, pointBackgroundColor: '#1B6B3A', pointRadius: 4, tension: .3, fill: true }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₹' + c.parsed.y.toLocaleString() + '/क्विं.' } } }, scales: { y: { ticks: { callback: v => '₹' + v.toLocaleString() }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
  });
}

// ── CROP ADVISORY ─────────────────────────────────────────────────────────────
function getQAdvisory() {
  const dist = document.getElementById('qDist').value;
  const soil = document.getElementById('qSoil').value;
  const season = document.getElementById('qSeason').value;
  if (!dist || !soil) { alert('कृपया जिल्हा आणि माती प्रकार निवडा'); return; }
  showAdvisory('qResult', soil, season, dist);
}

function getFullAdvisory() {
  const soil = document.getElementById('aSoil').value;
  const season = document.getElementById('aSeason').value;
  const dist = document.getElementById('aDist').value;
  if (!soil) { alert('कृपया माती प्रकार निवडा'); return; }
  showAdvisory('aResult', soil, season, dist || 'महाराष्ट्र');
}

function showAdvisory(rid, soil, season, district) {
  const crops = ADV[soil]?.[season] || ['ज्वारी 🌾', 'बाजरी 🌾'];
  const tip = TIPS[soil] || '';
  const sn = season === 'kharif' ? 'खरीप' : season === 'rabi' ? 'रब्बी' : 'उन्हाळी';
  const el = document.getElementById(rid);
  el.innerHTML = `<h4>✅ ${district} — ${sn} पिक सल्ला</h4>
    <p style="font-size:12px;color:var(--green-d);margin-bottom:8px">शिफारस केलेली पिके:</p>
    <div class="crop-chips">${crops.map(c => `<span class="crop-chip">${c}</span>`).join('')}</div>
    <p style="margin-top:10px;font-size:13px;background:#fff;padding:9px 12px;border-radius:6px;border:1px solid var(--gray-l)">💡 <strong>सल्ला:</strong> ${tip}</p>`;
  el.classList.add('show');
}

// ── PRICE TABLE ───────────────────────────────────────────────────────────────
function renderPrices(data) {
  const tb = document.getElementById('ptBody');
  if (!tb) return;
  tb.innerHTML = data.map(r => `<tr>
    <td><strong>${r.crop}</strong></td>
    <td><span class="mkt-badge">${r.mktN}</span></td>
    <td>₹${r.min.toLocaleString()}</td>
    <td>₹${r.max.toLocaleString()}</td>
    <td><strong>₹${r.avg.toLocaleString()}</strong></td>
    <td>${r.msp !== '-' ? `<span class="msp-badge">MSP ₹${r.msp.toLocaleString()}</span>` : '—'}</td>
    <td class="${r.chg > 0 ? 'pu' : r.chg < 0 ? 'pd' : 'ps'}">${r.chg > 0 ? '▲' : r.chg < 0 ? '▼' : '—'} ${Math.abs(r.chg)}%</td>
    <td style="font-size:11px;color:#9CA3AF">${new Date().toLocaleDateString('mr-IN')}</td>
  </tr>`).join('');
}

function filterPrices() {
  const mkt = document.getElementById('mktFilter')?.value || 'all';
  const ct = document.getElementById('ctFilter')?.value || 'all';
  let f = PRICES;
  if (mkt !== 'all') f = f.filter(r => r.market === mkt);
  if (ct !== 'all') f = f.filter(r => r.type === ct);
  renderPrices(f);
}

function loadLivePrices() {
  const btn = document.querySelector('#pg-prices .sub-btn');
  if (btn) { btn.innerHTML = '<span class="spin"></span> लोड होत आहे...'; btn.disabled = true; }
  setTimeout(() => {
    filterPrices();
    if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> रिफ्रेश'; btn.disabled = false; }
  }, 1200);
}

// ── SOIL INFO ─────────────────────────────────────────────────────────────────
function showSoil(type, btn) {
  document.querySelectorAll('.soil-btn').forEach(b => b.classList.remove('act'));
  btn.classList.add('act');
  const s = SOIL_DB[type];
  const o = document.getElementById('soilOut');
  o.innerHTML = `<h5>${s.emoji} ${s.name}</h5>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;font-size:13px">
      <div><strong>pH:</strong> ${s.ph}</div>
      <div><strong>आर्द्रता:</strong> ${s.moisture}</div>
      <div><strong>सुपीकता:</strong> ${s.fertility}</div>
      <div><strong>जिल्हे:</strong> ${s.dist}</div>
    </div>
    <div style="font-size:13px"><strong>शिफारस पिके:</strong> ${s.crops.join(' | ')}</div>
    <div style="margin-top:9px;padding:9px;background:#fff;border-radius:5px;border:1px solid var(--gray-l);font-size:13px">💡 ${s.tips}</div>`;
  o.classList.add('show');
}

// ── LOAN CALCULATOR ───────────────────────────────────────────────────────────
function updateLoanRate() {
  const sel = document.getElementById('loanType');
  document.getElementById('loanRate').value = sel?.value || 4;
  calcLoan();
}

function calcLoan() {
  const P = parseFloat(document.getElementById('loanAmt')?.value) || 0;
  const rate = parseFloat(document.getElementById('loanRate')?.value) || 4;
  const years = parseInt(document.getElementById('loanTerm')?.value) || 1;
  const r = rate / 12 / 100;
  const n = years * 12;
  if (!P) { document.getElementById('loanResult').style.display = 'none'; return; }
  const emi = r === 0 ? P / n : P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = emi * n;
  const interest = total - P;
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  s('lEMI', '₹' + Math.round(emi).toLocaleString('en-IN'));
  s('lTotal', '₹' + Math.round(total).toLocaleString('en-IN'));
  s('lInterest', '₹' + Math.round(interest).toLocaleString('en-IN'));
  s('lPrincipal', '₹' + Math.round(P).toLocaleString('en-IN'));
  document.getElementById('loanResult').style.display = 'block';
}

// ── MANDI LOCATOR ─────────────────────────────────────────────────────────────
function renderMandis(data) {
  document.getElementById('mandiList').innerHTML = data.map(m => `
    <div class="mandi-item">
      <div class="mi-ico">${m.icon}</div>
      <div>
        <h4>${m.name}</h4>
        <p>📍 ${m.addr}</p>
        <p>🌾 ${m.crops.join(', ')} | ⏰ ${m.time} | 📅 ${m.days}</p>
      </div>
      <div class="dist" style="background:var(--green-l);color:var(--green-d);cursor:pointer" onclick="alert('Google Maps लिंक येत आहे')">📍 दिशा</div>
    </div>
  `).join('');
}

function filterMandis() {
  const d = document.getElementById('mandiDist')?.value || 'all';
  let f = MANDIS;
  if (d !== 'all') f = f.filter(m => m.dist === d);
  renderMandis(f);
}

// ── SCHEME MODAL ──────────────────────────────────────────────────────────────
function openScheme(id) {
  const s = SCHEMES[id]; if (!s) return;
  document.getElementById('modTitle').textContent = s.title;
  document.getElementById('modSub').textContent = s.sub;
  document.getElementById('modContent').innerHTML = `
    <ul class="ben-list">${s.bens.map(b => `<li><i class="fas fa-check-circle"></i><span>${b}</span></li>`).join('')}</ul>
    <div class="elig"><h5>✅ पात्रता आणि अर्ज</h5>${s.elig.map(e => `<span class="etag">${e}</span>`).join('')}</div>
    <button class="apply-btn" onclick="window.open('${s.link}','_blank')"><i class="fas fa-external-link-alt"></i> अधिकृत पोर्टलवर अर्ज करा</button>`;
  document.getElementById('schModal').classList.add('open');
}

function closeModal() { document.getElementById('schModal').classList.remove('open'); }

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
function toggleNotif() {
  document.getElementById('notifPanel').classList.toggle('open');
}

// ── CHATBOT ───────────────────────────────────────────────────────────────────
function switchTab(tab, btn) {
  document.querySelectorAll('.ctab').forEach(b => b.classList.remove('act'));
  btn.classList.add('act');
  ['chat', 'faq', 'prices'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tab ? 'flex' : 'none';
    if (t === tab && t !== 'chat') document.getElementById('tab-' + t).style.display = 'block';
  });
  if (tab === 'chat') document.getElementById('tab-chat').style.display = 'flex';
}

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatWin').classList.toggle('open', chatOpen);
  document.querySelector('.chat-fab .fbadge').style.display = 'none';
  if (chatOpen && !chatInit) { chatInit = true; addBot(LD[curLang].chatWelcome || LD.mr.chatWelcome); }
}

function openChat() { if (!chatOpen) toggleChat(); }

function addBot(text) {
  const msgs = document.getElementById('chatMsgs');
  const d = document.createElement('div'); d.className = 'msg bot';
  d.innerHTML = `<div class="mbubble">${text.replace(/\n/g, '<br>')}</div><div class="mtime">${gtime()}</div>`;
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}

function addUser(text) {
  const msgs = document.getElementById('chatMsgs');
  const d = document.createElement('div'); d.className = 'msg user';
  d.innerHTML = `<div class="mbubble">${text}</div><div class="mtime">${gtime()}</div>`;
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chatMsgs');
  const d = document.createElement('div'); d.className = 'msg bot typ-msg';
  d.innerHTML = `<div class="mbubble"><div class="typing-ind"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div>`;
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}

function gtime() { return new Date().toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' }); }

function getReply(text) {
  const l = text.toLowerCase();
  if (l.includes('बाजार') || l.includes('भाव') || l.includes('price')) return BRES['बाजार भाव'];
  if (l.includes('pm-kisan') || l.includes('kisan') || l.includes('6000')) return BRES['pm-kisan'];
  if (l.includes('सोयाबीन') || l.includes('soybean')) return BRES['सोयाबीन'];
  if (l.includes('विमा') || l.includes('insurance')) return BRES['पिक विमा'];
  if (l.includes('हवामान') || l.includes('weather') || l.includes('पाऊस')) return BRES['हवामान'];
  if (l.includes('कापूस') || l.includes('cotton')) return BRES['कापूस'];
  if (l.includes('कर्ज') || l.includes('loan') || l.includes('emi')) return BRES['कर्ज'];
  return BRES['default'];
}

function sendChat() {
  const inp = document.getElementById('chatInp');
  const text = inp.value.trim(); if (!text) return;
  addUser(text); inp.value = ''; showTyping();
  setTimeout(() => { document.querySelector('.typ-msg')?.remove(); addBot(getReply(text)); }, 900 + Math.random() * 600);
}

function sqr(text) {
  if (!chatOpen) openChat();
  setTimeout(() => { addUser(text); showTyping(); setTimeout(() => { document.querySelector('.typ-msg')?.remove(); addBot(getReply(text)); }, 900); }, 200);
}

// ── VOICE INPUT ───────────────────────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function toggleVoice() {
  if (!SpeechRecognition) { alert('तुमचा ब्राउझर आवाज ओळखणे समर्थन करत नाही. Chrome वापरा.'); return; }
  if (isListening) { stopVoice(); return; }
  startVoice();
}

function startVoice() {
  if (!SpeechRecognition) return;
  recognition = new SpeechRecognition();
  recognition.lang = 'mr-IN';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    document.getElementById('micBtn').classList.add('listening');
    document.getElementById('voiceStatus').classList.add('show');
    document.getElementById('voiceStatus').textContent = '🎙️ ऐकत आहे... बोला';
  };
  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) transcript += e.results[i][0].transcript;
    document.getElementById('chatInp').value = transcript;
    document.getElementById('voiceStatus').textContent = '🎙️ "' + transcript + '"';
  };
  recognition.onend = () => {
    isListening = false;
    document.getElementById('micBtn').classList.remove('listening');
    setTimeout(() => document.getElementById('voiceStatus').classList.remove('show'), 1500);
    const val = document.getElementById('chatInp').value.trim();
    if (val) sendChat();
  };
  recognition.onerror = (e) => {
    isListening = false;
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('voiceStatus').classList.remove('show');
    if (e.error === 'no-speech') {
      document.getElementById('voiceStatus').textContent = 'कोणताही आवाज आढळला नाही';
      document.getElementById('voiceStatus').classList.add('show');
      setTimeout(() => document.getElementById('voiceStatus').classList.remove('show'), 2000);
    }
  };
  try { recognition.start(); } catch (e) {}
}

function stopVoice() {
  if (recognition) recognition.stop();
  isListening = false;
  document.getElementById('micBtn').classList.remove('listening');
  document.getElementById('voiceStatus').classList.remove('show');
}

// ── INIT (runs on DOMContentLoaded) ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Year
  document.getElementById('fyear').textContent = new Date().getFullYear();

  // Language
  setLang('mr');

  // Weather
  navigator.geolocation?.getCurrentPosition(
    p => { fetchWX(p.coords.latitude, p.coords.longitude); fetchFC(p.coords.latitude, p.coords.longitude); },
    () => { fetchWX(18.5204, 73.8567); fetchFC(18.5204, 73.8567); }
  );

  // Price table
  renderPrices(PRICES);

  // Price chart (slight delay for Chart.js to load)
  setTimeout(updateChart, 500);

  // Farming calendar
  document.getElementById('calList').innerHTML = CAL.map(c => `
    <div class="cal-item">
      <div class="cal-mo">${c.icon} ${c.month}</div>
      <div class="cal-act">${c.act}</div>
    </div>
  `).join('');

  // Pest alerts
  document.getElementById('pestList').innerHTML = PESTS.map(p => `
    <div class="pest-card">
      <div class="pest-sev ${p.sev}"></div>
      <div class="pest-icon">${p.icon}</div>
      <div class="pest-info">
        <h4>${p.name}</h4>
        <p><strong>पिक:</strong> ${p.crop} | <strong>क्षेत्र:</strong> ${p.region}</p>
        <p style="margin-top:4px">${p.desc}</p>
        <div style="margin-top:8px;padding:8px;background:var(--green-l);border-radius:5px;font-size:12px"><strong>उपाय:</strong> ${p.remedy}</div>
        <span class="pest-badge pb-${p.sev}">${p.sev === 'high' ? 'उच्च धोका' : p.sev === 'med' ? 'मध्यम धोका' : 'कमी धोका'}</span>
      </div>
    </div>
  `).join('');

  // Mandi list
  renderMandis(MANDIS);

  // FAQ
  document.getElementById('faqList').innerHTML = FAQ_DATA.map(f => `
    <div style="border:1px solid var(--gray-l);border-radius:7px;margin-bottom:8px;overflow:hidden">
      <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'" style="padding:10px 12px;cursor:pointer;font-size:13px;font-weight:700;color:var(--green-d);background:var(--green-l);display:flex;justify-content:space-between">
        <span>${f.q}</span><span>+</span>
      </div>
      <div style="display:none;padding:10px 12px;font-size:13px;color:var(--dark)">${f.a}</div>
    </div>
  `).join('');
});
