# Instagram API setup

## Overview
The **Coming Up** section uses the Instagram API to show a real Instagram feed.

## How to obtain an access token

### Option 1: Instagram Basic Display API (personal accounts)

1. **Create a Facebook Developer account**
   - Go to https://developers.facebook.com/
   - Sign up and log in.

2. **Create an app**
   - **My Apps** → **Create App**.
   - Choose **Consumer** or **None**.
   - Enter an app name (e.g. **ASME Website**).

3. **Add Instagram Basic Display**
   - In the app dashboard, **Add Product**.
   - Select **Instagram Basic Display**.

4. **OAuth redirect URIs**
   - Under **Instagram App ID**, open **Basic Display**.
   - Under **Valid OAuth Redirect URIs**, add:
     ```
     http://localhost:3000/auth/instagram/callback
     ```
   - For production, also add:
     ```
     https://yourdomain.com/auth/instagram/callback
     ```

5. **Add test users**
   - **Roles** → **Roles** → add **Instagram Testers**.
   - Enter the Instagram username.

6. **Get an access token**
   - Open this URL (replace app ID and redirect URI with yours):
     ```
     https://api.instagram.com/oauth/authorize
       ?client_id=YOUR_APP_ID
       &redirect_uri=YOUR_REDIRECT_URI
       &scope=user_profile,user_media
       &response_type=code
     ```
   - After auth, copy the `code` query parameter from the redirect URL.
   - Exchange it for a token (terminal):
     ```bash
     curl -X POST https://api.instagram.com/oauth/access_token \
       -F client_id=YOUR_APP_ID \
       -F client_secret=YOUR_APP_SECRET \
       -F grant_type=authorization_code \
       -F redirect_uri=YOUR_REDIRECT_URI \
       -F code=YOUR_CODE
     ```
   - Copy `access_token` from the response.

### Option 2: Instagram Graph API (business / creator accounts)

1. **Switch Instagram to a business account**
   - Instagram app → Settings → Account → switch to professional.

2. **Connect a Facebook Page**
   - Link the Instagram account to a Facebook Page.

3. **Configure in Facebook Developer**
   - Create an app and add **Instagram Graph API**.
   - Connect the Facebook Page and Instagram account.

4. **Get an access token**
   - Use Graph API Explorer: https://developers.facebook.com/tools/explorer/
   - Or use the Facebook Marketing API.

## Configure the access token

### Environment variable (recommended)

Create `.env` at the project root:

```env
VITE_INSTAGRAM_ACCESS_TOKEN=your_access_token_here
```

### Firebase Firestore

Store settings in Firestore:

```javascript
// Add manually in Firebase Console, or via Admin UI when implemented
{
  collection: 'settings',
  document: 'instagram',
  data: {
    accessToken: 'your_access_token_here',
    updatedAt: new Date().toISOString()
  }
}
```

## Token refresh

Instagram Basic Display tokens expire after **60 days**.

### Long-lived token

1. Exchange a short-lived token for a long-lived one:
   ```bash
   curl -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
   ```

2. Long-lived tokens last **60 days** and can be refreshed before expiry.

### Automatic refresh

You can automate refresh with Firebase Functions (future work).

## CORS

Calling the Instagram API directly from the browser may hit CORS errors.

### Fix: use Firebase Functions

1. Create a Firebase Functions project.
2. Call Instagram from the server.
3. Call the function from the client.

Example:

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const getInstagramPosts = functions.https.onCall(async (data, context) => {
  const accessToken = functions.config().instagram.access_token;
  // Call Instagram API ...
});
```

## Testing

1. Set the access token.
2. Run `npm run dev`.
3. Check the **Coming Up** section on Events.
4. Watch the browser console for errors.

## Troubleshooting

### "Instagram Access Token not found"
- Check `VITE_INSTAGRAM_ACCESS_TOKEN` in `.env`.
- Or confirm the token is stored in Firestore.

### CORS errors
- Move calls to Firebase Functions or use a proxy.

### 401 Unauthorized
- Token expired or invalid — issue a new token.

### Empty feed
- Confirm the Instagram account has posts.
- Confirm API permissions (`user_media` scope).
