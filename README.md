# ASME @ Penn State Website

Official website for the American Society of Mechanical Engineers (ASME) chapter at Penn State University.

## Overview

This is a modern web application built with React, TypeScript, and Firebase that serves as the official website for ASME @ Penn State. The platform includes member management, project tracking, event listings, content editing capabilities, and an administrative panel for managing the organization.

## Features

### Public Features
- **Home Page**: Welcome page with club description and mission, editable "What we do" section with rich text editor
- **About Page**: Executive Board and Design Team member profiles with drag-and-drop reordering
- **Projects Page**: Current and past project listings with details and drag-and-drop reordering
- **Events Page**: Upcoming and past events
- **Sponsors Page**: List of sponsors and supporters

### Member Features
- **User Registration**: PSU email (@psu.edu) required
- **Email Verification**: Firebase email verification required
- **Profile Management**: Edit name, major, and year
- **Status Tracking**: View approval status (pending/approved/rejected)

### Administrative Features
- **User Approval System**: Approve or reject new member registrations
- **Real-time Notifications**: Badge indicators for pending approvals and deletion requests
- **Member Management**: 
  - Manage Executive Board positions (add, edit, delete)
  - Assign roles and teams (Design Team / General Body) to members
- **Project Management**:
  - Create and manage projects
  - Assign project leaders
  - Manage project-specific member roles
  - Project approval system for Executive Board members
  - **Image Upload Options**:
    - Firebase Storage (requires payment after free tier)
    - Google Drive/Imgur links (recommended, free)
- **Content Editing** (President/Vice President only):
  - Edit Home page "What we do" section with rich text editor
  - Reorder Executive Board and Design Team members (drag-and-drop)
  - Reorder Projects (drag-and-drop)
  - All changes auto-save to Firebase
- **Trash System**: Soft-delete projects with restore capability
- **Permanent Deletion**: Two-approval system (Project Leader + President/VP) required
- **Notifications**: Real-time notifications for project deletions and cancellations

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase
  - Firestore (Database)
  - Storage (for image uploads, optional)
  - Authentication (Email/Password, Google OAuth)
- **Icons**: Lucide React

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Firebase account and project setup

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/danielsoo/ASME-Website.git
   cd ASME-Website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication (Email/Password and Google Sign-in)
   - Enable Storage (optional, for image uploads)
   - Create a `.env.local` file in the `asme_web` directory:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

4. Run the development server:
   ```bash
   cd asme_web
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Firebase Setup

### Firestore Security Rules

For development, use:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note**: Update these rules for production with proper authentication checks.

### Firestore Collections

- `users`: User profiles with approval status and roles
- `projects`: Project information with approval and deletion status
- `execPositions`: Executive Board position definitions
- `notifications`: User notifications for deletions and approvals
- `homePageContent`: Home page editable content (title, content, button)

### Initial Admin Setup

1. Navigate to `/admin/setup`
2. Create an admin account or promote an existing user to admin/President role
3. Use this account to approve other users and manage the organization

## Project Structure

```
asme_web/
├── components/          # Reusable React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── AlertModal.tsx
│   ├── ConfirmModal.tsx
│   ├── NotificationBanner.tsx
│   ├── ProjectCard.tsx
│   └── TeamCard.tsx
├── pages/              # Page components
│   ├── Home.tsx
│   ├── About.tsx
│   ├── Projects.tsx
│   ├── Events.tsx
│   ├── Sponsors.tsx
│   ├── Profile.tsx
│   └── admin/         # Admin panel pages
│       ├── Admin.tsx
│       ├── Dashboard.tsx
│       ├── UserApproval.tsx
│       ├── MemberManagement.tsx
│       ├── ProjectManagement.tsx
│       ├── ProjectApprovals.tsx
│       ├── ProjectTrash.tsx
│       └── SetupAdmin.tsx
├── firebase/          # Firebase configuration and services
│   ├── config.ts
│   ├── services.ts
│   └── migrate.ts
├── types.ts           # TypeScript type definitions
├── constants.ts       # Static data constants
└── App.tsx           # Main application component
```

## User Roles & Permissions

### Member
- View public pages
- Edit own profile
- Create projects (requires approval)

### Executive Board Member
- All member permissions
- Create projects (pending approval)
- View assigned projects

### Project Leader
- Manage assigned project members
- Assign project-specific roles
- Edit own project information

### President / Vice President
- All previous permissions
- Approve/reject user registrations
- Manage Executive Board positions
- Approve/delete projects
- Edit all page content (Home, About, Projects, Events, Sponsors)
- Reorder Executive Board, Design Team, and Projects (drag-and-drop)
- Access trash and manage permanent deletions (President only for permanent deletion)

### Admin
- Full system access
- All administrative functions

## Key Features Explained

### Content Editing System
- **Home Page**: Rich text editor for "What we do" section
  - Title editing
  - Content editing with formatting (bold, italic, underline, text color)
  - Button text and URL editing
  - Only accessible to President/Vice President
- **About Page**: Drag-and-drop reordering for Executive Board and Design Team
- **Projects Page**: Drag-and-drop reordering for current and past projects
- All changes auto-save to Firebase

### Image Upload Options
- **Option 1: Firebase Storage**
  - Requires payment after free tier
  - Direct file upload
- **Option 2: Google Drive Links (Recommended)**
  - Free and unlimited
  - Set sharing to "Anyone with the link"
  - Use format: `https://drive.google.com/uc?export=view&id=FILE_ID`

### Project Approval System
- Executive Board members can create projects
- Projects start in "pending" status
- President or VP must approve and assign a leader
- Project leaders can then manage members

### Project Deletion System
- Projects are soft-deleted (moved to trash)
- Can be restored from trash
- Permanent deletion requires:
  1. Deletion request from President/VP
  2. Unanimous approval from Project Leader AND another President/VP
  3. Real-time notifications sent to all involved parties

### Real-time Notifications
- Header badge shows count of pending approvals and deletion requests
- Dashboard cards show pending counts
- All notifications update in real-time using Firestore onSnapshot

### Email Verification
- All users must verify their PSU email address
- Email verification required before login
- Resend verification email option available

## Building for Production

```bash
cd asme_web
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Deployment

This application can be deployed to:
- Firebase Hosting
- Vercel
- Netlify
- Any static hosting service

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
cd asme_web
npm run build
firebase deploy
```

## Contributing

This is the official ASME @ Penn State website. For contributions or issues, please contact the organization administrators.

## License

This project is private and proprietary to ASME @ Penn State.

## Contact

- **Office Address**: 125 Hammond Building
- **President Email**: president.asme.psu@gmail.com
- **Phone**: 484-268-3741

---

Built with ❤️ by ASME @ Penn State
