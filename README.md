# anyn0te: Anonymous, Encrypted Note Sharing

**anyn0te** is an open-source platform designed for anonymous note sharing.  
Our core mission is to provide a space where users can post thoughts, ideas, and media without fear of personal identification or long-term data retention. **Privacy and security**, including encrypted communication, are built into the core design.

---

## 🌟 Key Features

- **Total Anonymity:** Post content without creating a permanent account or revealing identity.
- **Encrypted Comments (PMs):** Communicate privately regarding a note using an encrypted, personal message-like system.
- **Intuitive Note Editor:** A dedicated editor interface for creating and managing content.
- **Advanced Engagement Logic:** Post visibility and reach are dynamically managed based on time decay and user reactions/engagement.
- **Real-time Notifications:** A robust notification system for updates on user posts and interactions.
- **Responsive UI:** A clean, mobile-first design with modern animations and theming support.

---

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing.

### **Prerequisites**

You need the following installed:

- Node.js (LTS recommended)
- npm or yarn

---

## Installation

### **1. Clone the repository**

```bash
git clone https://github.com/Anyn0te/website anyn0te
cd anyn0te
```

### **2. Install dependencies**

```bash
npm install
# or
yarn install
```

### **3. Configuration**

The application supports running on a specified port using a `.env` file.
Create a `.env` file in the root directory to define environment variables such as:

- Database connection URL
- Media serving configuration
- App port

### **4. Database Setup**

The project requires a database (based on the new migration system).
Ensure it is running and configured through your `.env` environment variables.

---

## Running Locally

To start the development server:

```bash
npm run dev
# or
yarn dev
```

The application should now be available at:

```
http://localhost:3000
```

(or whatever port you set in `.env`)

---

## 🤝 Contributing

We welcome contributions!
Please follow these rules before you make a PR

- Make useful feature, useless feature won't be accepted
- Make meaningful commits, Messy commit that doesn't explained what changed won't accepted
- Don't bloat
- Security precautions, Must be taken while adding any features

---

## 🆕 Latest Updates (v0.11.0 Highlights)

The latest version includes a major overhaul of core systems:

- **Initial Database Migration** — foundation for persistent, scalable data.
- **Dedicated Note Editor** — UI for creating notes with optional title-only or content-only posting.
- **Encrypted Interaction** — secure, encrypted personal messages.
- **Dynamic Ranking** — improved post reach algorithm with time-decay logic.
- **Revamped Media & Audio** — improved serving + new audio player.

---

## 📜 Changelog

For a full breakdown of features, fixes, and changes, see the **TODO Document** in the repo.
