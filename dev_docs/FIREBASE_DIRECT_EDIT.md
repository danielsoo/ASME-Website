# Promote an account in the Firebase console

## Promote yqp5187@psu.edu to President

### 1. Open Firebase Console
- https://console.firebase.google.com/
- Select your project.

### 2. Open Firestore Database
- In the left menu, click **Firestore Database**.

### 3. Find the `users` collection
- Open the `users` collection.
- Open document `uS6yWInENhfqiitg5djBftBclgD2` (or the document for yqp5187@psu.edu).

### 4. Edit fields
Update the following:

**`status` field:**
- From: `"pending"`
- To: `"approved"`

**`role` field:**
- From: missing (or `"member"`)
- To: `"President"` (add the field or edit the existing one)

### 5. Save
- Click **Update** in the top right.

### 6. Verify
After saving you should see:
- `status`: `approved`
- `role`: `President`

You can now sign in at `#/login`.
