# ASME Penn State Website Features Documentation

This document describes all features and services of the ASME Penn State website.

## 📋 Table of Contents
1. [Overview](#overview)
2. [Admin Panel Features](#admin-panel-features)
3. [Content Editing Features](#content-editing-features)
4. [Image Management](#image-management)
5. [Reorder Functionality](#reorder-functionality)
6. [Permission System](#permission-system)
7. [Notification System](#notification-system)

---

## Overview

This website is the official ASME Penn State website built with **React + TypeScript + Firebase**.

### Main Pages
- **Home**: Main page (Hero section, Next Meeting, What we do)
- **About**: Organization introduction (Executive Board, Design Team)
- **Projects**: Project listings and detailed information
- **Events**: Event listings
- **Sponsors**: Sponsor information
- **Profile**: User profile

---

## Admin Panel Features

### Access Method
- Click the **"ADMIN"** link in the header (only visible to admin/President roles)
- Notification badge: Shows a number when there are new approval requests

### Dashboard
Central management hub where you can view the following information in real-time:
- **User Approvals**: Number of new members awaiting approval (badge display)
- **Projects**: Pending project approvals + deletion requests (badge display)
- **User Management**: Member management
- **Project Management**: Project management
- **Project Approvals**: Project approvals
- **Trash**: Deleted project management

### User Approval
- **Pending**: Approve/reject users awaiting registration
- **Approved**: List of approved users (can be reverted to rejected)
- **Rejected**: List of rejected users (can be reverted to approved)

### Project Management
- Create, edit, and delete projects
- Manage project status (current/past)
- Assign project leaders
- Manage project members and roles
- **Image Upload**: 
  - Option 1: Firebase Storage upload (file selection)
  - Option 2: External URL input (Google Drive/Imgur, etc.)

### Project Approvals
- Approve/reject newly created projects (President/VP only)
- Review project details

### Project Trash
- List of deleted projects
- Restore projects
- **Permanent Deletion Request**: 
  - Requires approval from both Project Leader and Executive Board
  - Permanently deleted when both parties approve

### Member Management
- View all member lists
- Change member roles
- Manage Executive Board positions

---

## Content Editing Features

### Permissions
- **Home, About, Projects, Events, Sponsors page editing**: Only President and Vice President
- **Project editing**: Project leaders can only edit their own projects

### Home Page Editing
- **"What we do" Section**:
  - Title editing
  - Content editing (Rich Text Editor):
    - Bold, Italic, Underline
    - Text color change
    - Enter key automatically handles line breaks
  - Button text and link editing

### About Page
- Executive Board order change (drag and drop)
- Design Team order change (drag and drop)
- Auto-save (Firebase)

### Projects Page
- Project order change (drag and drop)
- Separate management of Current/Past projects
- Auto-save (Firebase)

### Events Page
- Create, edit, delete events (President/VP only)
- Manage event details

### Sponsors Page
- Manage sponsor information
- Upload sponsor logos

---

## Image Management

### Image Upload Options

#### Option 1: Firebase Storage
- **Advantages**: Fast and stable
- **Disadvantages**: Requires payment after free tier (card information required)
- **Usage**: File selection → Automatic upload

#### Option 2: Google Drive Link (Recommended)
- **Advantages**: Free, unlimited
- **Usage**:
  1. Upload image to Google Drive
  2. Set sharing: "Anyone with the link"
  3. Copy file ID
  4. URL format: `https://drive.google.com/uc?export=view&id=FILE_ID`
  5. Paste into input field

**How to Create Google Drive Link**:
```
1. Select image file in Google Drive
2. Right-click → "Share" → Select "Anyone with the link"
3. Copy file ID (the /d/FILE_ID/ part of the URL)
4. Input in format: https://drive.google.com/uc?export=view&id=FILE_ID
```

### Image Usage Locations
- Project images
- Event images
- Sponsor logos
- Member profile photos

---

## Reorder Functionality

### Drag and Drop Support

#### Executive Board Reordering
- **Permissions**: President, Vice President
- **Location**: About page → Executive Board section
- **Method**: Drag member card to desired position
- **Auto-save**: Changes saved to Firebase immediately

#### Design Team Reordering
- **Permissions**: President, Vice President
- **Location**: About page → Design Team section
- **Method**: Drag member card to desired position
- **Auto-save**: Changes saved to Firebase immediately

#### Projects Reordering
- **Permissions**: President, Vice President
- **Location**: Projects page
- **Method**: Drag project card to desired position
- **Auto-save**: Changes saved to Firebase immediately
- **Separate Management**: Current Projects and Past Projects managed independently

---

## Permission System

### Role-based Permissions

#### Admin
- Access to all admin features
- ADMIN link displayed in header
- All management functions including user approval, project approval, deletion, etc.

#### President
- Edit all content (Home, About, Projects, Events, Sponsors)
- Approve/reject projects
- Permanent project deletion
- Reorder Executive Board/Design Team/Projects
- Change member roles
- ADMIN link displayed in header

#### Vice President
- Edit all content (Home, About, Projects, Events, Sponsors)
- Approve/reject projects
- Reorder Executive Board/Design Team/Projects
- Change member roles
- **Restriction**: Cannot permanently delete projects (President only)

#### Executive Board Members
- More permissions than regular members (varies by settings)
- Can create projects

#### Project Leader
- Manage members of projects they lead
- Define and assign project roles
- Edit project information (limited)

#### Regular Member
- Request project creation (requires approval)
- Request to join projects
- Manage profile

---

## Notification System

### Real-time Notification Badges

#### Header Notifications
- **Location**: Next to ADMIN link
- **Display Content**: 
  - Number of users awaiting approval
  - Number of projects awaiting approval
  - Number of permanent deletion requests
- **Updates**: Real-time (Firestore onSnapshot)

#### Dashboard Card Notifications
- **User Approvals Card**: Number of users awaiting approval
- **Projects Card**: Number of projects awaiting approval + deletion requests

#### Project Management Page Notifications
- **Approve Projects Button**: Number of projects awaiting approval
- **Trash Button**: Number of permanent deletion requests

---

## Technology Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Storage, Authentication)
- **Build Tool**: Vite
- **Routing**: Custom Hash-based routing

---

## Key Convenience Features

### 1. Real-time Updates
- All data changes reflected in real-time (Firestore onSnapshot)
- Latest state maintained even when multiple users work simultaneously

### 2. Auto-save
- Drag and drop reordering auto-saves
- Content editing saves after clicking "Save" button

### 3. Rich Text Editor
- Edit text like composing an email
- Apply styles only to selected text (size, color, Bold, Italic, Underline)
- Enter key for natural line breaks

### 4. Flexible Image Management
- Choose between Firebase Storage or external URL (Google Drive)
- Recommended to use Google Drive for cost savings

### 5. Safe Deletion System
- Soft delete (Trash): Can be restored immediately
- Permanent delete: Requires approval from both Leader and Executive Board

### 6. Role-based Access Control
- Detailed permission management by role
- Prevents unauthorized access

---

## User Guide

### Approving New Members
1. ADMIN → Dashboard
2. Click "User Approvals" card
3. Check users in Pending tab
4. Approve or reject

### Creating and Approving Projects
1. ADMIN → Projects → Create Project
2. Enter project information (image: Firebase or Google Drive link)
3. Save → Status becomes pending
4. Approve in ADMIN → Project Approvals

### Editing Content
1. Navigate to the page (Home, About, Projects, etc.)
2. Click "Edit" button in top right (only visible to President/VP)
3. Modify content
4. Click "Save" button

### Reordering
1. Navigate to About page or Projects page
2. Drag card to desired position
3. Auto-saves

---

## Important Notes

1. **Firebase Storage Costs**: Becomes paid after free tier, so Google Drive usage is recommended
2. **Permanent Deletion**: Cannot be recovered, so handle with care
3. **Permission Management**: Only President/VP can perform important tasks
4. **Image Links**: When using Google Drive, sharing must be set to "Anyone with the link"

---

## Contact & Support

For feature requests or bug reports, please submit through GitHub Issues.
