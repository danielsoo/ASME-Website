# Firebase 콘솔에서 직접 계정 승급하기

## yqp5187@psu.edu 계정을 회장으로 승급시키기

### 1. Firebase Console 접속
- https://console.firebase.google.com/
- 프로젝트 선택

### 2. Firestore Database 이동
- 좌측 메뉴에서 "Firestore Database" 클릭

### 3. users 컬렉션 찾기
- `users` 컬렉션 클릭
- 문서 ID `uS6yWInENhfqiitg5djBftBclgD2` 클릭 (또는 yqp5187@psu.edu가 있는 문서)

### 4. 필드 수정
다음 필드를 클릭하여 수정:

**status 필드:**
- 현재: `"pending"`
- 변경: `"approved"`

**role 필드:**
- 현재: 없음 (또는 `"member"`)
- 변경: `"President"` (새 필드 추가 또는 기존 필드 수정)

### 5. 저장
- 우측 상단 "Update" 버튼 클릭

### 6. 확인
수정 후:
- `status`: `approved`
- `role`: `President`

이제 `#/login`에서 로그인할 수 있습니다!
