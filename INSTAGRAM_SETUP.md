# Instagram API 설정 가이드

## 개요
"Coming Up" 섹션에 실제 Instagram 피드를 표시하기 위해 Instagram API를 사용합니다.

## Access Token 발급 방법

### 방법 1: Instagram Basic Display API (개인 계정)

1. **Facebook Developer 계정 생성**
   - https://developers.facebook.com/ 접속
   - 계정 생성 및 로그인

2. **앱 생성**
   - "내 앱" → "앱 만들기" 클릭
   - "소비자" 또는 "없음" 선택
   - 앱 이름 입력 (예: "ASME Website")

3. **Instagram Basic Display 제품 추가**
   - 앱 대시보드에서 "제품 추가" 클릭
   - "Instagram Basic Display" 선택

4. **OAuth 리디렉션 URI 설정**
   - "Instagram 앱 ID" 섹션에서 "기본 표시" 클릭
   - "유효한 OAuth 리디렉션 URI"에 추가:
     ```
     http://localhost:3000/auth/instagram/callback
     ```
   - 또는 배포된 도메인:
     ```
     https://yourdomain.com/auth/instagram/callback
     ```

5. **테스트 사용자 추가**
   - "역할" → "역할" → "Instagram 테스터" 추가
   - Instagram 계정 사용자 이름 입력

6. **Access Token 발급**
   - 다음 URL로 이동 (앱 ID와 리디렉션 URI를 실제 값으로 변경):
     ```
     https://api.instagram.com/oauth/authorize
       ?client_id=YOUR_APP_ID
       &redirect_uri=YOUR_REDIRECT_URI
       &scope=user_profile,user_media
       &response_type=code
     ```
   - 인증 후 리디렉션된 URL에서 `code` 파라미터 복사
   - 다음 명령어로 Access Token 교환 (터미널에서):
     ```bash
     curl -X POST https://api.instagram.com/oauth/access_token \
       -F client_id=YOUR_APP_ID \
       -F client_secret=YOUR_APP_SECRET \
       -F grant_type=authorization_code \
       -F redirect_uri=YOUR_REDIRECT_URI \
       -F code=YOUR_CODE
     ```
   - 응답에서 `access_token` 복사

### 방법 2: Instagram Graph API (비즈니스/크리에이터 계정)

1. **Instagram 계정을 비즈니스 계정으로 전환**
   - Instagram 앱 → 설정 → 계정 → 전문 계정으로 전환

2. **Facebook 페이지 연결**
   - Instagram 계정을 Facebook 페이지에 연결

3. **Facebook Developer에서 설정**
   - Facebook Developer에서 앱 생성
   - "Instagram Graph API" 제품 추가
   - Facebook 페이지와 Instagram 계정 연결

4. **Access Token 발급**
   - Graph API Explorer 사용: https://developers.facebook.com/tools/explorer/
   - 또는 Facebook Marketing API 사용

## Access Token 설정

### 환경 변수 사용 (권장)

프로젝트 루트에 `.env` 파일 생성:

```env
VITE_INSTAGRAM_ACCESS_TOKEN=your_access_token_here
```

### Firebase Firestore 사용

Firestore에 설정 저장:

```javascript
// Firebase Console에서 수동으로 추가하거나
// Admin 페이지에서 설정할 수 있도록 코드 추가 가능
{
  collection: 'settings',
  document: 'instagram',
  data: {
    accessToken: 'your_access_token_here',
    updatedAt: new Date().toISOString()
  }
}
```

## Access Token 갱신

Instagram Basic Display API의 Access Token은 **60일** 후 만료됩니다.

### 장기 Access Token 발급

1. 단기 Access Token으로 장기 토큰 교환:
   ```bash
   curl -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
   ```

2. 장기 토큰은 **60일** 동안 유효하며, 만료 전에 갱신 가능

### 자동 갱신

Firebase Functions를 사용하여 자동 갱신 설정 가능 (추후 구현)

## CORS 문제 해결

Instagram API를 클라이언트에서 직접 호출하면 CORS 오류가 발생할 수 있습니다.

### 해결 방법: Firebase Functions 사용

1. Firebase Functions 프로젝트 생성
2. Instagram API 호출을 서버 사이드에서 처리
3. 클라이언트는 Firebase Functions를 호출

예시:
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const getInstagramPosts = functions.https.onCall(async (data, context) => {
  const accessToken = functions.config().instagram.access_token;
  // Instagram API 호출
  // ...
});
```

## 테스트

1. Access Token 설정 후
2. `npm run dev` 실행
3. Events 페이지의 "Coming Up" 섹션 확인
4. 브라우저 콘솔에서 오류 확인

## 문제 해결

### "Instagram Access Token not found" 경고
- `.env` 파일에 `VITE_INSTAGRAM_ACCESS_TOKEN` 설정 확인
- 또는 Firebase Firestore에 토큰 저장 확인

### CORS 오류
- Firebase Functions로 마이그레이션 필요
- 또는 프록시 서버 사용

### 401 Unauthorized
- Access Token이 만료되었거나 잘못됨
- 새로 발급 필요

### 빈 피드
- Instagram 계정에 게시물이 있는지 확인
- API 권한 확인 (user_media 스코프 필요)
