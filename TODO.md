# anyn0te - Project Status and Changelog

This document tracks current known issues, planned features, and recorded updates for the anonymous note-sharing platform.

---

## 🐞 Bugs (Known Issues)

These are issues confirmed but not yet fixed in the application.

---

## 📝 TODO (Future Development)

These items outline the planned work, reflecting the decision to drop the follower/account logic in favor of a purely anonymous service.

### Interface & Content

- Need to design and implement a dedicated **Music Player UI** within the Expanded Note Modal.
- **Change web description** and update `<head>` items (Metadata, Favicon) across all pages.
- Add Note Feelings - it will be a way to react to the note
- Replace mock hydration with server-sourced data and introduce caching/loading states for better perceived performance.
- Design a persistence strategy to migrate from JSON storage to a proper database-backed repository.
- Document navigation modules and shared utilities for onboarding new contributors.
- Add Note & Note card customization to let user customize their notes differently
- Add Note Thoughts - it will be a way to comment on other users notes.(the note writer can either enable to disable this feature)
- Add Gesture - it will be a way to scroll or swipe through the next/previous notes.

### Page Structure & Routing

- **Drop the "Following" Tab:** Replace the dedicated "Following" section on the Home Page with a **Changelog/AdminLog** section.
- **Add New Pages:**
  - Create an `/about` page.
  - Create a `/changelog` page (as we are dropping accounts, there is no need for the `/follower` page).
  - Create a functional `/dashboard` page (currently only a placeholder).

### Future Decisions

- [Maybe] Add an anonymous naming mechanism? (e.g., allow users to set a temporary, non-identifying "name" per post, but this needs careful decision to uphold the anonymous mission).

---

## 🚀 Changelog (Work Completed)

Documenting all major features and fixes implemented in the project thus far.

### Version 0.1.0 - Initial Secure Prototype

| Type         | Description                                                                                                                                                               |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Feature**  | Implemented Next.js application core with Tailwind CSS for styling.                                                                                                       |
| **Feature**  | Designed and built the responsive, floating navigation bar (pill on desktop, circle on mobile).                                                                           |
| **Feature**  | Created the Home Page (`/`) with a header and structured sections for content display.                                                                                    |
| **Feature**  | Developed the **Create Note Page** (`/post`) with a form for title, content, and optional single media file (Max 5MB).                                                    |
| **Security** | Implemented **Critical Server-Side Validation** for word count, file size, and file type whitelisting (JPG, PNG, MP3) to prevent DoS and arbitrary file upload attacks.   |
| **Security** | Implemented **Cross-Site Scripting (XSS) Sanitization** using DOMPurify on all displayed user content (Title and Note content).                                           |
| **Feature**  | Built the **Expanded Note Modal** to show full post content and media, with a full-screen blur backdrop.                                                                  |
| **Fix**      | Resolved persistent Tailwind CSS/PostCSS configuration issues across `globals.css` and `next.config.ts`.                                                                  |
| **Fix**      | Enabled automatic page refresh on the home page after a successful post using `revalidatePath`.                                                                           |
| **Fix**      | Improved visual consistency: Fixed note card text overflow, ensured floating navigation bar is fully blurred beneath the modal, and adjusted the expand arrow size/shape. |
| **Fix**      | Added redirect from the Create Note Page to the Home Page upon successful post submission.                                                                                |

### Version 0.2.0 - Multiple Media Uploads and Bug Fixes

| Type        | Description                                                                                                        |
| :---------- | :----------------------------------------------------------------------------------------------------------------- |
| **Feature** | Implemented support for uploading and displaying multiple image and audio files per note.                          |
| **Feature** | Increased client-side and server-side file upload limits to 20MB.                                                  |
| **Feature** | Improved client-side file input UI in the Create Note Page to clearly show selected file names.                    |
| **Fix**     | Resolved `TypeError` related to `note.media` being `null` or not an array in `NoteCard.tsx` and `NoteSection.tsx`. |
| **Fix**     | Expanded supported audio MIME types (`wav`, `ogg`) in the notes API.                                               |
| **Fix**     | Fixed linting errors related to `any` types in API route and HTML sanitization utility.                            |
| **Fix**     | Replaced `<img>` with `next/image` in `ExpandedNoteModal.tsx` for better image optimization.                       |
| **Fix**     | Removed unused `expandToPage` prop from `NoteSection.tsx` and `app/page.tsx`.                                      |

### Version 0.3.0 - Mobile Navigation Improvements

| Type        | Description                                                                 |
| :---------- | :-------------------------------------------------------------------------- |
| **Feature** | Changed hamburger icon to a plus icon when the navigation menu is open.     |
| **Feature** | Implemented outside click dismissal for the mobile navigation menu.         |
| **Fix**     | Ensured the 3-line hamburger icon is correctly centered in the mobile view. |
| **Fix**     | Hid the plus icon when the mobile navigation menu is expanded.              |

### Version 0.4.0 - Create Note Modal and UI Enhancements

| Type        | Description                                                                                        |
| :---------- | :------------------------------------------------------------------------------------------------- |
| **Feature** | Refactored the "Create Note" section into a modal dialog with a blurry background.                 |
| **Feature** | Implemented `Escape` key dismissal for both the Expanded Note Modal and the new Create Note Modal. |
| **Fix**     | Prevented background scrolling when any modal is open in mobile view.                              |

### Version 0.5.0 - Modular Architecture and Storage Refactor

| Type        | Description                                                                                                |
| :---------- | :--------------------------------------------------------------------------------------------------------- |
| **Feature** | Introduced a modular `src/modules/notes` domain, consolidating UI, hooks, and services for easier scaling. |
| **Feature** | Added a JSON-backed repository with GET/POST APIs, laying groundwork for future persistence upgrades.      |
| **Feature** | Centralized sanitization utility in `lib/` and added path aliases for shared modules.                      |
| **Fix**     | Rebuilt the mobile navigation styling to keep the hamburger icon centered and to cleanly animate the menu. |
| **Fix**     | Replaced the circular expand button with a text + chevron button for improved readability.                 |

## Date 21-10-25

### 1f1ddea - anyn0te: fixup! let anonymous user to change the theme -[tillua467]-

### a1c31b8 - color changes -[mrun1corn]-

### 242ae7a - make login optional and use localstorage for anonymous data -[mrun1corn]-

### 28d8094 - feat: add Firebase auth integration and polished theming -[mrun1corn]-

### b31e69c - fixup the nav -[mrun1corn]-

### 4b99b3d - refactor: reorganize notes module and update roadmap -[mrun1corn]-

### 204966c - feat: Implement Create Note modal and fix background scrolling -[mrun1corn]-

### 62258ce - feat: Mobile navigation improvements and TODO update -[mrun1corn]-

### e120ff2 - update todo -[mrun1corn]-

### 4ee02fd - feat: Implement multiple media uploads, fix media-related bugs, update file size limits, and resolve linting issues. -[mrun1corn]-

### 3ca4086 - anyn0te: changelog: 21-10-25 -[tillua467]-

### 564f6eb - anyn0te: Update branding, navigation labels, and improve note creation UX -[tillua467]-

### af32639 - anyn0te: redirect user to the notes section when clicked expand more -[tillua467]-

### 93fff20 - anyn0te: add a new settings tab in the navbar -[tillua467]-

### 2310c22 - anyn0te: make mediaUrl optional in Note interface -[tillua467]-
