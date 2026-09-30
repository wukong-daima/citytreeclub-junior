# GitHub Pages 무료 배포

현재 앱은 GitHub Pages 전용 정적 React 앱입니다. Cloudflare 계정·결제 수단·API 토큰은 필요하지 않습니다. GitHub 무료 제공 한도 내에서 운영하며 무제한 트래픽을 보장하지 않습니다.

- 저장소: https://github.com/wukong-daima/citytreeclub-junior
- 접속 주소: https://wukong-daima.github.io/citytreeclub-junior/
- Actions: `.github/workflows/pages.yml` / **Deploy GitHub Pages**
- Pages Source: **GitHub Actions**
- Vite base: `/citytreeclub-junior/`

main에 push하면 Node24에서 설치→타입→린트→테스트→정적 빌드 후 `dist`를 Pages에 배포합니다. 배포 성공은 Actions의 deploy 작업과 실제 접속 응답으로 확인합니다. 소스만 업로드된 상태와 실제 웹 배포 완료를 구분하세요.

개인 기록과 사진은 방문자의 브라우저 IndexedDB에만 저장되며 GitHub 저장소·Actions·서버에 전송하지 않습니다. 앱 내 백업·복원 버튼으로 다른 기기로 옮길 수 있습니다. 사이트 주소 공유는 개인 기록을 공유하지 않습니다.

문제가 생기면 Actions의 실패 단계를 확인합니다. 로컬 웹서버는 실행하지 않습니다. `npm test`와 `npm run build`는 웹서버를 띄우지 않는 검사입니다. 실제 UI 검사는 배포된 온라인 주소에서 수행합니다.

이전 Cloudflare 워크플로 및 API 토큰/계정 ID Secrets는 삭제되었습니다. Cloudflare 탈퇴·사용자 계정의 다른 리소스 삭제는 이 프로젝트 작업에 포함되지 않습니다.
