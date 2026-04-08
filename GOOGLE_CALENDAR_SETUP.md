# Google Calendar integration

To show Google Calendar events on the site, enable the **Google Calendar API**, create an **API key**, and add it to the project.

---

## Step 1: Prepare a Google Cloud project

1. Open **Google Cloud Console**  
   https://console.cloud.google.com/

2. Select a project from the top bar, or **create a new project**.

3. Keep that project selected for the next steps.

---

## Step 2: Enable Google Calendar API

1. Menu **☰** → **APIs & services** → **Library**.

2. Search for **"Google Calendar API"**.

3. Open **Google Calendar API** → click **Enable**.

---

## Step 3: Create an API key

1. Menu **☰** → **APIs & services** → **Credentials**.

2. **+ Create credentials** → **API key**.

3. Copy the key when it appears (you can view it again later).

4. (Recommended) **Restrict the key**:
   - Click the **pencil (Edit)** next to the key.
   - Under **Application restrictions**, choose **HTTP referrers**.
   - Under **Website restrictions**, add:
     - Dev: `http://localhost:3000/*` (or your local URL)
     - Production: `https://yourdomain.com/*`
   - Under **API restrictions**, choose **Restrict key** → select **Google Calendar API** only.
   - **Save**.

---

## Step 4: Add the key to the project

1. At the project root (`asme_web`), create **`.env.local`** if it does not exist.

2. Add this line (replace with your real API key):

   ```
   VITE_GOOGLE_CALENDAR_API_KEY=paste_your_api_key_here
   ```

3. Save and **restart the dev server**:

   ```bash
   npm run dev
   ```

4. Open **Home** or **Events** in the browser; calendar events should load.

---

## Multiple calendars

To merge events from several Google calendars, list their IDs in **`.env.local`**, **comma-separated**:

```env
VITE_GOOGLE_CALENDAR_IDS=calendarId1@group.calendar.google.com,calendarId2@group.calendar.google.com
```

- With **VITE_GOOGLE_CALENDAR_IDS**, events from all listed calendars are **merged** and sorted by date.
- If **VITE_GOOGLE_CALENDAR_IDS** is omitted, the app uses **VITE_GOOGLE_CALENDAR_ID** (single ID) or the code default (president calendar).

---

## Troubleshooting

- **Persistent 403 errors**
  - Confirm **Google Calendar API** is **enabled**.
  - Confirm `VITE_GOOGLE_CALENDAR_API_KEY` in `.env.local` is correct (no extra spaces).
  - Stop the dev server and run `npm run dev` again.

- **No events / 404 Not Found**
  - **Gmail-address calendars** (e.g. president@gmail.com) must be **public** for API access.  
    In Google Calendar → **Settings and sharing** → **Access permissions**, enable **Make available to public** or let everyone see event details.  
    Private calendars cannot be read with a browser key → often 404.
  - **Group calendars** (`xxx@group.calendar.google.com`) usually only need sharing set to public or link-accessible.
  - Confirm the calendar ID in code/env matches the real calendar.

- **Worried about exposing the API key**
  - HTTP referrer restrictions limit which sites can use the key.
  - Keep `.env.local` out of Git; use env vars on the host for production.

---

## How to find your Calendar ID in Google Calendar

1. Go to **https://calendar.google.com** and sign in.

2. On the left, under **My calendars**, find the calendar you want. Click the **three dots (⋮)** next to its name.

3. Click **Settings and sharing**.

4. Scroll to **Integrate calendar**. You will see:
   - **Calendar ID** — e.g. `xxxxx@group.calendar.google.com`  
   Copy it for `.env.local` as `VITE_GOOGLE_CALENDAR_ID=...`.

5. To match what the app uses, compare this **Calendar ID** with `firebase/services.ts` (see the comment above `calendarIdEncoded`). They should match exactly.

**Multiple calendars:** In `.env.local`:

```env
VITE_GOOGLE_CALENDAR_IDS=calendarId1@group.calendar.google.com,calendarId2@group.calendar.google.com
```

Use commas between IDs (spaces are trimmed). Events from all listed calendars are merged and sorted by date.
