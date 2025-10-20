# anyn0te - Project Status and Changelog

This document tracks current known issues, planned features, and recorded updates for the anonymous note-sharing platform.

---

## 🐞 Bugs (Known Issues)

These are issues confirmed but not yet fixed in the application.

- **Music Playback Issue:** Some music files play for only a fraction of a second (ex: check note titled "ami valo mansuh na"). This is likely due to the browser's handling of specific audio file formats or missing controls/auto-play settings in the audio tag.
- **Missing Modal Escape:** There is currently no functionality to close the expanded note view/modal by pressing the `Esc` key.
- **Mobile Navigation Lock:** In the mobile view (hamburger menu open), there is no clear and functional button to explicitly close the navigation bar once it is expanded.

---

## 📝 TODO (Future Development)

These items outline the planned work, reflecting the decision to drop the follower/account logic in favor of a purely anonymous service.

### Interface & Content

- Need to design and implement a dedicated **Music Player UI** within the Expanded Note Modal.
- **Change web description** and update `<head>` items (Metadata, Favicon) across all pages.
- [Maybe] Increase the file size limit (currently 5MB) after further security review.
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
