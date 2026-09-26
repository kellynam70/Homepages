# 비밀번호 재설정 설정

로그인 화면의 **비밀번호를 잊으셨나요?** 링크에서 재설정 메일을 요청합니다.
메일의 링크를 열면 새 비밀번호를 두 번 입력해 저장할 수 있습니다.
계정 생성이나 관리자 권한 부여 기능은 추가하지 않습니다.

## Supabase에서 한 번 확인할 설정

- Authentication → URL Configuration의 Site URL은 실제 홈페이지 주소를 사용합니다.
- Redirect URLs에는 실제 배포 경로의 `reset-password.html` 주소를 정확히 등록합니다.
  프로젝트가 하위 경로에 배포되면 그 경로도 포함합니다.
- 현재 로컬 미리보기의 주소는 `http://127.0.0.1:8765/reset-password.html`입니다.
- 메일 템플릿을 수정했다면 재설정 링크에 Supabase의 `{{ .ConfirmationURL }}`을 사용합니다.
- Authentication → Users에서 관리자 이메일로 계정이 존재하는지 확인합니다.

로컬 주소로 요청한 메일은 미리보기 서버가 켜진 동일한 컴퓨터에서 열어야 합니다.
사이트 설정과 실제 메일 수신은 자동 테스트로 검증되지 않습니다.
기존 비밀번호를 알아내거나 계정 존재 여부를 공개적으로 표시하지 않습니다.

## 확인

`npm test`는 가짜 인증 응답으로 입력 검증, 만료 링크, 재시도, 재설정 저장 흐름을 검사합니다.
실제 재설정 메일 발송과 비밀번호 입력·저장은 계정 소유자가 직접 수행합니다.

참고: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
