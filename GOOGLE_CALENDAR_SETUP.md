# Google Calendar 연동 설정

사이트에서 구글 캘린더 이벤트를 보려면 **Google Calendar API**를 켜고 **API 키**를 만들어서 프로젝트에 넣어야 합니다.

---

## 1단계: Google Cloud 프로젝트 준비

1. **Google Cloud Console** 접속  
   https://console.cloud.google.com/

2. 상단 프로젝트 선택 → **새 프로젝트** 만들거나, 기존 프로젝트 선택

3. 해당 프로젝트가 선택된 상태로 다음 단계 진행

---

## 2단계: Google Calendar API 사용 설정

1. 왼쪽 메뉴 **☰** → **API 및 서비스** → **라이브러리**

2. 검색창에 **"Google Calendar API"** 입력

3. **Google Calendar API** 클릭 → **사용** 버튼 클릭

---

## 3단계: API 키 만들기

1. 왼쪽 메뉴 **☰** → **API 및 서비스** → **사용자 인증 정보**

2. **+ 사용자 인증 정보 만들기** → **API 키** 선택

3. API 키가 생성되면 **복사** (나중에 다시 볼 수 있음)

4. (권장) **API 키 제한** 설정:
   - 생성된 키 옆 **연필(편집)** 클릭
   - **애플리케이션 제한사항**에서 **HTTP 리퍼러** 선택
   - **웹사이트 제한**에 다음 추가:
     - 개발: `http://localhost:3000/*` (또는 사용 중인 로컬 주소)
     - 배포 도메인: `https://yourdomain.com/*`
   - **API 제한사항**에서 **키 제한** → **Google Calendar API**만 선택
   - **저장**

---

## 4단계: 프로젝트에 API 키 넣기

1. 프로젝트 루트(`asme_web`)에 **`.env.local`** 파일이 없으면 새로 만듭니다.

2. 아래 한 줄을 추가합니다 (값은 본인 API 키로 바꿈):

   ```
   VITE_GOOGLE_CALENDAR_API_KEY=여기에_복사한_API_키_붙여넣기
   ```

3. 저장 후 **개발 서버를 다시 실행**합니다.

   ```bash
   npm run dev
   ```

4. 브라우저에서 **홈** 또는 **Events** 페이지를 열면 캘린더 이벤트가 표시됩니다.

---

## 여러 캘린더 사용하기 (Multiple calendars)

여러 구글 캘린더를 한 번에 보이게 하려면 `.env.local`에 **쉼표로 구분**해서 넣으세요.

```env
VITE_GOOGLE_CALENDAR_IDS=캘린더ID1@group.calendar.google.com,캘린더ID2@group.calendar.google.com
```

- **VITE_GOOGLE_CALENDAR_IDS** 를 쓰면 여러 캘린더 이벤트가 **합쳐져서 날짜순**으로 표시됩니다.
- **VITE_GOOGLE_CALENDAR_IDS** 가 없으면 **VITE_GOOGLE_CALENDAR_ID** (한 개) 또는 코드 기본값(회장 캘린더)을 사용합니다.
- **iframe**에도 같은 ID들이 적용되어, 여러 캘린더가 한 달력에 같이 보입니다 (예: ASME Leadership + ASME General Body).

---

## Vercel(배포)에서도 API로 이벤트 보이게 하기

- **localhost**는 `.env.local` 값을 쓰고, **Vercel**은 Vercel 대시보드의 **Environment Variables** 값을 씁니다. 둘을 다르게 두면 localhost는 Leadership, Vercel은 General Body처럼 **서로 다른 캘린더**를 보게 됩니다.
- **둘 다 같은 이벤트 목록(This Week / Past Events)을 쓰게 하려면** 두 환경 모두 아래를 설정해야 합니다.
  1. **Vercel**: 프로젝트 → **Settings** → **Environment Variables**
     - `VITE_GOOGLE_CALENDAR_API_KEY` = (위에서 만든 API 키)
     - `VITE_GOOGLE_CALENDAR_IDS` = `Leadership캘린더ID,GeneralBody캘린더ID` (쉼표 구분)
  2. **로컬** `.env.local`에도 같은 API 키와 **같은 캘린더 ID 목록**을 넣으면, localhost와 Vercel이 **같은 캘린더들**을 API로 가져와서 표시합니다.
- Leadership과 General Body **둘 다** 보이게 하려면 한 환경 변수에 두 ID를 쉼표로 넣으면 됩니다.  
  예: `VITE_GOOGLE_CALENDAR_IDS=id1@group.calendar.google.com,id2@group.calendar.google.com`

---

## 문제 해결

- **403 에러가 계속 나올 때**
  - Google Calendar API가 **사용 설정**되었는지 확인
  - `.env.local`에 `VITE_GOOGLE_CALENDAR_API_KEY`가 정확히 들어갔는지 확인 (앞뒤 공백 없이)
  - 서버를 한 번 종료했다가 다시 `npm run dev`로 실행

- **이벤트가 안 보일 때 / 404 Not Found**
  - **Gmail 주소 캘린더**(예: president@gmail.com)는 **반드시 공개**여야 합니다.  
    Google 캘린더 → 해당 캘린더 **설정 및 공유** → **일반**에서 **"공개 캘린더로 만들기"** 또는 **접근 권한**에서 "모든 사용자에게 일정 정보 보기" 켜기.  
    비공개면 API 키로 접근 불가 → 404 발생.
  - **그룹 캘린더**(xxx@group.calendar.google.com)는 보통 공개 설정만 하면 됩니다.
  - 코드/환경 변수의 캘린더 ID가 실제 캘린더와 같은지 확인

- **API 키가 노출이 걱정될 때**
  - HTTP 리퍼러 제한을 걸어 두면 지정한 도메인에서만 요청 가능
  - `.env.local`은 Git에 올라가지 않으므로 로컬/배포 서버 환경 변수로만 관리하면 됨

---

## How to find your Calendar ID in Google Calendar (English)

1. Go to **https://calendar.google.com** and sign in.

2. On the left, under **My calendars**, find the calendar you want (e.g. the club/president calendar). Click the **three dots (⋮)** next to its name.

3. Click **Settings and sharing**.

4. Scroll down to the **Integrate calendar** section.  
   There you’ll see:
   - **Calendar ID** — a long string like `xxxxx@group.calendar.google.com`  
   This is the calendar address. Copy it if you need to use it (e.g. in `.env.local` as `VITE_GOOGLE_CALENDAR_ID=...`).

5. To confirm it’s the same calendar the app uses, compare this **Calendar ID** with the one in code:  
   `firebase/services.ts` (see the comment above `calendarIdEncoded`).  
   They should match exactly (e.g. `82e3ca73eb13dfa495cf18d223aaf141420dc87ea867004c9b80f978d33b60aa@group.calendar.google.com`).

**Multiple calendars:** To show events from more than one calendar, set in `.env.local`:

```env
VITE_GOOGLE_CALENDAR_IDS=calendarId1@group.calendar.google.com,calendarId2@group.calendar.google.com
```

Use a comma between IDs (no spaces, or trim is applied). Events from all listed calendars are merged and sorted by date.
