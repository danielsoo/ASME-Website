# 구글 로그인 사용 설정 (Firebase)

로그인 페이지의 "Google" 버튼이 동작하려면 Firebase 콘솔에서 **Google** 로그인 방법을 켜야 합니다.

## 1. Firebase 콘솔에서 Google 로그인 켜기

1. [Firebase Console](https://console.firebase.google.com/) 접속 후 프로젝트 선택
2. 왼쪽 메뉴 **Build** → **Authentication** 클릭
3. **Sign-in method** 탭 선택
4. **Google** 행에서 **Enable** 클릭 (또는 편집)
5. **Project support email**에 사용할 이메일 선택 (예: president.asme.psu@gmail.com)
6. **Save** 클릭

이후 로그인 페이지에서 "Google" 버튼을 누르면 구글 팝업이 뜨고, 로그인/가입 후 **승인 대기** 상태가 됩니다. 관리자가 승인하면 홈으로 이동합니다.

## 2. (선택) 배포 도메인 등록

사이트를 Vercel 등으로 배포한 경우:

1. **Authentication** → **Settings** 탭 → **Authorized domains**
2. `your-site.vercel.app` 같은 도메인이 없으면 **Add domain**으로 추가

localhost는 기본으로 등록되어 있습니다.
