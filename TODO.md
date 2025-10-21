# anyn0te - Project Status and Changelog

This document tracks current known issues, planned features, and recorded updates for the anonymous note-sharing platform.

---

## 🐞 Bugs (Known Issues)

These are issues confirmed but not yet fixed in the application.

- **Missing Modal Escape:** There is currently no functionality to close the expanded note view/modal by pressing the `Esc` key.

---

## 📝 TODO (Future Development)

These items outline the planned work, reflecting the decision to drop the follower/account logic in favor of a purely anonymous service.

### Interface & Content

- Need to design and implement a dedicated **Music Player UI** within the Expanded Note Modal.
- **Change web description** and update `<head>` items (Metadata, Favicon) across all pages.
- Add Note Feelings - it will be a way to react to the note

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

| Type         | Description                                                                                                                                                               |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Feature**  | Implemented support for uploading and displaying multiple image and audio files per note.                                                                                 |
| **Feature**  | Increased client-side and server-side file upload limits to 20MB.                                                                                                         |
| **Feature**  | Improved client-side file input UI in the Create Note Page to clearly show selected file names.                                                                           |
| **Fix**      | Resolved `TypeError` related to `note.media` being `null` or not an array in `NoteCard.tsx` and `NoteSection.tsx`.                                                        |
| **Fix**      | Expanded supported audio MIME types (`wav`, `ogg`) in the notes API.                                                                                                      |
| **Fix**      | Fixed linting errors related to `any` types in API route and HTML sanitization utility.                                                                                   |
| **Fix**      | Replaced `<img>` with `next/image` in `ExpandedNoteModal.tsx` for better image optimization.                                                                              |
| **Fix**      | Removed unused `expandToPage` prop from `NoteSection.tsx` and `app/page.tsx`.                                                                                             |

### Version 0.3.0 - Mobile Navigation Improvements

| Type         | Description                                                                                                                                                               |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Feature**  | Changed hamburger icon to a plus icon when the navigation menu is open.                                                                                                   |
| **Feature**  | Implemented outside click dismissal for the mobile navigation menu.                                                                                                       |
| **Fix**      | Ensured the 3-line hamburger icon is correctly centered in the mobile view.                                                                                               |
| **Fix**      | Hid the plus icon when the mobile navigation menu is expanded.                                                                                                            |

## Date 21-10-25

### 2310c22 - make mediaUrl optional in Note interface -[tillua467]-

### 93fff20 - add a new settings tab in the navbar -[tillua467]-

### af32639 - redirect user to the notes section when clicked expand more -[tillua467]-

### 564f6eb - Update branding, navigation labels, and improve note creation UX -[tillua467]-