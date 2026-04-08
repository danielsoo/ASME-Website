# Google sign-in setup (Firebase)

For the login page **Google** button to work, enable the **Google** sign-in provider in the Firebase console.

## 1. Enable Google sign-in in Firebase

1. Open [Firebase Console](https://console.firebase.google.com/) and select your project.
2. In the left menu, go to **Build** → **Authentication**.
3. Open the **Sign-in method** tab.
4. On the **Google** row, click **Enable** (or **Edit**).
5. Pick a **Project support email** (e.g. president.asme.psu@gmail.com).
6. Click **Save**.

After that, the **Google** button opens the Google popup; after sign-in or sign-up the user is **pending approval** until an admin approves them, then they can reach the home page.

## 2. (Optional) Add your deployment domain

If you deploy to Vercel or another host:

1. Go to **Authentication** → **Settings** → **Authorized domains**.
2. If your domain (e.g. `your-site.vercel.app`) is missing, add it with **Add domain**.

`localhost` is allowed by default.
