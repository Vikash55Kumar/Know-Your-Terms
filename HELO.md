# Comprehensive Environment Configuration Guide (Step-by-Step)

This guide will walk you through setting up your own credentials for the "Know Your Terms" project. Follow these steps to replace the previous team member's configuration with your own.

---

## 1. Google Gemini API (For Summarization & AI Agent)

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Create a new API Key.
3.  **Backend (.env):** Set `GEMINI_API_KEY=your_new_key`.
4.  **Frontend (.env):** Set `VITE_GEMINI_API_KEY=your_new_key`.

---

## 2. Firebase Setup (Auth, Firestore, & Database)

Your project uses **Firebase** for all database and authentication needs. You **DO NOT** need Neon or PostgreSQL.

### Part A: Web Config (For Frontend)

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project (e.g., "KnowYourTerms-Demo").
3.  Add a **Web App** to your project. **Check the box for "Firebase Hosting"**.
4.  Copy the `firebaseConfig` object and map it to your **Frontend (.env)**:
    - `VITE_FIREBASE_API_KEY`
    - `VITE_FIREBASE_AUTH_DOMAIN`
    - `VITE_FIREBASE_DATABASE_URL` (This is provided in your config)
    - `VITE_FIREBASE_PROJECT_ID`
    - `VITE_FIREBASE_STORAGE_BUCKET`
    - `VITE_FIREBASE_MESSAGING_SENDER_ID`
    - `VITE_FIREBASE_APP_ID`
    - `VITE_FIREBASE_MEASUREMENT_ID`

### Part B: Service Account (For Backend)

1.  In the Firebase Console, go to **Project Settings > Service Accounts**.
2.  Click **Generate New Private Key**. A JSON file will download.
3.  Open this JSON file, copy the entire content, and **minify it into a single line**.
4.  **Backend (.env):** Set `FIREBASE_CONFIG1='{"type":"service_account", ...}'` (Ensure it is wrapped in single quotes).

### Part C: Enable Services

In the Firebase Console, make sure you enable these:

1.  **Authentication:** Enable "Email/Password" and "Google" sign-in methods.
2.  **Firestore Database:** Create a database in "Production mode" or "Test mode."
3.  **Realtime Database:** (Optional but recommended to match your old env).

---

## 3. GetStream.io Setup (For AI Chat Agent)

1.  Go to [GetStream.io](https://getstream.io/) and create an account.
2.  Create a new App.
3.  Copy the **API Key** and **Secret Key**.
4.  **Backend (.env):** Set `STREAM_API_KEY` and `STREAM_API_SECRET`.
5.  **Frontend (.env):** Set `VITE_STREAM_API_KEY`.

---

## 4. Indian Kanoon API (For Legal Case Search)

1.  Go to [IndianKanoon.org](https://indiankanoon.org/).
2.  Register for an account and request an API token.
3.  **Backend (.env):** Set `KANOON_API_KEY=your_token`.

---

## 5. Tavily Search API (For AI Agent Web Search)

1.  Go to [Tavily.com](https://tavily.com/).
2.  Create an account and get your API Key.
3.  **Backend (.env):** Set `TAVILY_API_KEY=your_key`.

---

## 6. Putting It All Together

### Frontend `.env` Template (`/frontend/.env`)

Create this file in the `frontend` folder:

```bash
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_BACKEND_URL=http://localhost:4000
VITE_GEMINI_API_KEY=AIzaSy...
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_STREAM_API_KEY=...
VITE_CHAT_ENABLED=true
```

### Backend `.env` Template (`/backend/.env`)

Create this file in the `backend` folder:

```bash
PORT=4000
JWT_SECRET=any_random_long_string
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=AIzaSy...
KANOON_API_KEY=...
STREAM_API_KEY=...
STREAM_API_SECRET=...
TAVILY_API_KEY=tvly-...
FIREBASE_CONFIG1='{"type":"service_account",...}'

# DEMO MODE: Set to 'true' to use mock data for document extraction (saves money/RAM)
ENABLE_DEMO_MODE=true
```

---

## IMPORTANT: Deployment Notice

Now that we have implemented the **"Native AI" Migration**, you **DO NOT NEED** to deploy the Dockerized Python AI modules. The backend will handle OCR and summarization using Gemini directly (or mock data if `ENABLE_DEMO_MODE` is true).

For hosting:

- **Frontend:** Use [Firebase Hosting](https://firebase.google.com/docs/hosting).
- **Backend:** Use [Render](https://render.com/) or [Vercel](https://vercel.com/) (free tiers are sufficient now).
