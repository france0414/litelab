# LiteLab Entry Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a LiteLab home page with routing so users can enter the cropper tool from a tools overview page.

**Architecture:** Introduce client-side routing with a new Home page at `/` and the existing cropper tool at `/cropper`. Keep the cropper UI intact by moving it into a dedicated page component and using a router wrapper as the top-level App.

**Tech Stack:** React (Vite), React Router DOM, Tailwind CSS utilities.

---

### Task 1: Add routing dependency and setup

**Files:**
- Modify: `package.json`
- Modify: `src/main.jsx`

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- Install `react-router-dom`.
- Wrap the app with `BrowserRouter`, using `basename={import.meta.env.BASE_URL}` for GitHub Pages compatibility.

**Step 4: Manual verification**

Run: `npm run dev`
Expected: App still loads, no console errors.

**Step 5: Commit**

Skip (no git repo).

---

### Task 2: Create LiteLab home page

**Files:**
- Create: `src/pages/Home.jsx`
- Create: `src/pages/Home.css` (optional if needed)

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- Build a simple dark-theme landing layout with:
  - Brand header: `LiteLab` and tagline `用 AI 打造的輕量工具集合`
  - A tool card for the cropper with short description and button linking to `/cropper`
- Use existing Tailwind classes and dark theme styles for consistency.

**Step 4: Manual verification**

Run: `npm run dev`
Expected: `/` shows LiteLab home with one card and a button to the cropper.

**Step 5: Commit**

Skip (no git repo).

---

### Task 3: Move cropper UI into a dedicated page

**Files:**
- Create: `src/pages/Cropper.jsx`
- Modify: `src/App.jsx`

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- Move the existing cropper UI from `src/App.jsx` to `src/pages/Cropper.jsx` and export it.
- Convert `src/App.jsx` into a router that renders:
  - `/` -> `Home`
  - `/cropper` -> `Cropper`
  - `*` -> redirect to `/`
- Add a small `LiteLab` link in the cropper nav to return to the home page.

**Step 4: Manual verification**

Run: `npm run dev`
Expected:
- `/` shows LiteLab home.
- `/cropper` shows the cropper UI unchanged.
- Clicking the LiteLab link returns to `/`.

**Step 5: Commit**

Skip (no git repo).

---

### Task 4: GitHub Pages base path check

**Files:**
- Modify: `vite.config.js` (if needed)

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- If deploying to GitHub Pages under a repo subpath, set `base` in `vite.config.js` and confirm router basename uses `import.meta.env.BASE_URL`.

**Step 4: Manual verification**

Run: `npm run dev`
Expected: routing works locally; no broken asset paths.

**Step 5: Commit**

Skip (no git repo).
