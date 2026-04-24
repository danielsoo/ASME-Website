# ASME Penn State Website

Official website for the ASME chapter at Penn State.

This repository contains the public site, member profile flow, and admin tools for managing users, projects, events, and sponsors.

## What This Site Includes

- Public pages: `Home`, `About`, `Projects`, `Events`, `Sponsors`
- Member flow: sign up, email verification, profile settings, pending/approved/rejected status
- Admin panel: user approvals, member/team management, project approvals, project trash/recovery, site content editing
- Google Calendar integration for event data and embedded calendar view
- Image upload workflow via ImageKit signed uploads

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Firebase
  - Authentication
  - Firestore
  - Storage (optional depending on features in use)
- ImageKit (signed upload flow)
- Lucide icons

## Routing Model

This app uses hash-based routing in `src/App.tsx`.

Examples:
- `#/`
- `#/about`
- `#/projects`
- `#/events`
- `#/login`
- `#/profile`
- `#/admin/...`

## Local Development

### Prerequisites

- Node.js 18+ (recommended)
- npm
- A Firebase project
- (Optional) ImageKit account for uploads
- (Optional) Google Cloud project for Calendar API key

### Install

```bash
npm install
```

### Start Dev Server

```bash
npm run dev
```

Default local URL:

- `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

## Environment Variables

Create `.env.local` in the project root.

### Firebase (client)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Google Calendar (client)

Use one of the calendar ID modes below:

```env
VITE_GOOGLE_CALENDAR_API_KEY=
VITE_GOOGLE_CALENDAR_ID=
```

or

```env
VITE_GOOGLE_CALENDAR_API_KEY=
VITE_GOOGLE_CALENDAR_IDS=calendar1@group.calendar.google.com,calendar2@group.calendar.google.com
```

Notes:
- `VITE_GOOGLE_CALENDAR_IDS` takes precedence over `VITE_GOOGLE_CALENDAR_ID`.
- Calendar IDs should usually be group/public calendars for reliable browser access.

### ImageKit

Client-visible values:

```env
VITE_IMAGEKIT_PUBLIC_KEY=
VITE_IMAGEKIT_URL_ENDPOINT=
VITE_IMAGEKIT_AUTH_ENDPOINT=/api/imagekit-auth
```

Server-only value (never with `VITE_` prefix):

```env
IMAGEKIT_PRIVATE_KEY=
```

## Deployment (Vercel Recommended)

1. Add all required environment variables in Vercel project settings.
2. Ensure server secret keys are not exposed with `VITE_`.
3. Deploy.
4. Re-deploy whenever env values change.

## Google Calendar Setup

To avoid `403` when fetching events:

1. In Google Calendar, make the target calendar publicly accessible (or otherwise externally readable according to your org policy).
2. In Google Cloud:
   - Enable `Google Calendar API`
   - Restrict API key by `Websites` (HTTP referrers)
   - Add your production and preview domains (for example `https://your-site.vercel.app/*`)
   - Restrict key usage to `Google Calendar API`
3. Wait a few minutes for policy propagation, then re-test.

## ImageKit Security Notes

- Keep `IMAGEKIT_PRIVATE_KEY` in server environment variables only.
- Rotate keys immediately if a private key is exposed.
- Keep `VITE_IMAGEKIT_PUBLIC_KEY` as public client config.
- The signed upload endpoint is implemented at `api/imagekit-auth.js` and local dev middleware in `vite.config.ts`.

## Firebase Data Model (High Level)

Core collections used by this app include:

- `users`
- `projects`
- `sponsors`
- `notifications`
- `homePageContent`
- additional settings/team-management related documents

The exact schema evolves with features. Review `src/types.ts` and `src/firebase/services.ts` for current field-level behavior.

## Roles and Access (High Level)

- Member: public pages + personal profile
- Pending user: can log in but awaits admin approval for elevated access
- Executive/Admin roles: access to admin routes and management functions
- President/VP/Admin: broader content and approval capabilities

Actual authorization behavior depends on both UI checks and Firestore security rules.

## Admin Bootstrapping

Typical first-time setup flow:

1. Create first account.
2. Promote first admin through setup/admin tooling.
3. Use admin panel to approve users and assign team/role permissions.

## Repository Structure (Simplified)

```text
api/                     # Serverless endpoints (ImageKit auth signer)
pages/                   # Route-level pages (public + admin)
src/components/          # Shared UI components
src/firebase/            # Firebase config + service layer
src/utils/               # Utility functions
public/                  # Static assets
```

## Operational Troubleshooting

### Events calendar visible for some users but not others

- Verify same deployment URL and same environment.
- Test in incognito with no Google session.
- Confirm Calendar API request status in browser Network tab.
- If only specific org accounts fail, it is usually account/org policy, not deployment code.

### Firestore `permission-denied`

- Check Firestore security rules against current user role/status.
- Confirm required documents exist (for expected role/team/status).

### Image upload fails

- Confirm `/api/imagekit-auth` returns success.
- Confirm `IMAGEKIT_PRIVATE_KEY` exists in deployment environment.
- Confirm `VITE_IMAGEKIT_PUBLIC_KEY` and `VITE_IMAGEKIT_URL_ENDPOINT` are set.

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run preview` — serve built assets locally

## Contribution and Ownership

This repository is used for the official ASME Penn State website operations.
For role changes, admin access, or production updates, coordinate with current site maintainers and organization leadership.

## License

Private project. All rights reserved unless explicitly documented otherwise.
