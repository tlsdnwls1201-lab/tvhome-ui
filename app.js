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
  live.appendChild(h('div', { class: 'label', style: { position: 'absolute', left: '18px', bottom: '18px', letterSpacing: '.12em' } },
    '리모컨 숫자로도 바로 이동'));
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

  const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  function alarmState() { try { return JSON.parse(TV.getAlarm()); } catch (e) { return { on: false, hour: 7, minute: 0, days: 31, next: -1 }; } }
  function refreshAlarm() {
    const a = alarmState();
    if (!a.on || a.next < 0) return aRing.set(0, 'OFF', '알람 꺼짐');
    const left = (a.next - Date.now()) / 86400000, n = new Date(a.next);
    aRing.set(1 - Math.min(1, left), pad(n.getHours()) + ':' + pad(n.getMinutes()), '일월화수목금토'[n.getDay()] + '요일');
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
        const hs = await headlines(15);
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

  function openBriefing(alarm) {
    const now = new Date();
    document.getElementById('b-date').textContent = (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + '일월화수목금토'[now.getDay()] + '요일';
    bClock.set((now.getHours() * 60 + now.getMinutes()) / 1440, pad(now.getHours()) + ':' + pad(now.getMinutes()), 'GOOD MORNING');
    show('brief', bOk);
    if (alarm) {
      ringing = true;
      document.getElementById('b-tag').textContent = 'ALARM';
      document.getElementById('b-status').innerHTML = 'WAKE UP' + WAVE;
      document.getElementById('b-body').textContent = '좋은 아침이에요! 아무 버튼이나 누르면 브리핑을 시작해요.';
      setTimeout(() => { if (ringing) stopRing(); }, 60000);
    } else {
      startBriefing();
    }
  }
  function stopRing() { ringing = false; TV.stopAlarmSound(); startBriefing(); }

  async function startBriefing() {
    TV.stopSpeak();
    document.getElementById('b-tag').textContent = 'MORNING BRIEFING';
    const st = document.getElementById('b-status'), body = document.getElementById('b-body');
    st.innerHTML = 'PREPARING' + WAVE; body.textContent = '';
    const now = new Date();
    let text = '좋은 아침이에요. 오늘은 ' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + '일월화수목금토'[now.getDay()] + '요일입니다.\n\n';
    if (!weather) await loadWeather();
    if (weather) text += CITY + ' 날씨는 지금 ' + weather.label + ', 기온 ' + weather.t + '도, 체감 ' + weather.feel + '도입니다. 오늘 최고 ' +
      weather.hi + '도, 최저 ' + weather.lo + '도, 비 올 확률은 ' + weather.rain + '퍼센트예요.\n\n';
    text += await newsBriefing();
    st.textContent = 'TODAY'; body.textContent = text; TV.speak(text); followText(text);
  }
  async function newsBriefing() {
    let hs;
    try { hs = await headlines(12); } catch (e) { return '뉴스를 가져오지 못했어요.'; }
    if (!hs.length) return '지금은 뉴스를 가져오지 못했어요.';
    try {
      return await call('ask', PERSONA, '아래는 방금 가져온 실제 뉴스 헤드라인이야.\n' + hs.map((x) => '- ' + x).join('\n') +
        '\n이 중 중요한 3가지를 골라 \'첫 번째 소식\', \'두 번째 소식\', \'세 번째 소식\'으로 각각 한두 문장씩 쉽게 소개해. ' +
        '헤드라인에 없는 사실·숫자·배경은 절대 지어내지 말고, 헤드라인 내용만 풀어서 말해. ' +
        '마지막에 하루를 시작하는 짧은 한마디를 덧붙여. 인사말과 날짜는 빼고, 목록 기호 없이 소리 내어 읽기 좋은 문장으로.');
    } catch (e) {
      return '오늘의 주요 뉴스입니다.\n' + hs.slice(0, 3).join('.\n') + '.';
    }
  }
  /** 구글 뉴스 한국판 RSS의 실제 헤드라인 (언론사 이름·머리표 제거). */
  async function headlines(n) {
    const xml = await call('httpGet', 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return [...doc.querySelectorAll('item > title')].slice(0, n).map((t) =>
      t.textContent.replace(/\s-\s[^-]+$/, '').replace(/^\[[^\]]*\]\s*/, '').trim()).filter(Boolean);
  }

  // ---------- 알람 설정 ----------
  const al = screen('alarm');
  al.appendChild(h('div', { class: 'page-title' }, '<small>MORNING ALARM</small>아침 알람'));
  const alPanel = h('div', { class: 'card panel' });
  al.appendChild(alPanel);
  al.appendChild(h('div', { class: 'hint' }, '시·분은 ▲▼로 바꿔요   ·   바꾸면 바로 저장돼요   ·   뒤로 · 홈으로'));
  const alToggle = focusable(h('div', { class: 'pill', style: px(30, 26, 150, 44) }));
  const alHour = focusable(h('div', { class: 'big-num', style: { left: '30px', top: '96px' } }));
  const alMin = focusable(h('div', { class: 'big-num', style: { left: '176px', top: '96px' } }));
  const colon = h('div', { style: { position: 'absolute', left: '153px', top: '112px', fontSize: '50px', fontWeight: 200 } }, ':');
  const alNext = h('div', { class: 'status', style: { position: 'absolute', left: '330px', top: '134px' } });
  alPanel.append(alToggle, alHour, colon, alMin, alNext);
  const dayEls = DAYS.map((d, i) => {
    const e = focusable(h('div', { class: 'day', style: { left: (30 + i * 62) + 'px', top: '236px' } }, d));
    alPanel.appendChild(e);
    return e;
  });
  let alarm = alarmState();
  function renderAlarm() {
    alToggle.textContent = alarm.on ? '알람 켜짐' : '알람 꺼짐';
    alToggle.style.color = alarm.on ? 'var(--white)' : 'var(--sub)';
    alHour.textContent = pad(alarm.hour); alMin.textContent = pad(alarm.minute);
    dayEls.forEach((e, i) => e.classList.toggle('sel', !!(alarm.days & (1 << i))));
    if (!alarm.on || alarm.next < 0) alNext.textContent = '알람이 울리지 않아요';
    else { const n = new Date(alarm.next); alNext.textContent = 'NEXT  ' + (n.getMonth() + 1) + '/' + n.getDate() + ' (' + '일월화수목금토'[n.getDay()] + ') ' + pad(n.getHours()) + ':' + pad(n.getMinutes()); }
  }
  function saveAlarm() { alarm = JSON.parse(TV.setAlarm(JSON.stringify(alarm))); renderAlarm(); refreshAlarm(); }
  alToggle.addEventListener('click', () => { alarm.on = !alarm.on; saveAlarm(); });
  dayEls.forEach((e, i) => e.addEventListener('click', () => { alarm.days ^= (1 << i); saveAlarm(); }));
  function openAlarm() { alarm = alarmState(); renderAlarm(); show('alarm', alToggle); }

  // ---------- 리모컨 키 ----------
  addEventListener('keydown', (ev) => {
    const k = ev.key;
    if (current === 'brief' && ringing) { ev.preventDefault(); stopRing(); return; }
    if (current === 'alarm' && (focused === alHour || focused === alMin) && (k === 'ArrowUp' || k === 'ArrowDown')) {
      const d = k === 'ArrowUp' ? 1 : -1;
      if (focused === alHour) alarm.hour = (alarm.hour + d + 24) % 24; else alarm.minute = (alarm.minute + d * 5 + 60) % 60;
      ev.preventDefault(); saveAlarm(); return;
    }
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
    if (ringing) { ringing = false; TV.stopAlarmSound(); }
    show('home', firstChannel);
    return true;
  };
  window.onTvMic = function () { openAsk(true); };
  window.onTvAlarm = function () { openBriefing(true); return true; };
  window.onTvResume = function () { loadWeather(); refreshAlarm(); checkVersion(); };

  // 새 화면이 올라오면 다시 불러온다
  async function checkVersion() {
    try {
      const j = await (await fetch('version.json?t=' + Date.now(), { cache: 'no-store' })).json();
      if (window.UI_VERSION && window.UI_VERSION !== 'offline' && j.version && j.version !== window.UI_VERSION && current === 'home') TV.reload();
    } catch (e) { /* 오프라인 */ }
  }

  show('home', firstChannel);
  tick(); setInterval(tick, 10000);
  loadWeather(); setInterval(loadWeather, 30 * 60000);
  refreshAlarm(); setInterval(refreshAlarm, 60000);
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
      ask: (id) => cb(id, true, '쌀쌀한 저녁엔 따뜻한 국물 요리가 좋아요. 된장찌개나 김치찌개 어떠세요?', 1200),
      httpGet: (id) => cb(id, true, '<rss><channel><item><title>미리보기 헤드라인 하나 - 언론사</title></item><item><title>미리보기 헤드라인 둘 - 언론사</title></item></channel></rss>'),
      getAlarm: () => JSON.stringify(Object.assign({}, alarmM, { next: alarmM.on ? next() : -1 })),
      setAlarm: (j) => { alarmM = Object.assign(alarmM, JSON.parse(j)); return JSON.stringify(Object.assign({}, alarmM, { next: alarmM.on ? next() : -1 })); },
    };
  }
})();
