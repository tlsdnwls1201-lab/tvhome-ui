#!/bin/zsh
# 웹 화면을 GitHub Pages에 올린다. TV 앱은 version.json이 바뀌면 새 화면을 불러온다.
set -e
cd "$(dirname "$0")"
date +%Y%m%d%H%M%S > /tmp/tvhome_v && printf '{"version":"%s"}\n' "$(cat /tmp/tvhome_v)" > version.json
git add -A
git commit -qm "${1:-화면 업데이트}" || { echo "바뀐 내용이 없어요"; exit 0; }
AUTH=$(printf 'x-access-token:%s' "$($HOME/.local/bin/gh auth token)" | base64)
git -c credential.helper= -c "http.extraheader=AUTHORIZATION: basic $AUTH" push -q origin main
echo "올림: 버전 $(cat /tmp/tvhome_v). GitHub Pages 반영까지 보통 30초~1분."
