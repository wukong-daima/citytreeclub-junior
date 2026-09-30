# GitHub에서 온라인 배포하기

로컬 서버는 필요 없습니다. GitHub Actions가 검사·빌드한 뒤 Cloudflare Workers에 웹앱과 API를 배포합니다. 기록은 D1, 사진은 비공개 R2 버킷에 저장합니다. GitHub Pages는 서버 API를 실행하지 않아 이 앱의 전체 기능 배포 대상으로 사용하지 않습니다.

## 최초 1회 연결

1. Cloudflare 대시보드에서 Workers의 `workers.dev` 하위 도메인을 설정합니다.
2. D1 데이터베이스 `citytreeclub-junior`를 만들고 Database ID를 복사합니다.
3. R2 버킷 `citytreeclub-junior-photos`를 만듭니다. **Public access는 켜지 않습니다.** 사진은 권한을 확인하는 앱 API로 제공합니다. R2 활성화 시 결제 수단을 요구할 수 있으며 무료 한도 초과 비용은 계정에서 확인하세요.
4. 해당 계정만 대상으로 Workers Scripts: Edit, D1: Edit, Workers R2 Storage: Edit 권한의 API 토큰을 발급합니다. 계정 읽기 권한이 필요할 경우 Account Settings: Read를 추가합니다. 토큰을 코드나 채팅에 붙이지 않습니다.
5. [저장소 Actions 설정](https://github.com/wukong-daima/citytreeclub-junior/settings/secrets/actions)에 **Secrets**를 등록합니다.
   - `CLOUDFLARE_API_TOKEN`: 위 토큰
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 계정 ID
6. 같은 설정의 **Variables**에 등록합니다.
   - `CLOUDFLARE_DATABASE_ID`: 위 D1 Database ID (이 값이 있으면 배포 작업 활성화)
   - `CLOUDFLARE_R2_BUCKET`: 버킷명을 변경한 경우만 지정
7. [Actions](https://github.com/wukong-daima/citytreeclub-junior/actions) → **Verify and deploy** → **Run workflow**를 실행합니다. 이후 main에 push하면 자동 재배포합니다.
8. 성공한 `Publish application` 로그에 표시되는 `https://citytreeclub-junior.<계정 하위 도메인>.workers.dev` 주소로 접속합니다. 실제 성공 로그 확인 전에는 이 주소가 발급되었다고 간주하지 않습니다.

DB ID가 없으면 검증만 실행하고 배포는 건너뜁니다. 인증 정보가 누락되면 배포 단계는 명시적으로 실패합니다. 저장소는 비공개 상태로 유지할 수 있지만 `workers.dev` 웹앱은 공개 접근 가능합니다. 현재 샘플 나무/익명 계정 체험 앱이며, 실제 개인정보를 수집하는 정식 운영 전에는 README의 미연결 운영 항목을 완료해야 합니다.

## 온라인 검증

배포 후 HTTP 응답과 `/api/trees?lat=37.5445&lng=127.0374&radius=500` JSON을 확인합니다. API 스모크 테스트는 `TEST_ORIGIN`을 실제 배포 주소로 지정하여 실행할 수 있습니다. 테스트는 원격 데이터에 체험 기록을 생성하므로 운영 데이터와 분리된 테스트 배포를 권장합니다. 로컬 서버를 실행하지 않습니다.

참고: [Cloudflare GitHub Actions 공식 안내](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/), [GitHub Pages 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
