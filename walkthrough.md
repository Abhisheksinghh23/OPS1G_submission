# Walkthrough & Submission Guide — Gharpayy ops1g

This document outlines the modifications made, instructions for running the project locally, step-by-step Vercel deployment instructions, and recruiter templates.

---

## 1. Project Tech Stack & Structure

### Technology Stack
- **Framework**: [Vite](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [TanStack Router](https://tanstack.com/router) (File-based router)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs/) (Local state store with persistence)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://github.com/emilkowalski/sonner)

### Core Pages & Routes
- `/` [Public Landing Page]: Beautiful, responsive startup product page for Gharpayy Arena. Features an interactive properties grid (with search/filters), dynamic lead inquiry form, testimonials, FAQs, and personal branding in the footer.
- `/dashboard` [Arena Command Center]: The operations center tracking active leads, scheduled tours, conversion metrics, MRR, and inventory pressure.
- `/myt/pipeline` [Kanban Board]: Kanban pipeline board supporting toggling between the Arena Ops pipeline (Zustand) and the Unified Identity pipeline (Persisted Identity store).

---

## 2. Implemented Features & Enhancements

### 1. Modern Startup Landing Page (`/`)
- A professional header navigation with a responsive layout.
- Glassmorphic hero mockup showing live operational statistics (MRR growth, avg response, occupancy).
- Live properties listing with real-time text search and filter tags (Koramangala, Indiranagar, HSR, Whitefield, BTM) and budget range slider.
- An interactive visit request form with client-side regex validations. Submitting the form simulates an API request, registers the lead in the live store, and pops a success toast notification.

### 2. Custom Kanban Pipeline View (`/myt/pipeline`)
- Implemented a complete column-based Kanban tracking screen to align with `.lovable/plan.md`.
- Allows moving leads between columns (`New` &rarr; `Contacted` &rarr; `Tour Scheduled` &rarr; `Tour Done` &rarr; `Negotiation` &rarr; `Booked` &rarr; `Dropped`).
- Supports search and multiple dropdown filters (Area, TCM agent, Property).

### 3. Integrated Theme Toggle
- Added a dark/light mode toggle in the landing page header. Clicking it writes to local storage and toggles the `.dark` class on the root element, automatically styling all components using existing HSL tokens.

### 4. Configurable Settings Toggles & Automation (3 New Features Activated)
- **Show Only Verified Properties Toggle**: Excludes properties that are not GPS verified in the matching algorithm.
- **Hide Low Compliance Properties Toggle**: Excludes properties with compliance scores below 75 in the matching algorithm.
- **System Automation Rules Editor**: Added a dedicated "Automation rules" settings tab to view and toggle core operational routing triggers (like R04 Auto-route, R11 Block top room, etc.) live.
- **Dynamic Matching Engine**: Updated the matching engine to dynamically read weights and filter options from the settings store in `localStorage`.

### 5. Personal Branding
- A neat, professional signature block in the footer: **"Assignment enhanced and submitted by Abhishek Kumar"** along with GitHub, LinkedIn, and Email link placeholders.

---

## 3. How to Run Locally

Follow these steps to set up and run the project locally:

1. **Set Active Workspace**: 
   Ensure your IDE/editor is opened to the subdirectory:
   `C:\Users\shrib\.gemini\antigravity\scratch\ops1g`

2. **Install Dependencies**:
   Open a terminal in the folder and install node packages:
   ```bash
   npm install
   ```

3. **Start the Dev Server**:
   Launch the Vite development server:
   ```bash
   npm run dev
   ```
   *Typically opens at: `http://localhost:5173`*

4. **Verify Routes**:
   - Open `http://localhost:5173/` for the landing page and properties search.
   - Click "Launch Dashboard" or go to `http://localhost:5173/dashboard` for the admin portal.
   - Go to `http://localhost:5173/myt/pipeline` for the Kanban pipeline tracker.

5. **Test Build (Production check)**:
   Verify bundling success by running:
   ```bash
   npm run build
   ```

---

## 4. Vercel Deployment Instructions

Deploy the final project to Vercel in under 5 minutes:

### Option A: Via Vercel Git Integration (Recommended)
1. Initialize a Git repository inside `ops1g` if it is not already, add the code, and commit it:
   ```bash
   git init
   # Create a repository on your personal GitHub (e.g. named ops1g-gharpayy)
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
   git add .
   git commit -m "feat: enhance UI, add landing page, and integrate Kanban pipeline"
   git push -u origin main
   ```
2. Go to [Vercel](https://vercel.com/) and sign in using your GitHub account.
3. Click **Add New** &rarr; **Project**.
4. Import your newly pushed repository.
5. In the configuration window:
   - **Framework Preset**: Select `Vite` or `Other`.
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click **Deploy**. Vercel will build and provide a public `.vercel.app` URL.

### Option B: Via Vercel CLI
1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Navigate to the project folder and log in:
   ```bash
   vercel login
   ```
3. Initialize the deployment:
   ```bash
   vercel
   ```
   Follow the prompts:
   - *Set up and deploy?* **Yes**
   - *Which scope?* **[Your personal account]**
   - *Link to existing project?* **No**
   - *What's your project's name?* **ops1g**
   - *In which directory is your code located?* **./**
   - *Want to modify settings?* **No** (Vite settings are auto-detected)
4. Build and deploy to production:
   ```bash
   vercel --prod
   ```

---

## 5. Recruiter Submission & Interview Guide

### Recruiter WhatsApp Template
Copy and paste this message when submitting the assignment:

```text
ECHIEHQ
Live Assignment Link: https://YOUR-PROJECT-SUBDOMAIN.vercel.app
```

### 30-Second Interview Pitch
When asked about your implementation in the interview, explain:

> "I started by cloning the project, analyzing the file-based TanStack routing, and mapping the internal command center to a dedicated `/dashboard` route. I then built a premium, fully responsive marketing landing page on the root `/` route that pulls real-time property listings and vacant bed stats directly from the Zustand store. I added an interactive search bar, budget filters, and a form-validated visit scheduler that dynamically registers new leads back into the admin command center. 
> 
> Additionally, I aligned the project with the product specifications by implementing a custom Kanban Pipeline page at `/myt/pipeline` with Area, TCM, and Property filters, configured a client-side light/dark mode switcher, and verified the build locally before deploying the live application on Vercel."
