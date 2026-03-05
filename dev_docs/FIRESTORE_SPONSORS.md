# 스폰서 탭에서 어드민보다 개수가 적게 나올 때

어드민에서는 7개인데 스폰서 탭에서는 더 적게 보인다면 **Firestore 보안 규칙**을 확인하세요.

- **원인**: 비인증 사용자(일반 방문자)가 `sponsors` 컬렉션을 읽을 때, 규칙에서 `approvalStatus == 'approved'` 등으로 제한해 두었을 수 있습니다.
- **해결**: 스폰서 탭과 어드민이 **같은 목록**(삭제되지 않은 스폰서 전부)을 보이게 하려면, `sponsors`에 대한 **read** 규칙에서 **삭제되지 않은 문서는 모두 읽기 허용**하도록 설정합니다.

예시 (Firebase Console → Firestore Database → 규칙):

```
// sponsors: 공개 페이지에서 어드민과 동일한 목록을 보이려면 read 허용
match /sponsors/{id} {
  allow read: if true;   // 필요 시 조건 추가 (예: 특정 필드 검사)
  allow write: if request.auth != null;
}
```

`allow read`에 `approvalStatus == 'approved'` 같은 조건이 있으면, pending 스폰서는 공개 페이지에 안 나옵니다. 어드민과 같은 7개를 보이게 하려면 read를 위처럼 완화하거나, 조건을 제거해 보세요.
