# 🏥 MediCare — Elderly Care & Medication Management Platform

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-deployed-4285F4?logo=googlecloud&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Hackathon](https://img.shields.io/badge/Hackathon-Catalyst_%C3%97_PromptWars_2026-purple)

> **MediCare** is a full-stack web application designed to help families and caretakers manage elderly loved ones' medications, appointments, and health records — all in one place. Built for the **Catalyst × PromptWars Hackathon, November 15 2026**.

---

## ✨ Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | 👤 **Profile Management** | Create a shared elderly profile with medical history (blood group, allergies, conditions) and a unique 6-character passcode |
| 2 | 🔗 **Family Joining** | Family members and caretakers join using the profile ID + passcode — no account required |
| 3 | 💊 **Medication Tracking** | Add medications with dosage, frequency (morning / afternoon / evening / night), start/end dates, color labels, and prescribing doctor |
| 4 | ✅ **Dose Logging** | Mark individual dose time-slots as taken; never double-log the same slot twice |
| 5 | 📅 **Appointment Management** | Schedule doctor appointments with specialty, location, notes, and optional reminders |
| 6 | 📊 **Adherence Analytics** | Daily, 7-day, and 30-day adherence rates, streak counters, and missed-medication trends |
| 7 | 📈 **Dashboard Charts** | Chart.js-powered visualizations of adherence trends and medication data |
| 8 | 🚨 **Emergency Card** | One-tap view (and downloadable PDF) of blood group, allergies, conditions, emergency contact, and current medications |
| 9 | 📧 **Email Reminders** | Node-cron + Nodemailer send medication reminders to all profile members via Gmail SMTP |
| 10 | 📝 **Health Notes** | Daily journal entries with mood and symptom tracking for care continuity |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Chart.js |
| **Backend** | Node.js 18, Express 4, Joi validation |
| **Database** | Google Firestore (Firebase Admin SDK) |
| **Auth** | Passcode-based (bcryptjs hashed), header tokens |
| **Email** | Nodemailer + Gmail SMTP App Password |
| **Scheduling** | node-cron (server-side reminder jobs) |
| **PDF** | PDFKit (emergency card export) |
| **Security** | Helmet, express-rate-limit, CORS |
| **Container** | Docker (node:18-alpine) |
| **Hosting** | Google Cloud Run (serverless, auto-scaling) |
| **CI/CD** | Google Cloud Build (`cloudbuild.yaml`) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Google Cloud Run                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Docker Container (node:18-alpine)    │  │
│  │                                                   │  │
│  │   ┌──────────────┐    ┌──────────────────────┐   │  │
│  │   │  Express.js  │    │   Static File Server  │   │  │
│  │   │  REST API    │    │   ./public (React SPA) │   │  │
│  │   │  :8080/api/* │    │   :8080/*             │   │  │
│  │   └──────┬───────┘    └──────────────────────┘   │  │
│  │          │                                        │  │
│  │   ┌──────▼──────────────────────────────────┐    │  │
│  │   │              Route Handlers              │    │  │
│  │   │  /profile  /medications  /appointments   │    │  │
│  │   │  /adherence  /analytics  /emergency      │    │  │
│  │   │  /notes                                  │    │  │
│  │   └──────┬───────────────────────────────────┘   │  │
│  │          │                                        │  │
│  │   ┌──────▼───────────────────────────────────┐   │  │
│  │   │          Services Layer                   │   │  │
│  │   │  firebaseAdmin.js  reminderService.js     │   │  │
│  │   │  emailService.js   pdfService.js          │   │  │
│  │   └──────┬───────────────────────────────────┘   │  │
│  └──────────┼───────────────────────────────────────┘  │
└─────────────┼───────────────────────────────────────────┘
              │
    ┌─────────▼──────────┐    ┌─────────────────────┐
    │  Google Firestore  │    │   Gmail SMTP         │
    │  (NoSQL Database)  │    │   (Email Reminders)  │
    └────────────────────┘    └─────────────────────┘

Client Browser
    │
    ▼
React SPA (Vite)  ──(HTTP/JSON)──▶  Express API
                                        │
                                   Firestore DB
```

---

## 📋 Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Docker** Desktop (for local container builds)
- **Google Cloud SDK** (`gcloud` CLI) — [Install guide](https://cloud.google.com/sdk/docs/install)
- A **Google Cloud project** with billing enabled
- A **Firebase project** (Firestore in Native mode)
- A **Gmail account** with [App Password](https://support.google.com/accounts/answer/185833) enabled

---

## 🚀 Local Development

### 1. Clone the repository

```bash
git clone https://github.com/your-username/medicare.git
cd medicare
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Enable **Firestore Database** in Native mode
3. Go to **Project Settings → Service Accounts → Generate new private key**
4. Save the JSON file — you'll need three values from it:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### 3. Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env and fill in your Firebase + Gmail credentials
npm run dev          # starts on http://localhost:8080
```

### 4. Frontend

```bash
# In a separate terminal
cd frontend
npm install
npm run dev          # starts on http://localhost:5173 (Vite dev server)
```

The frontend Vite config proxies `/api` requests to `http://localhost:8080` automatically.

---

## 🐳 Docker Local Build

Build the frontend first (Docker copies `frontend/dist/`):

```bash
# 1. Build React frontend
cd frontend && npm run build && cd ..

# 2. Build Docker image
docker build -t medicare .

# 3. Run the container
docker run -p 8080:8080 --env-file .env medicare

# App is now available at http://localhost:8080
```

---

## ☁️ Google Cloud Run Deployment

### Option A — Automated (recommended)

**Windows:**
```powershell
.\deploy.ps1 -ProjectId "your-gcp-project-id"
```

**Linux / macOS:**
```bash
chmod +x deploy.sh
./deploy.sh your-gcp-project-id
```

### Option B — Manual Steps

```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 1. Build React frontend
cd frontend && npm install && npm run build && cd ..

# 2. Build & push image via Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/medicare

# 3. Deploy to Cloud Run
gcloud run deploy medicare \
  --image gcr.io/YOUR_PROJECT_ID/medicare \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars FIREBASE_PROJECT_ID=your-id,FIREBASE_CLIENT_EMAIL=your-email,EMAIL_USER=your-gmail \
  --set-secrets FIREBASE_PRIVATE_KEY=firebase-key:latest,EMAIL_PASS=email-pass:latest
```

### Option C — Fully Automated CI/CD via Cloud Build

Trigger `cloudbuild.yaml` on every push:

```bash
gcloud builds triggers create github \
  --repo-name=medicare \
  --repo-owner=your-username \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | ✅ | Firebase / GCP project ID |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Service account email |
| `FIREBASE_PRIVATE_KEY` | ✅ | Service account private key (keep in Secret Manager in production) |
| `EMAIL_USER` | ✅ | Gmail address used for sending reminders |
| `EMAIL_PASS` | ✅ | Gmail App Password (not your regular password) |
| `PORT` | ✅ | Server port — Cloud Run expects `8080` |
| `NODE_ENV` | ✅ | Set to `production` in containers |
| `FRONTEND_URL` | ⬜ | Full Cloud Run URL for CORS allow-list |

> **Security tip:** Store `FIREBASE_PRIVATE_KEY` and `EMAIL_PASS` in [Google Cloud Secret Manager](https://cloud.google.com/secret-manager) and reference them with `--set-secrets` instead of plain `--set-env-vars`.

---

## 📧 Email Setup (Gmail App Password)

1. Enable **2-Step Verification** on your Google Account
2. Go to **Google Account → Security → App passwords**
3. Select **Mail** / **Other (custom name)** → name it `MediCare`
4. Copy the generated 16-character password
5. Set `EMAIL_USER=your-gmail@gmail.com` and `EMAIL_PASS=<16-char password>` in `.env`

---

## 📱 Usage Guide

```
1. Create Profile
   └─ Enter elderly person's name, blood group, allergies, conditions, emergency contact
   └─ Receive a unique Profile ID + 6-character passcode

2. Share Passcode
   └─ Share the Profile ID + passcode with family members / caretakers

3. Join Profile
   └─ Family members visit the app → "Join" → enter Profile ID + passcode

4. Add Medications
   └─ Name, dosage, frequency, time slots, start/end date, color, prescribing doctor

5. Log Doses
   └─ Each day: tap "Take" on each time-slot card → logged to Firestore

6. Track Adherence
   └─ Dashboard shows today's status, 7-day streak, 30-day chart

7. Manage Appointments
   └─ Add doctor visits; email reminders sent automatically

8. Emergency Card
   └─ One tap to view or download PDF emergency card for hospital visits

9. Health Notes
   └─ Daily journal with mood + symptom tracking

10. Email Reminders
    └─ Automatic reminders sent to all members via Gmail SMTP at scheduled times
```

---

## 🎯 Hackathon Info

| Field | Detail |
|-------|--------|
| **Event** | Catalyst × PromptWars |
| **Date** | November 15, 2026 |
| **Category** | Healthcare / Social Impact |
| **Team** | MediCare Team |
| **Stack constraint** | Must deploy on Google Cloud Run |

---

## 📁 Project Structure

```
medicare/
├── backend/
│   ├── server.js                  # Express entry point
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js                # Passcode authentication
│   ├── routes/
│   │   ├── profile.js
│   │   ├── medications.js
│   │   ├── appointments.js
│   │   ├── adherence.js
│   │   ├── analytics.js
│   │   ├── emergency.js
│   │   └── notes.js
│   └── services/
│       ├── firebaseAdmin.js
│       ├── reminderService.js
│       ├── emailService.js
│       └── pdfService.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   └── components/
│   ├── dist/                      # Built by `npm run build` (copied into Docker image)
│   └── package.json
├── Dockerfile
├── .dockerignore
├── .env.example
├── cloudbuild.yaml
├── deploy.sh                      # Linux/macOS deployment script
├── deploy.ps1                     # Windows deployment script
└── README.md
```

---

## 📝 License

[MIT](LICENSE) © 2026 MediCare Team
