# 우리집 TV 홈 화면

TV 셸 앱(`com.woojin.tvhome`)이 불러오는 웹 화면이에요. 이 저장소의 파일을 고쳐서 `deploy.sh`로 올리면,
TV가 다음에 화면을 열 때(또는 몇 분 안에) 새 화면을 보여 줘요. 앱을 다시 설치할 필요가 없어요.

- `index.html` : version.json을 읽고 그 버전의 CSS·JS를 불러오는 로더
- `app.css` / `app.js` : 대시보드, AI 질문, 아침 브리핑, 알람 설정 화면
- 기기 기능(앱 실행, 채널, 음성, 알람, Gemini)은 셸 앱의 `window.TV`가 제공해요. 키는 앱 안에만 있어요.
