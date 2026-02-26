# Postprocess Step 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a second-step postprocess workflow that applies background, padding, border, and corner radius to cropped images, with optional import of already-cropped images.

**Architecture:** Keep the current cropper as Step 1 and add a Step 2 postprocess mode with its own settings. Step 2 uses an outer canvas for background/border and an inner draw for the image with independent corner radius. Output pipeline is shared for single and batch exports.

**Tech Stack:** React (Vite), Canvas 2D, Tailwind CSS utilities.

---

### Task 1: Add step switch and postprocess state

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- Add a `activeStep` state with values `crop` and `postprocess`.
- Add postprocess settings state:
  - `ppBackground` (color string)
  - `ppPadding` (number)
  - `ppBorderColor` (color string)
  - `ppBorderWidth` (number)
  - `ppOuterRadius` (number)
  - `ppInnerRadius` (number)
- Add a small step toggle UI above the right-side settings.

**Step 4: Manual verification**

Run: `npm run dev`
Expected: Toggle switches between Crop and Postprocess modes without errors.

**Step 5: Commit**

Skip (no git repo in worktree).

---

### Task 2: Add postprocess settings UI

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- In Step 2 mode, show a settings card with:
  - Background color picker + quick swatches (white/black/light gray)
  - Padding slider/input
  - Border color picker + width
  - Outer radius slider/input
  - Inner radius slider/input
- Keep Step 1 settings hidden while in Step 2 mode.

**Step 4: Manual verification**

Run: `npm run dev`
Expected: Postprocess settings appear only in Step 2; controls update state.

**Step 5: Commit**

Skip (no git repo in worktree).

---

### Task 3: Support importing already-cropped images for Step 2

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- Add an optional "Load cropped images" button in Step 2.
- Reuse the existing upload pipeline but mark items as `isCropped: true` and set `zoom=1, crop={x:0,y:0}`.
- For Step 2, skip crop interactions; display images as-is.

**Step 4: Manual verification**

Run: `npm run dev`
Expected: In Step 2, uploading cropped images shows them in the queue without crop controls.

**Step 5: Commit**

Skip (no git repo in worktree).

---

### Task 4: Implement postprocess render pipeline

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- Add a `renderPostprocess` helper:
  - Create output canvas sized to target width/height.
  - Draw outer rounded rect (background).
  - Draw border stroke if `ppBorderWidth > 0`.
  - Compute inner rect (padding).
  - Clip to inner rounded rect and draw the image to fit inner rect.
- Use this helper in:
  - Single download
  - Batch ZIP export
- Keep Step 1 output unchanged when activeStep is `crop`.

**Step 4: Manual verification**

Run: `npm run dev`
Expected:
- Step 2 exports include background/padding/border/rounded corners.
- Step 1 exports unchanged.

**Step 5: Commit**

Skip (no git repo in worktree).

---

### Task 5: Update preview behavior

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated test harness exists. Skip test creation; use manual verification in Step 4.

**Step 2: Run test to verify it fails**

Skip (no test harness).

**Step 3: Write minimal implementation**

- In Step 2, show a simplified preview overlay (no crop grid, no drag).
- Optional: use a low-res preview (scaled down) to keep UI responsive.

**Step 4: Manual verification**

Run: `npm run dev`
Expected: Step 2 shows a static preview; Step 1 retains crop grid/drag.

**Step 5: Commit**

Skip (no git repo in worktree).
