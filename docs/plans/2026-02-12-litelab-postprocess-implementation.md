# LiteLab Postprocess Step 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Step 2 postprocess pipeline (outer background, padding, outer/inner radius) while keeping the cropped image size unchanged.

**Architecture:** Extend per-image state with postprocess settings and toggle Step 1/Step 2 UI. Render previews and exports via a shared postprocess canvas pipeline that wraps the existing crop render with background, padding, and corner radii.

**Tech Stack:** React (Vite), Tailwind CSS, Canvas 2D API

---

### Task 1: Add postprocess state model and defaults

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated tests are configured in this project. Skip.

**Step 2: Run test to verify it fails**

No tests available. Skip.

**Step 3: Write minimal implementation**

- Add a `step` state (e.g., `'crop' | 'postprocess'`) with default `'crop'`.
- Extend each image item with `postprocess` defaults:
  - `outerRadius: 0`
  - `innerRadius: 0`
  - `padding: 0`
  - `bgColor: '#ffffff'`
- Ensure new images receive these defaults.

**Step 4: Run test to verify it passes**

No tests available. Skip.

**Step 5: Commit**

```bash
git add src/pages/Cropper.jsx
git commit -m "feat: add postprocess state defaults"
```

### Task 2: Add Step switch UI and conditionally render panels

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated tests are configured in this project. Skip.

**Step 2: Run test to verify it fails**

No tests available. Skip.

**Step 3: Write minimal implementation**

- Add a Step toggle UI (Step 1: Crop, Step 2: Postprocess) near the top of the right-side settings area.
- Conditionally show existing crop/quality controls only for Step 1.
- Add a new “Postprocess” settings card (Step 2) containing:
  - Background color selection (palette buttons + optional input)
  - Padding slider + number input (0–120px)
  - Outer radius slider + number input (0–120px)
  - Inner radius slider + number input (0–120px)
  - “Apply current settings to all” button that copies postprocess fields

**Step 4: Run test to verify it passes**

No tests available. Skip.

**Step 5: Commit**

```bash
git add src/pages/Cropper.jsx
git commit -m "feat: add step switch and postprocess controls"
```

### Task 3: Implement postprocess render pipeline for preview and export

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated tests are configured in this project. Skip.

**Step 2: Run test to verify it fails**

No tests available. Skip.

**Step 3: Write minimal implementation**

- Create a helper that renders a cropped image into a canvas with:
  - Full-size background fill (`bgColor`)
  - Inner image area reduced by `padding`
  - Outer and inner rounded-rect clipping
  - Clamp values to avoid negative sizes
- Update preview rendering to use this pipeline when Step 2 is active.
- Update single download + ZIP export to use the postprocess pipeline when Step 2 is active; keep existing crop-only output for Step 1.

**Step 4: Run test to verify it passes**

No tests available. Skip.

**Step 5: Commit**

```bash
git add src/pages/Cropper.jsx
git commit -m "feat: render postprocessed output for step 2"
```

### Task 4: Update preview behavior and UX polish

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated tests are configured in this project. Skip.

**Step 2: Run test to verify it fails**

No tests available. Skip.

**Step 3: Write minimal implementation**

- Ensure Step 2 preview reflects postprocess changes immediately.
- Adjust labels or helper text to clarify Step 1 vs Step 2 behavior.

**Step 4: Run test to verify it passes**

No tests available. Skip.

**Step 5: Commit**

```bash
git add src/pages/Cropper.jsx
git commit -m "chore: polish step 2 preview behavior"
```
