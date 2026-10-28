/* 우리집 홈 웹 UI.
 * TV 셸 앱이 window.TV(기기 기능)를 넣어 준다. 브라우저에서 미리 볼 때는 가짜 TV를 쓴다.
 * 화면 좌표는 960×540 기준이고, #stage를 화면 크기에 맞춰 확대한다. */
(function () {
  'use strict';

  // ---------- 기기 다리 ----------
  const isTV = !!window.TV;
  const TV = window.TV || mockTV();
  const cbs = {};
  let seq = 0;
  window.__tvcb = function (id, ok, payload) { const f = cbs[id]; delete cbs[id]; if (f) f(ok, payload); };
  function call(method, ...args) {
    return new Promise((resolve, reject) => {
      const id = 'c' + (++seq);
      cbs[id] = (ok, p) => (ok ? resolve(p) : reject(new Error(p)));
      TV[method](id, ...args);
    });
  }
  let info = {};
  try { info = JSON.parse(TV.info()); } catch (e) { info = {}; }
  const CITY = info.city || '서울', LAT = info.lat || 37.5665, LON = info.lon || 126.978;
  const CHANNELS = info.channels || [['KBS1', '9'], ['KBS2', '7'], ['MBC', '11'], ['SBS', '5'], ['EBS1', '13']];
  const PERSONA = info.persona || '너는 우리 집 TV에 사는 친절한 비서야. 한국어로 짧고 분명하게 답해.';

  // ---------- 아이콘 (흰 선, 24칸) ----------
  const ICON = {
    home: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M10 9.5l4 2-4 2z"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/>',
    clock: '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 1.5M5 5l2-1.5M19 5l-2-1.5"/>',
    sliders: '<path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    play: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
    film: '<path d="M7 4v16M17 4v16M7 4l10 16"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  };
  const svg = (name) => '<svg viewBox="0 0 24 24">' + ICON[name] + '</svg>';

  // ---------- 화면 틀 ----------
  const stage = document.createElement('div');
  stage.id = 'stage';
  document.body.appendChild(stage);
  function fit() {
    const s = Math.min(innerWidth / 960, innerHeight / 540);
    stage.style.transform = 'translate(' + (innerWidth - 960 * s) / 2 + 'px,' + (innerHeight - 540 * s) / 2 + 'px) scale(' + s + ')';
  }
  addEventListener('resize', fit);
  fit();

  const h = (tag, attrs, html) => {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'style') Object.assign(e.style, attrs.style);
      else if (k === 'on') e.addEventListener('click', attrs.on);
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  };
  const px = (x, y, w, hh) => ({ left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
  const focusable = (e) => { e.setAttribute('data-f', ''); return e; };

  const toastEl = h('div', { id: 'toast' });
  stage.appendChild(toastEl);
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2800);
  }

  /** 링 위젯: SVG 원 두 개(트랙·진행). */
  function ring(size, stroke, bigSize) {
    const r = size / 2 - stroke * 2, c = 2 * Math.PI * r, id = 'g' + Math.random().toString(36).slice(2, 7);
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * 2 * Math.PI, r1 = r + stroke * 1.4, r2 = r1 + (i % 5 ? 2 : 4);
      ticks += '<line class="tick" x1="' + (size / 2 + r1 * Math.cos(a)) + '" y1="' + (size / 2 + r1 * Math.sin(a)) +
        '" x2="' + (size / 2 + r2 * Math.cos(a)) + '" y2="' + (size / 2 + r2 * Math.sin(a)) + '"/>';
    }
    const el = h('div', { class: 'ring' },
      '<svg viewBox="0 0 ' + size + ' ' + size + '"><defs><linearGradient id="' + id + '" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#1a3366"/><stop offset=".55" stop-color="#4b74c4"/><stop offset="1" stop-color="#eaf0ff"/></linearGradient></defs>' +
      ticks +
      '<circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '"/>' +
      '<circle class="arc" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '" stroke="url(#' + id + ')"' +
      ' stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '"/></svg>' +
      '<div class="mid"><div class="big" style="font-size:' + bigSize + 'px">--</div><div class="small"></div></div>');
    Object.assign(el.style, { width: size + 'px', height: size + 'px' });
    el.set = (p, big, small) => {
      el.querySelector('.arc').style.strokeDashoffset = c * (1 - Math.max(0, Math.min(1, p)));
      el.querySelector('.big').textContent = big;
      el.querySelector('.small').textContent = small || '';
    };
    return el;
  }

  // ---------- 화면 전환·포커스 ----------
  const screens = {};
  let current = 'home';
  function screen(id) { const s = h('div', { class: 'screen', id: 's-' + id }); stage.appendChild(s); screens[id] = s; return s; }
  function show(id, focusEl) {
    Object.values(screens).forEach((s) => s.classList.remove('on'));
    screens[id].classList.add('on');
    current = id;
    setFocus(focusEl || screens[id].querySelector('[data-f]'));
  }
  let focused = null;
  function setFocus(el) {
    if (!el) return;
    if (focused) focused.classList.remove('focus');
    focused = el; el.classList.add('focus');
  }
  /** 방향키 이동: 현재 칸에서 그 방향에 있는 가장 가까운 칸으로. */
  function move(dir) {
    const all = [...screens[current].querySelectorAll('[data-f]')].filter((e) => e.offsetParent !== null && e !== focused);
    if (!focused) return setFocus(all[0]);
    const a = focused.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    for (const e of all) {
      const b = e.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      let main, side;
      if (dir === 'right') { if (b.left < a.right - 8 && dx <= 4) continue; main = dx; side = Math.abs(dy); }
      if (dir === 'left') { if (b.right > a.left + 8 && dx >= -4) continue; main = -dx; side = Math.abs(dy); }
      if (dir === 'down') { if (b.top < a.bottom - 8 && dy <= 4) continue; main = dy; side = Math.abs(dx); }
      if (dir === 'up') { if (b.bottom > a.top + 8 && dy >= -4) continue; main = -dy; side = Math.abs(dx); }
      if (main <= 0) continue;
      const score = main + side * 2.2;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) setFocus(best);
    else if (dir === 'up' || dir === 'down') scrollPanel(dir === 'down' ? 1 : -1);
  }

  /** 긴 답변·브리핑 글: 위·아래 키로 스크롤. */
  function scrollPanel(d) {
    const box = screens[current].querySelector('.panel .scroll');
    if (!box) return;
    const inner = box.firstElementChild, max = Math.max(0, inner.scrollHeight - box.clientHeight);
    const y = Math.max(0, Math.min(max, (inner._y || 0) + d * 90));
    inner._y = y; inner.style.transform = 'translateY(' + -y + 'px)';
  }
  /** 읽어 주는 동안 글이 천천히 따라 내려가게 (대략 한국어 초당 7글자). */
  let follow;
  function followText(text) {
    clearInterval(follow);
    const box = screens[current].querySelector('.panel .scroll');
    if (!box) return;
    const inner = box.firstElementChild; inner._y = 0; inner.style.transform = '';
    const max = Math.max(0, inner.scrollHeight - box.clientHeight);
    if (!max) return;
    const secs = text.length / 7, step = max / (secs * 2);
    follow = setInterval(() => {
      inner._y = Math.min(max, (inner._y || 0) + step);
      inner.style.transform = 'translateY(' + -inner._y + 'px)';
      if (inner._y >= max) clearInterval(follow);
    }, 500);
  }

  // ---------- 홈 ----------
  const home = screen('home');
  const railItems = [
    ['home', '홈', () => setFocus(firstChannel)],
    ['tv', '지니TV', () => TV.genieHome()],
    ['grid', '앱', () => TV.openNative('apps')],
    ['mic', 'AI', () => openAsk(true)],
    ['clock', '알람', () => openAlarm()],
    ['sliders', '홈 설정', () => TV.openNative('settings')],
    ['gear', 'TV 설정', () => TV.openNative('tvsettings')],
  ];
  const rail = h('div', { class: 'card', id: 'rail' });
  railItems.forEach(([icon, name, fn]) => {
    const item = h('div', { class: 'ri' });
    item.appendChild(focusable(h('div', { class: 'rb', on: fn }, svg(icon))));
    item.appendChild(h('div', { class: 'rt' }, name));
    rail.appendChild(item);
  });
  home.appendChild(rail);

  home.appendChild(h('div', { class: 'chip', style: { left: '100px', top: '18px' } }, '<b>◆&nbsp; 우리집 홈</b>'));
  const aiChip = h('div', { class: 'chip', style: { left: '216px', top: '18px' } },
    '<span class="dot' + (info.hasKey ? '' : ' off') + '"></span>AI · ' + (info.hasKey ? '준비됨' : '키 없음'));
  home.appendChild(aiChip);
  const clockChip = h('div', { class: 'chip', style: { right: '18px', top: '18px' } });
  home.appendChild(clockChip);

  // 시계
  const clockCard = h('div', { class: 'card', style: px(100, 60, 186, 186) });
  const clockRing = ring(164, 5, 36);
  Object.assign(clockRing.style, { left: '11px', top: '11px' });
  clockCard.appendChild(clockRing);
  home.appendChild(clockCard);

  // 날씨 (OK → 브리핑)
  const wCard = focusable(h('div', { class: 'card', style: px(300, 60, 420, 186), on: () => openBriefing(false) }));
  const wRing = ring(146, 4.5, 30);
  Object.assign(wRing.style, { left: '12px', top: '20px' });
  wCard.appendChild(wRing);
  const wText = h('div', { style: { position: 'absolute', left: '176px', top: '26px', right: '18px' } },
    '<div class="label">Climate · ' + CITY + '</div>' +
    '<div style="margin-top:16px" id="w-metrics"></div>' +
    '<div style="margin-top:14px;font-size:11.5px;color:var(--sub)" id="w-sub">날씨 불러오는 중…</div>' +
    '<div class="label" style="margin-top:20px">OK · 아침 브리핑 듣기</div>');
  wCard.appendChild(wText);
  home.appendChild(wCard);

  // 알람 (OK → 알람 설정)
  const aCard = focusable(h('div', { class: 'card', style: px(734, 60, 208, 186), on: () => openAlarm() }));
  aCard.appendChild(h('div', { class: 'label', style: { position: 'absolute', left: '18px', top: '16px' } }, 'Morning alarm'));
  const aRing = ring(136, 4, 24);
  Object.assign(aRing.style, { left: '36px', top: '38px' });
  aCard.appendChild(aRing);
  home.appendChild(aCard);

  // 실시간 TV
  const live = h('div', { class: 'card', style: px(100, 260, 300, 262) });
  live.appendChild(h('div', { class: 'label', style: { position: 'absolute', left: '18px', top: '16px' } }, 'Live · 지니TV'));
  let firstChannel = null;
  const chItems = CHANNELS.map((c) => [c[0], () => watch(c[0], c[1])]).concat([['지니TV', () => TV.genieHome()]]);
  chItems.forEach(([name, fn], i) => {
    const p = focusable(h('div', { class: 'pill', style: px(18 + (i % 3) * 90, 46 + Math.floor(i / 3) * 66, 82, 56), on: fn }, name));
    if (!firstChannel) firstChannel = p;
    live.appendChild(p);
  });
  live.appendChild(h('div', { class: 'label', style: { position: 'absolute', left: '18px', top: '184px' } }, 'Today · 할 일'));
  live.appendChild(h('div', { id: 'today', style: { position: 'absolute', left: '18px', right: '14px', top: '204px' } }));
  home.appendChild(live);

  // AI
  const ai = h('div', { class: 'card', style: px(414, 260, 200, 262) });
  ai.appendChild(h('div', { class: 'label', style: { position: 'absolute', left: '18px', top: '16px' } }, 'AI assist'));
  ai.appendChild(focusable(h('div', { class: 'mic', style: { left: '67px', top: '52px' }, on: () => openAsk(true) }, svg('mic'))));
  ai.appendChild(h('div', { style: { position: 'absolute', left: 0, right: 0, top: '134px', textAlign: 'center', fontSize: '11.5px', color: 'var(--sub)' } }, '말로 물어보기'));
  ai.appendChild(focusable(h('div', { class: 'pill', style: px(18, 176, 164, 44), on: () => openBriefing(false) },
    '<span style="display:flex;align-items:center;gap:8px"><span style="width:16px;height:16px;display:inline-block">' + svg('sun').replace('<svg', '<svg style="width:16px;height:16px;stroke:#f2f5fb;fill:none;stroke-width:1.7"') + '</span>아침 브리핑</span>')));
  home.appendChild(ai);

  // 앱
  const apps = h('div', { class: 'card', style: px(628, 260, 314, 262) });
  apps.appendChild(h('div', { class: 'label', style: { position: 'absolute', left: '18px', top: '16px' } }, 'Apps'));
  [
    ['play', '유튜브', () => app('com.google.android.youtube.tv', '유튜브')],
    ['music', '유튜브 뮤직', () => app('com.google.android.youtube.tvmusic', '유튜브 뮤직')],
    ['film', '넷플릭스', () => app('com.netflix.ninja', '넷플릭스')],
    ['laptop', '맥북 연결', () => connectMac()],
    ['grid', '모든 앱', () => TV.openNative('apps')],
    ['sliders', '홈 설정', () => TV.openNative('settings')],
  ].forEach(([icon, name, fn], i) => {
    apps.appendChild(focusable(h('div', { class: 'app', style: px(18 + (i % 3) * 98, 46 + Math.floor(i / 3) * 86, 88, 76), on: fn },
      svg(icon) + '<span>' + name + '</span>')));
  });
  home.appendChild(apps);

  function app(pkg, name) {
    if (!TV.launchApp(pkg)) { toast(name + ' 앱이 없어서 설치 화면을 엽니다'); TV.openStore(pkg); }
  }
  function watch(name, num) {
    toast(TV.watchChannel(num) ? name + ' 트는 중…' : '지니TV를 열었어요. 숫자 ' + num + '번을 눌러 주세요');
  }
  function connectMac() {
    if (info.platform === 'tv') return app('com.ionitech.airscreen', 'AirScreen');
    openGuide('맥북 화면 띄우기', [
      '리모컨 [외부입력] 버튼으로 TV 본체 화면으로 바꿔요',
      '맥북 제어 센터 → 화면 미러링 → AS-ATVR2[AirPlay] 선택',
      '돌아올 때는 [외부입력]에서 지니TV를 고르세요',
    ]);
  }

  // 숫자 키로 채널 바로 가기 (홈에서)
  let digits = '', digitTimer;
  function typeDigit(d) {
    digits += d; toast('채널 ' + digits);
    clearTimeout(digitTimer);
    digitTimer = setTimeout(() => {
      const c = CHANNELS.find((x) => x[1] === digits);
      watch(c ? c[0] : digits + '번', digits); digits = '';
    }, 1300);
  }

  function tick() {
    const now = new Date();
    const hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
    const day = (now.getHours() * 60 + now.getMinutes()) / 1440;
    clockRing.set(day, hm, 'TODAY ' + Math.round(day * 100) + '%');
    clockChip.innerHTML = '<b>' + hm + '</b>' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + '일월화수목금토'[now.getDay()] + '요일';
    if (bTime) bTime.textContent = hm;
  }
  const pad = (n) => String(n).padStart(2, '0');

  let weather = null;
  async function loadWeather() {
    try {
      const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
        '&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&wind_speed_unit=ms' +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=1';
      const j = await (await fetch(u)).json();
      const c = j.current, d = j.daily;
      weather = {
        t: Math.round(c.temperature_2m), feel: Math.round(c.apparent_temperature), hum: c.relative_humidity_2m,
        wind: c.wind_speed_10m, label: wlabel(c.weather_code), hi: Math.round(d.temperature_2m_max[0]),
        lo: Math.round(d.temperature_2m_min[0]), rain: d.precipitation_probability_max[0] || 0,
      };
      wRing.set((weather.t + 10) / 45, weather.t + '°', weather.label);
      document.getElementById('w-metrics').innerHTML =
        metric('체감', weather.feel + '°') + metric('습도', weather.hum + '%') + metric('바람', weather.wind.toFixed(1) + '<small style="font-size:11px">m/s</small>');
      document.getElementById('w-sub').textContent = '최고 ' + weather.hi + '°  ·  최저 ' + weather.lo + '°  ·  비 올 확률 ' + weather.rain + '%';
    } catch (e) {
      document.getElementById('w-sub').textContent = '날씨를 불러오지 못했어요';
    }
  }
  const metric = (k, v) => '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
  function wlabel(c) {
    if (c === 0) return '맑음'; if (c <= 2) return '구름 조금'; if (c === 3) return '흐림'; if (c <= 48) return '안개';
    if (c <= 57) return '이슬비'; if (c <= 67) return '비'; if (c <= 77) return '눈'; if (c <= 82) return '소나기';
    if (c <= 86) return '눈 소나기'; return '뇌우';
  }

  // ---------- 폰에서 정한 데이터 (요일별 알람·노래·할 일) ----------
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const KDAY = '일월화수목금토';
  let DATA = {};
  function loadData() {
    try { DATA = JSON.parse((TV.getData && TV.getData()) || '{}'); } catch (e) { DATA = {}; }
    refreshAlarm(); renderToday();
  }
  function syncData() { if (TV.syncNow) call('syncNow').then(loadData).catch(() => {}); }
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dayCfg = (d) => ((DATA.alarm || {}).days || {})[DAY_KEYS[d.getDay()]] || {};
  const songFor = (cfg) => (cfg && cfg.song && cfg.song.url) ? cfg.song : ((DATA.alarm || {}).song || {});
  function nextAlarm() {
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), c = dayCfg(d);
      if (!c.on || !/^\d{1,2}:\d{2}$/.test(c.time || '')) continue;
      const [hh, mm] = c.time.split(':').map(Number);
      d.setHours(hh, mm, 0, 0);
      if (d > now) return { at: d, cfg: c };
    }
    return null;
  }
  function todayReminders() {
    const t = ymd(new Date());
    return (DATA.reminders || []).filter((r) => r.date === t && !r.done).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  }
  function refreshAlarm() {
    const n = nextAlarm();
    if (!n) return aRing.set(0, 'OFF', '알람 꺼짐');
    const left = (n.at - Date.now()) / 86400000;
    aRing.set(1 - Math.min(1, left), pad(n.at.getHours()) + ':' + pad(n.at.getMinutes()), KDAY[n.at.getDay()] + '요일');
  }
  function renderToday() {
    const el = document.getElementById('today');
    if (!el) return;
    const list = todayReminders();
    el.innerHTML = list.length
      ? list.slice(0, 2).map((r) => '<div class="todo"><b>' + (r.time || '하루') + '</b>' + esc(r.text) + '</div>').join('') +
        (list.length > 2 ? '<div class="todo more">+' + (list.length - 2) + '개 더</div>' : '')
      : '<div class="todo none">오늘 할 일이 없어요</div>';
  }
  const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** 유튜브·유튜브 뮤직 링크에서 영상 ID. */
  function ytId(u) {
    const m = String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // ---------- 안내 화면 ----------
  const guide = screen('guide');
  guide.appendChild(h('div', { class: 'page-title' }, '<small>GUIDE</small><span id="g-title"></span>'));
  const gPanel = h('div', { class: 'card panel' });
  guide.appendChild(gPanel);
  guide.appendChild(h('div', { class: 'hint' }, '뒤로 · 홈으로'));
  function openGuide(title, steps) {
    document.getElementById('g-title').textContent = title;
    gPanel.innerHTML = steps.map((s, i) => '<div style="display:flex;gap:16px;margin-bottom:22px;font-size:17px;line-height:1.5">' +
      '<span class="label" style="padding-top:5px">0' + (i + 1) + '</span><span>' + s + '</span></div>').join('');
    gPanel.appendChild(focusable(h('div', { class: 'pill', style: { position: 'relative', width: '140px', height: '44px', marginTop: '10px' }, on: () => show('home', firstChannel) }, '확인')));
    show('guide');
  }

  // ---------- AI에게 묻기 ----------
  const ask = screen('ask');
  ask.appendChild(h('div', { class: 'page-title' }, '<small>AI ASSIST · GEMINI</small>무엇이든 물어보세요'));
  const askPanel = h('div', { class: 'card panel' },
    '<div class="scroll"><div><div class="status" id="q-status"></div><div class="qa-q" id="q-q" style="margin-top:14px"></div><div class="qa-a" id="q-a"></div></div></div>');
  ask.appendChild(askPanel);
  const askMic = focusable(h('div', { class: 'mic', style: { left: '860px', top: '24px', width: '56px', height: '56px' }, on: () => listen() }, svg('mic')));
  ask.appendChild(askMic);
  ask.appendChild(h('div', { class: 'hint' }, 'OK · 다시 묻기     뒤로 · 홈으로'));
  const qStatus = () => document.getElementById('q-status'), qQ = () => document.getElementById('q-q'), qA = () => document.getElementById('q-a');
  const WAVE = '<span class="wave"><i></i><i></i><i></i><i></i></span>';

  function openAsk(start) {
    show('ask', askMic);
    if (start) listen();
  }
  async function listen() {
    TV.stopSpeak();
    qStatus().innerHTML = 'LISTENING' + WAVE; qQ().textContent = '리모컨에 대고 말씀하세요'; qA().textContent = '';
    let q;
    try { q = await call('listen'); } catch (e) { qStatus().textContent = 'READY'; qQ().textContent = '잘 못 들었어요. OK를 눌러 다시 말씀해 주세요'; return; }
    qQ().textContent = 'Q. ' + q; qStatus().innerHTML = 'THINKING' + WAVE;
    try {
      const a = await call('ask', PERSONA, await withContext(q));
      qStatus().textContent = 'ANSWER'; qA().textContent = a; TV.speak(a); followText(a);
    } catch (e) {
      qStatus().textContent = 'ERROR'; qA().textContent = '답을 가져오지 못했어요\n' + e.message;
    }
  }
  async function withContext(q) {
    const now = new Date();
    let s = '(지금은 ' + now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + '일월화수목금토'[now.getDay()] +
      '요일 ' + now.getHours() + '시 ' + now.getMinutes() + '분)\n';
    if (/뉴스|소식|이슈|요즘|최근|오늘|어제|속보/.test(q)) {
      try {
        const hs = await headlines(NEWS_FEEDS[0].url, 15);
        s += '방금 가져온 실제 뉴스 헤드라인:\n' + hs.map((x) => '- ' + x).join('\n') + '\n뉴스 이야기는 이 헤드라인에 있는 내용만 근거로 답해.\n';
      } catch (e) { /* 헤드라인 없이 묻는다 */ }
    }
    if (weather) s += '현재 ' + CITY + ' 날씨: ' + weather.label + ' ' + weather.t + '도, 최고 ' + weather.hi + '도 최저 ' + weather.lo + '도, 비 올 확률 ' + weather.rain + '%\n';
    return s + '질문: ' + q;
  }

  // ---------- 아침 브리핑 / 알람 ----------
  const brief = screen('brief');
  brief.appendChild(h('div', { class: 'page-title' }, '<small id="b-tag">MORNING BRIEFING</small><span id="b-date"></span>'));
  const bClock = ring(150, 4.5, 34);
  Object.assign(bClock.style, { left: '790px', top: '18px', transform: 'scale(.82)' });
  brief.appendChild(bClock);
  let bTime = null;
  const bPanel = h('div', { class: 'card panel', style: { top: '150px' } },
    '<div class="scroll"><div><div class="status" id="b-status"></div><div class="qa-a" id="b-body" style="margin-top:12px;font-size:16px"></div></div></div>');
  brief.appendChild(bPanel);
  const bOk = focusable(h('div', { class: 'pill', style: px(110, 104, 150, 34), on: () => startBriefing() }, '다시 듣기'));
  brief.appendChild(bOk);
  brief.appendChild(h('div', { class: 'hint' }, '뒤로 · 홈으로'));
  let ringing = false;

  const nowPlaying = h('div', { class: 'card nowplaying' });
  brief.appendChild(nowPlaying);
  let chime = null, ringTimer = null;

  function openBriefing(alarm) {
    const now = new Date();
    document.getElementById('b-date').textContent = (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + KDAY[now.getDay()] + '요일';
    bClock.set((now.getHours() * 60 + now.getMinutes()) / 1440, pad(now.getHours()) + ':' + pad(now.getMinutes()), 'GOOD MORNING');
    show('brief', bOk);
    if (alarm) wakeWithSong(); else startBriefing();
  }

  /** 알람: 오늘 요일의 노래(없으면 기본 노래)를 틀고, 아무 버튼이나 누르면 브리핑. */
  function wakeWithSong() {
    ringing = true; acked = false;
    TV.stopSpeak();
    document.getElementById('b-tag').textContent = 'ALARM';
    document.getElementById('b-status').innerHTML = 'WAKE UP' + WAVE;
    document.getElementById('b-body').textContent = '좋은 아침이에요! 아무 버튼이나 누르면 노래가 멈추고 브리핑을 시작해요.';
    const song = songFor(dayCfg(new Date())), id = ytId(song.url);
    songUrl = song.url || ''; songInApp = false;
    if (id) {
      nowPlaying.innerHTML = '<div id="yt"></div>' +
        '<div class="np"><div class="label">Now playing</div><div class="np-title">' + esc(song.title || '오늘의 노래') + '</div>' + WAVE + '</div>';
      if (TV.ytOpen) playSongTv(id); else playSong(id);
    } else {
      fallbackChime();
    }
    nowPlaying.classList.add('on'); bPanel.style.bottom = '196px';
    // 노래가 먼저 불러지도록 3초 뒤에, 노래가 나오는 동안 뉴스 요약을 만들어 둔다 (음성 엔진도 미리 깨운다)
    setTimeout(() => { if (ringing) { prepareNews(true); TV.speak(''); } }, 3000);
    clearTimeout(ringTimer);
    ringTimer = setTimeout(() => { if (ringing) stopRing(); }, 15 * 60000);
  }
  /** 소리가 나는 게 확인되면 앱의 기본 알람음 예약(알람 20초 뒤)을 취소한다. 그 전에 노래가 막히면 앱이 대신 울린다. */
  let acked = false;
  function soundOk() {
    if (acked) return;
    acked = true;
    if (TV.alarmAck) TV.alarmAck();
  }
  /** 유튜브 공식 플레이어로 틀고, 8초 안에 재생이 안 되면(삭제·임베드 금지·지난 라이브 등) 기본 알람음으로 바꾼다. */
  let ytPlayer = null, ytCheck = null, songInApp = false, songUrl = '';
  function loadYT() {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.onerror = reject;
      document.head.appendChild(sc);
      setTimeout(() => reject(new Error('timeout')), 8000);
    });
  }
  const DEBUG = /debug/.test(location.search);
  function dbg(m) { if (DEBUG && TV.toast) TV.toast('[유튜브] ' + m); }
  function playSong(id) {
    loadYT().then((YT) => {
      if (!ringing) return;
      const t0 = Date.now();
      ytPlayer = new YT.Player('yt', { videoId: id, width: 216, height: 122,
        playerVars: { autoplay: 1, controls: 0, loop: 1, playlist: id, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => { dbg('준비됨'); e.target.unMute(); e.target.setVolume(100); e.target.playVideo(); },
          onStateChange: (e) => {
            dbg('상태 ' + e.data);
            if (e.data !== 1) return;
            if (!acked) report({ kind: 'alarm-iframe', song: id, state: 1, sec: Math.round((Date.now() - t0) / 1000) });
            soundOk();
          },
          onError: (e) => { dbg('오류 ' + e.data); fallbackChime('노래를 재생할 수 없어 기본 알람음으로 깨워요'); },
        } });
      // 광고가 먼저 나오는 동안은 '시작 전'(-1)으로 보인다: 광고가 끝나고 노래가 나올 때까지 45초는 기다린다
      const check = () => {
        if (!ringing || !ytPlayer) return;
        const state = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : null;
        if (state === 1) return;
        if (Date.now() - t0 < 45000) { ytCheck = setTimeout(check, 5000); return; }
        report({ kind: 'alarm-iframe', song: id, state });
        fallbackChime('노래를 재생할 수 없어 기본 알람음으로 깨워요');
      };
      clearTimeout(ytCheck);
      ytCheck = setTimeout(check, 12000);
    }).catch(() => fallbackChime('노래를 불러오지 못해 기본 알람음으로 깨워요'));
  }
  /**
   * 앱 안의 유튜브 TV 화면으로 튼다: '유튜브 연결'로 프리미엄 계정에 로그인해 두면 광고가 없다.
   * 한동안 안 쓰다 링크로 틀면 유튜브가 먼저 묻는다: 계정 고르기 화면이면 프리미엄 계정을,
   * "이 동영상을 재생하시겠어요?"면 '예'를 눌러 준다 (방법을 바꿔 가며 3번까지).
   * 계정을 고르면 유튜브 첫 화면으로 가서 노래 주소가 사라지므로 다시 노래로 간다.
   * 30초 안에 재생이 안 되면 공개 플레이어(광고가 나올 수 있음) → 기본 알람음 순으로 바꾼다.
   */
  const YT_TV = 'https://www.youtube.com/tv';
  const YT_UA = ''; // 비우면 앱 기본값(TV 브라우저). 유튜브가 TV 화면을 안 주면 여기만 바꿔 다시 올린다
  let ytTvOn = false, ytOpenAt = null;
  function openYtTv(id) {
    const r = document.getElementById('yt').getBoundingClientRect();
    ytOpenAt = [r.left / innerWidth, r.top / innerHeight, r.width / innerWidth, r.height / innerHeight];
    TV.ytOpen(YT_TV + '#/watch?v=' + id, YT_UA, ...ytOpenAt, false);
    ytTvOn = true;
  }
  function playSongTv(id) {
    setTimeout(() => { if (ringing) openYtTv(id); }, 400); // 노래 칸이 펼쳐진 뒤 자리를 잰다
    const t0 = Date.now(), steps = [], tries = { yes: 0, who: 0, go: 0 };
    clearTimeout(ytCheck);
    const check = async () => {
      if (!ringing || !ytTvOn) return;
      const st = await ytTvState();
      if (!ringing || !ytTvOn) return;
      const sec = Math.round((Date.now() - t0) / 1000);
      const done = () => report(Object.assign({ kind: 'alarm-youtube-tv', song: id, sec, steps }, st));
      if (st.playing) { soundOk(); done(); return; }
      const kind = st.ask ? 'yes' : st.who ? 'who' : null;
      if (kind && tries[kind] < YT_WAYS.length) {
        const way = YT_WAYS[tries[kind]++];
        steps.push({ sec, kind, way, r: await pressYt(kind, way) });
        ytCheck = setTimeout(check, 3000); // 누른 뒤 다음 화면이 뜰 시간을 준다
        return;
      }
      if (!kind && st.url && !/watch/.test(st.url) && sec >= 5 && tries.go < 2) {
        // 처음엔 주소만 바꿔 앱 안에서 이동하고, 그래도 안 되면 노래 주소로 다시 연다
        if (tries.go++ === 0) steps.push({ sec, kind: 'go', r: await ytEvalJs("(function(){location.hash='#/watch?v=" + id + "';return location.href;})()") });
        else { steps.push({ sec, kind: 'reopen' }); openYtTv(id); }
        ytCheck = setTimeout(check, 3000);
        return;
      }
      if (sec >= 30) { done(); closeYtTv(); playSong(id); return; }
      ytCheck = setTimeout(check, 1500);
    };
    ytCheck = setTimeout(check, 2500);
  }
  // 유튜브 TV 화면에서 누를 버튼을 찾는 스크립트 (없으면 null). 문서 순서상 마지막 일치 = 가장 안쪽 글자
  const ytFinder = (page, label) => "function(){var tx=(document.body&&document.body.innerText)||'';if(!" + page + ".test(tx))return null;" +
    "var hit=null,all=document.querySelectorAll('body *');for(var i=0;i<all.length;i++){" +
    "var e=all[i],r=e.getBoundingClientRect(),t=(e.innerText||'').replace(/\\s+/g,' ').trim();" +
    "if(r.width>0&&r.height>0&&t.length<40&&" + label + ".test(t))hit=e;}" +
    "return hit&&(hit.closest('[role=button],[tabindex],button')||hit);}";
  const YT_FIND = {
    yes: ytFinder('/재생하시겠어요|Play this video/i', '/재생하겠습니다|Yes, play/i'), // "이 동영상을 재생하시겠어요?" → '예'
    who: ytFinder('/게스트로 시청|Watch as guest/i', '/@\\S/'), // 계정 고르기 → 계정 이름(@…)이 있는 칸
  };
  const YT_WAYS = ['click', 'enter', 'remote'];
  /** 버튼을 누른다: 클릭 → 확인(Enter) 키 → 리모컨 확인 키. 결과 설명(버튼 모양·포커스)을 돌려준다. */
  async function pressYt(kind, way) {
    if (way === 'remote') { TV.ytKey('DPAD_CENTER'); return 'key'; }
    return ytEvalJs("(function(){var b=(" + YT_FIND[kind] + ")();if(!b)return 'none';" +
      (way === 'click'
        ? "var r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;" +
          "['pointerover','pointerdown','mousedown','pointerup','mouseup','click'].forEach(function(n){" +
          "var E=n.indexOf('pointer')===0&&window.PointerEvent?PointerEvent:MouseEvent;" +
          "b.dispatchEvent(new E(n,{bubbles:true,cancelable:true,view:window,clientX:x,clientY:y,button:0," +
          "buttons:/down/.test(n)?1:0,pointerType:'mouse',isPrimary:true}));});"
        : "try{b.focus();}catch(e){}var a=document.activeElement||document.body;['keydown','keyup'].forEach(function(n){" +
          "var k=new KeyboardEvent(n,{key:'Enter',code:'Enter',bubbles:true,cancelable:true});" +
          "Object.defineProperty(k,'keyCode',{get:function(){return 13;}});Object.defineProperty(k,'which',{get:function(){return 13;}});" +
          "a.dispatchEvent(k);});") +
      "var d=document.activeElement;return b.tagName+'.'+String(b.className).slice(0,40)+' 포커스='+" +
      "(d?d.tagName+'.'+String(d.className).slice(0,40):'-')+' '+b.outerHTML.slice(0,240);})()");
  }
  async function ytEvalJs(js) {
    try { return JSON.parse(await call('ytEval', js)); } catch (e) { return 'error ' + (e && e.message); }
  }
  /** 유튜브 TV 화면의 재생 상태 (영상 유무·재생 중·시간·확인 창·계정 고르기·화면 글자 일부: 광고 표시 확인용). */
  async function ytTvState() {
    const js = "(function(){var v=document.querySelector('video');return JSON.stringify({video:!!v," +
      "playing:!!(v&&!v.paused&&v.currentTime>0.3),t:v?Math.round(v.currentTime):0,dur:v?Math.round(v.duration||0):0," +
      "ask:!!(" + YT_FIND.yes + ")(),who:!!(" + YT_FIND.who + ")(),url:location.href,title:document.title," +
      "text:((document.body&&document.body.innerText)||'').replace(/\\s+/g,' ').slice(0,400)})})()";
    try {
      let r = JSON.parse(await call('ytEval', js));
      if (typeof r === 'string') r = JSON.parse(r);
      return r || { playing: false, video: false };
    } catch (e) { return { playing: false, error: String(e && e.message) }; }
  }
  function closeYtTv() { if (ytTvOn) { ytTvOn = false; TV.ytClose(); } }
  /** 원격 점검 기록 (비공개 데이터 저장소의 diag.json). */
  let reportChain = Promise.resolve();
  function report(o) {
    if (!TV.report) return;
    const text = JSON.stringify(Object.assign({ at: new Date().toString(), ui: window.UI_VERSION }, o), null, 1);
    // 같은 파일을 덮어쓰므로 잇따른 기록이 서로 부딪치지 않게 6초 간격으로 차례로 보낸다 (지난 기록은 저장소 이력에 남는다)
    reportChain = reportChain.then(() => { try { TV.report(text); } catch (e) { /* 무시 */ } return new Promise((r) => setTimeout(r, 6000)); });
  }

  /** 웹 플레이어가 막히면 TV의 유튜브 앱으로 튼다. '이전'으로 돌아오면 브리핑을 시작한다. */
  function songInYouTubeApp() {
    if (!ringing || songInApp || chime) return;
    clearTimeout(ytCheck);
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) { /* 무시 */ } }
    ytPlayer = null;
    const url = 'https://www.youtube.com/watch?v=' + ytId(songUrl);
    if (TV.openUrl && TV.openUrl(url)) {
      songInApp = true;
      nowPlaying.innerHTML = '<div class="np" style="left:24px"><div class="label">Now playing · YouTube</div>' +
        '<div class="np-title">유튜브 앱에서 노래를 틀었어요</div><div class="label" style="letter-spacing:.12em">리모컨 [이전]을 누르면 브리핑을 시작해요</div></div>';
    } else {
      fallbackChime('노래를 재생할 수 없어 기본 알람음으로 깨워요');
    }
  }
  function fallbackChime(msg) {
    if (!ringing || chime) return;
    closeYtTv();
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) { /* 무시 */ } }
    ytPlayer = null;
    nowPlaying.innerHTML = '<div class="np" style="left:24px"><div class="label">Alarm</div><div class="np-title">' + (msg || '기본 알람음') + '</div>' + WAVE + '</div>';
    chime = playChime();
    report({ kind: 'alarm-chime', msg: msg || '' });
    // 알람음이 작거나 안 날 수도 있어 30초마다 말로도 깨운다 (앱의 기본 알람음도 함께 울린다)
    const say = () => { if (ringing && chime) TV.speak('좋은 아침이에요. 일어날 시간이에요. 아무 버튼이나 누르면 아침 브리핑을 시작해요.'); };
    say();
    wakeVoice = setInterval(say, 30000);
  }
  let wakeVoice = null;

  function stopRing() {
    ringing = false; songInApp = false; clearTimeout(ringTimer); clearTimeout(ytCheck); clearInterval(wakeVoice);
    closeYtTv();
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) { /* 무시 */ } }
    ytPlayer = null;
    nowPlaying.classList.remove('on'); nowPlaying.innerHTML = ''; bPanel.style.bottom = '';
    if (chime) { chime.stop(); chime = null; }
    TV.stopAlarmSound(); if (TV.releaseWake) TV.releaseWake();
    startBriefing();
  }
  /** 노래가 없을 때 부드러운 알람음 (WebAudio). */
  function playChime() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let alive = true;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    (function loop(i) {
      if (!alive) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = 'sine'; o.frequency.value = notes[i % 4];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .05); g.gain.exponentialRampToValueAtTime(.001, t + .9);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 1);
      setTimeout(() => loop(i + 1), i % 4 === 3 ? 1600 : 380);
    })(0);
    return { stop() { alive = false; ctx.close(); } };
  }

  /**
   * 브리핑: 인사·날짜·날씨·할 일은 누르자마자 읽고, 오래 걸리는 뉴스 요약(Gemini)은 그동안 마저 만들어 이어 읽는다.
   * 뉴스 요약은 30분 동안 다시 쓰고, 알람 노래가 나오는 동안 미리 만들어 둔다 ('다시 듣기'도 바로 읽는다).
   */
  let newsPrep = null, briefSeq = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function prepareNews(fresh) {
    if (!fresh && newsPrep && Date.now() - newsPrep.at < 30 * 60000) return newsPrep.p;
    const p = newsBriefing();
    newsPrep = { at: Date.now(), p };
    p.catch(() => { if (newsPrep && newsPrep.p === p) newsPrep = null; });
    return p;
  }
  async function briefIntro() {
    const now = new Date();
    let text = '좋은 아침이에요. 오늘은 ' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + '일월화수목금토'[now.getDay()] + '요일입니다.\n\n';
    if (!weather) await Promise.race([loadWeather(), sleep(3000)]); // 날씨가 늦으면 빼고 바로 시작한다
    if (weather) text += CITY + ' 날씨는 지금 ' + weather.label + ', 기온 ' + weather.t + '도, 체감 ' + weather.feel + '도입니다. 오늘 최고 ' +
      weather.hi + '도, 최저 ' + weather.lo + '도, 비 올 확률은 ' + weather.rain + '퍼센트예요.\n\n';
    const todos = todayReminders();
    if (todos.length) text += '오늘 할 일은 ' + todos.map((r) => (r.time ? spokenTime(r.time) + ' ' : '') + r.text).join(', ') + '입니다.\n\n';
    return text.trim();
  }
  /** 지금 읽는 글이 끝날 때까지 기다린다: 새 앱은 음성 엔진 상태로, 예전 앱은 글 길이로 어림한다 (1초에 7자쯤). */
  async function speechDone(text, my) {
    const est = 1500 + text.length * 150, t0 = Date.now();
    if (!TV.ttsState) return sleep(est);
    let seen = false, quiet = 0;
    while (my === briefSeq && Date.now() - t0 < est + 15000) {
      await sleep(400);
      if (TV.ttsState() === '읽는 중') { seen = true; quiet = 0; } else if ((seen || Date.now() - t0 > 4000) && ++quiet >= 2) return;
    }
  }
  async function startBriefing() {
    TV.stopSpeak();
    const my = ++briefSeq, t0 = Date.now();
    const stale = () => my !== briefSeq || current !== 'brief'; // 준비하는 사이 다른 화면으로 갔거나 다시 눌렀으면 읽지 않는다
    document.getElementById('b-tag').textContent = 'MORNING BRIEFING';
    const st = document.getElementById('b-status'), body = document.getElementById('b-body');
    st.innerHTML = 'PREPARING' + WAVE; body.textContent = '';
    let news = null, newsSec = 0;
    const newsReady = prepareNews().catch(() => '지금은 뉴스를 가져오지 못했어요.\n\n' + MOTTO)
      .then((t) => { news = t; newsSec = Math.round((Date.now() - t0) / 1000); });
    const intro = await briefIntro();
    if (stale()) return;
    const introSec = Math.round((Date.now() - t0) / 1000);
    st.textContent = 'TODAY'; body.textContent = intro; TV.speak(intro); followText(intro);
    await speechDone(intro, my);
    if (stale()) return;
    const waited = news === null;
    if (waited) { // 뉴스가 아직이면 조용히 기다리지 않고 알려 준다
      st.innerHTML = 'NEWS' + WAVE;
      TV.speak('이어서 오늘의 뉴스를 정리하고 있어요. 잠시만 기다려 주세요.');
      await newsReady;
      if (stale()) return;
    }
    const text = intro + '\n\n' + news;
    st.textContent = 'TODAY'; body.textContent = text; TV.speak(news); followText(text);
    // 걸린 시간과 음성 엔진이 실제로 읽는지 남긴다 (음성 상태는 새 앱만 알려 준다)
    setTimeout(() => report({ kind: 'briefing-time', introSec, newsSec, waited, tts: TV.ttsState ? TV.ttsState() : null }), 3000);
    try {
      if (TV.report && localStorage.getItem('reportedBrief') !== window.UI_VERSION) {
        localStorage.setItem('reportedBrief', window.UI_VERSION);
        report({ kind: 'briefing', text });
      }
    } catch (e) { /* 무시 */ }
  }
  function spokenTime(t) {
    const [hh, mm] = t.split(':').map(Number);
    return (hh < 12 ? '오전 ' : '오후 ') + ((hh % 12) || 12) + '시' + (mm ? ' ' + mm + '분' : '');
  }
  /** 브리핑 뉴스 분야: 구글 뉴스(한국어)의 실제 헤드라인. n은 고를 소식 수. */
  const NEWS_FEEDS = [
    { name: '주요 뉴스', n: 3, url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
    { name: '일본 소식', n: 2, q: '일본 when:1d' },
    { name: '세계 경제 소식', n: 2, q: '(뉴욕증시 OR 연준 OR 국제유가 OR 달러 OR 세계 경제 OR 미국 경제 OR 중국 경제) when:1d' },
    { name: 'AI 기술 소식', n: 2, q: '(오픈AI OR 앤트로픽 OR 제미나이 OR 엔비디아 OR 생성형 AI OR AI 모델 OR 빅테크 AI) when:1d' },
  ];
  const gnews = (q) => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=ko&gl=KR&ceid=KR:ko';
  const MOTTO = '오늘의 한마디입니다. 완벽하지 않아도 괜찮아요. 오늘 할 수 있는 한 걸음이면 충분합니다.';
  async function newsBriefing() {
    const got = await Promise.all(NEWS_FEEDS.map((f) => headlines(f.url || gnews(f.q), 10).catch(() => [])));
    const secs = NEWS_FEEDS.map((f, i) => Object.assign({ hs: got[i] }, f)).filter((x) => x.hs.length);
    if (!secs.length) return '지금은 뉴스를 가져오지 못했어요.\n\n' + MOTTO;
    try {
      const text = await call('ask', PERSONA, '아래는 방금 가져온 실제 뉴스 헤드라인이야. 분야별로 나눠 두었어.\n\n' +
        secs.map((x) => '[' + x.name + '] ' + x.n + '가지\n' + x.hs.map((t) => '- ' + t).join('\n')).join('\n\n') +
        '\n\n아침 브리핑으로 소리 내어 읽을 글을 써 줘. 분야마다 "' + secs[0].name + '입니다."처럼 분야 이름으로 시작하고, ' +
        '적힌 개수만큼 중요한 소식을 골라 \'첫 번째 소식\', \'두 번째 소식\'처럼 한두 문장씩 쉽게 소개해. 여러 분야에 같은 소식이 있으면 한 번만 말해. ' +
        '헤드라인에 없는 사실·숫자·배경은 절대 지어내지 말고, 헤드라인 내용만 풀어서 말해. ' +
        '사람 이름에 헤드라인에 없는 직함(대통령·장관 등)을 붙이지 말고, 尹·李 같은 한 글자 약칭은 이름만으로 풀어 (예: 尹 → 윤석열). ' +
        '맨 끝에는 "오늘의 한마디입니다."로 시작하는 짧은 동기부여 한마디를 한두 문장으로 덧붙여. ' +
        '인사말과 날짜는 빼고, 목록 기호 없이, 분야 사이는 빈 줄로 나눠.');
      return /오늘의 한마디/.test(text) ? text : text + '\n\n' + MOTTO;
    } catch (e) {
      return secs.map((x) => x.name + '입니다.\n' + x.hs.slice(0, x.n).join('.\n') + '.').join('\n\n') + '\n\n' + MOTTO;
    }
  }
  /** 구글 뉴스 RSS의 실제 헤드라인 (언론사 이름·머리표 제거). */
  async function headlines(url, n) {
    const xml = await call('httpGet', url);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return [...doc.querySelectorAll('item > title')].slice(0, n).map((t) =>
      t.textContent.replace(/\s-\s[^-]+$/, '').replace(/^\[[^\]]*\]\s*/, '').trim()).filter(Boolean);
  }

  // ---------- 알람·할 일 보기 (설정은 폰에서) ----------
  const al = screen('alarm');
  al.appendChild(h('div', { class: 'page-title' }, '<small>ALARM · SCHEDULE</small>알람과 할 일'));
  const alPanel = h('div', { class: 'card panel' });
  al.appendChild(alPanel);
  const alSync = focusable(h('div', { class: 'pill', style: px(800, 40, 120, 36), on: () => { alSync.textContent = '받는 중…'; call('syncNow').then(() => { loadData(); openAlarm(); toast('폰 설정을 받아 왔어요'); }).catch((e) => toast('받아 오기 실패: ' + e.message)).finally(() => { alSync.textContent = '지금 받기'; }); } }, '지금 받기'));
  al.appendChild(alSync);
  // 유튜브 프리미엄 연결: 유튜브 TV 화면에서 로그인 → 폰으로 youtube.com/activate에 코드 입력 (닫기는 [이전])
  const alYt = focusable(h('div', { class: 'pill', style: px(656, 40, 130, 36), on: () => {
    TV.ytOpen(YT_TV, YT_UA, 0, 0, 1, 1, true);
    toast('유튜브에서 로그인 → 폰으로 youtube.com/activate 에 코드 입력 · 닫기는 [이전]');
  } }, '유튜브 연결'));
  if (TV.ytOpen) al.appendChild(alYt);
  window.onTvYtClosed = function () { if (current === 'alarm') setFocus(alYt); toast('유튜브 화면을 닫았어요'); };
  al.appendChild(h('div', { class: 'hint' }, '폰에서 설정 · tlsdnwls1201-lab.github.io/tvhome-ui/phone      뒤로 · 홈으로'));
  function openAlarm() {
    const today = new Date().getDay();
    const order = [1, 2, 3, 4, 5, 6, 0];
    const rows = order.map((d) => {
      const c = ((DATA.alarm || {}).days || {})[DAY_KEYS[d]] || {}, song = c.song && c.song.title;
      return '<div class="sched' + (d === today ? ' today' : '') + '"><span class="sd">' + KDAY[d] + '</span>' +
        '<span class="st">' + (c.on ? c.time : '—') + '</span><span class="ss">' + (c.on ? esc(song || '') : '꺼짐') + '</span></div>';
    }).join('');
    const def = (DATA.alarm || {}).song || {};
    const now = Date.now(), f = new Date();
    const rems = (DATA.reminders || []).filter((r) => !r.done && new Date(r.date + 'T' + (r.time || '23:59')) >= new Date(f.getFullYear(), f.getMonth(), f.getDate()))
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 6);
    alPanel.innerHTML =
      '<div style="position:absolute;left:30px;top:24px;width:330px"><div class="label">Weekly alarm</div><div style="margin-top:10px">' + rows + '</div></div>' +
      '<div style="position:absolute;left:400px;top:24px;right:30px"><div class="label">Default song</div>' +
      '<div style="margin-top:8px;font-size:15px">' + esc(def.title || (def.url ? def.url : '설정 안 됨 · 기본 알람음')) + '</div>' +
      '<div class="label" style="margin-top:26px">Upcoming · 할 일</div><div style="margin-top:8px">' +
      (rems.length ? rems.map((r) => '<div class="todo"><b>' + r.date.slice(5).replace('-', '/') + ' ' + (r.time || '') + '</b>' + esc(r.text) + '</div>').join('')
        : '<div class="todo none">예정된 할 일이 없어요</div>') + '</div></div>';
    show('alarm', alSync);
  }

  // ---------- 리모컨 키 ----------
  addEventListener('keydown', (ev) => {
    const k = ev.key;
    if (current === 'brief' && ringing) { ev.preventDefault(); stopRing(); return; }
    const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];
    if (dir) { ev.preventDefault(); move(dir); return; }
    if (k === 'Enter' || k === ' ') { ev.preventDefault(); if (focused) focused.click(); return; }
    if (/^[0-9]$/.test(k) && current === 'home') { typeDigit(k); return; }
    if ((k === 'Escape' || k === 'Backspace') && !isTV) { window.onTvBack(); }
  });

  // 셸이 부르는 함수들
  window.onTvBack = function () {
    if (current === 'home') return false;
    TV.stopSpeak(); clearInterval(follow);
    if (ringing) { stopRing(); return true; }
    show('home', firstChannel);
    return true;
  };
  window.onTvMic = function () { openAsk(true); };
  window.onTvAlarm = function () { openBriefing(true); return true; };   // 예전 셸 호환
  let lastAlarm = 0;
  window.onTvEvent = function (ev) {
    if (ev && ev.type === 'alarm') {
      // 클라우드 링크와 앱 예약 알람이 잇따라 와도 한 번만 울린다 (이미 브리핑 중이면 노래를 다시 틀지 않게)
      if (Date.now() - lastAlarm < 3 * 60000) return true;
      lastAlarm = Date.now(); loadData(); openBriefing(true); return true;
    }
    if (ev && ev.type === 'reminder') return true; // 할 일은 아침 브리핑에서만 알린다
    return false;
  };
  window.onTvResume = function () {
    if (ringing && songInApp) { stopRing(); return; } // 유튜브 앱에서 [이전]으로 돌아옴 → 브리핑
    loadWeather(); loadData(); syncData(); checkVersion();
  };

  // 새 화면이 올라오면 다시 불러온다
  async function checkVersion() {
    try {
      const j = await (await fetch('version.json?t=' + Date.now(), { cache: 'no-store' })).json();
      if (window.UI_VERSION && window.UI_VERSION !== 'offline' && j.version && j.version !== window.UI_VERSION && current === 'home') TV.reload();
    } catch (e) { /* 오프라인 */ }
  }

  show('home', firstChannel);
  // 앱이 알람(또는 클라우드 링크)으로 처음 켜졌다면 기다리던 알람을 받아 온다
  try { const pe = TV.takeEvent && TV.takeEvent(); if (pe) setTimeout(() => window.onTvEvent(JSON.parse(pe)), 300); } catch (e) { /* 무시 */ }
  // 새 화면 버전을 처음 띄울 때 한 번, 앱 버전을 원격 점검 기록에 남긴다 (새 앱이 깔렸는지 확인용)
  try {
    const mark = window.UI_VERSION + '/' + info.shell;
    if (TV.report && window.UI_VERSION && localStorage.getItem('reportedUi') !== mark) {
      localStorage.setItem('reportedUi', mark);
      report({ kind: 'start', shell: info.shell, platform: info.platform, ytTv: !!TV.ytOpen });
    }
  } catch (e) { /* 무시 */ }
  tick(); setInterval(tick, 10000);
  loadWeather(); setInterval(loadWeather, 30 * 60000);
  loadData(); syncData(); setInterval(() => { refreshAlarm(); renderToday(); }, 60000); setInterval(syncData, 10 * 60000);
  setInterval(checkVersion, 3 * 60000);

  // ---------- 브라우저 미리보기용 가짜 TV ----------
  function mockTV() {
    let alarmM = { on: true, hour: 7, minute: 0, days: 31 };
    const next = () => { const d = new Date(); d.setHours(alarmM.hour, alarmM.minute, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d.getTime(); };
    const cb = (id, ok, p, ms) => setTimeout(() => window.__tvcb(id, ok, p), ms || 400);
    return {
      info: () => JSON.stringify({ platform: 'preview', hasKey: true, hasRemote: true, city: '서울', lat: 37.5665, lon: 126.978,
        channels: [['KBS1', '9'], ['KBS2', '7'], ['MBC', '11'], ['SBS', '5'], ['EBS1', '13']] }),
      launchApp: () => true, openStore: () => {}, openNative: (n) => toast('(미리보기) ' + n), watchChannel: () => true,
      genieHome: () => toast('(미리보기) 지니TV'), speak: () => {}, stopSpeak: () => {}, toast: (m) => toast(m),
      reload: () => location.reload(), exit: () => {}, stopAlarmSound: () => {},
      listen: (id) => cb(id, true, '오늘 저녁 메뉴 추천해 줘', 900),
      ask: (id, ins, prompt) => { window.__lastAsk = prompt; cb(id, true, '쌀쌀한 저녁엔 따뜻한 국물 요리가 좋아요. 된장찌개나 김치찌개 어떠세요?', 1200); },
      httpGet: (id) => cb(id, true, '<rss><channel><item><title>미리보기 헤드라인 하나 - 언론사</title></item><item><title>미리보기 헤드라인 둘 - 언론사</title></item></channel></rss>'),
      getData: () => JSON.stringify({ alarm: { song: { title: 'IU - 아침 (미리보기)', url: 'https://youtu.be/dQw4w9WgXcQ' },
        days: { mon: { on: true, time: '07:00' }, tue: { on: true, time: '07:30' }, wed: { on: true, time: '07:00' }, thu: { on: true, time: '07:00' },
          fri: { on: true, time: '07:00' }, sat: { on: false, time: '09:00' }, sun: { on: false, time: '09:00' } } },
        reminders: [{ date: new Date().toISOString().slice(0, 10), time: '15:00', text: '병원 예약 (미리보기)' }] }),
      syncNow: (id) => cb(id, true, '{}'), alarmAck: () => {}, releaseWake: () => {}, openUrl: () => true,
      ytOpen: (url, ua, x, y, w, hh, inter) => { window.__ytMock = { url, x, y, w, h: hh, inter }; toast('(미리보기) 유튜브 TV ' + (inter ? '연결 화면' : '알람 노래')); },
      ytClose: () => { window.__ytMock = null; }, ytKey: () => {},
      // window.__ytAsk를 켜면 재생 확인 창 시험: 스크립트를 이 미리보기 화면에서 그대로 돌린다
      ytEval: (id, js) => cb(id, true, JSON.stringify(window.__ytAsk ? (0, eval)(js)
        : JSON.stringify({ video: true, playing: !!window.__ytMock, t: 9, dur: 228, text: '미리보기' })), 100),
      report: (t) => { window.__report = t; (window.__reports = window.__reports || []).push(JSON.parse(t)); },
      getAlarm: () => JSON.stringify(Object.assign({}, alarmM, { next: alarmM.on ? next() : -1 })),
      setAlarm: (j) => { alarmM = Object.assign(alarmM, JSON.parse(j)); return JSON.stringify(Object.assign({}, alarmM, { next: alarmM.on ? next() : -1 })); },
    };
  }
})();
