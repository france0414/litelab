# LiteLab Precropped Step 2 Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated upload path for already-cropped images that jumps directly into Step 2 postprocess and locks Step 1 cropping UI.

**Architecture:** Extend image items with an `isPreCropped` flag. Add a new upload handler that sets `isPreCropped` and defaults. Gate Step switch and panels based on the current item, forcing Step 2 and hiding Step 1 UI for precropped items.

**Tech Stack:** React (Vite), Tailwind CSS

---

### Task 1: Add precropped flag and upload handler

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated tests are configured in this project. Skip.

**Step 2: Run test to verify it fails**

No tests available. Skip.

**Step 3: Write minimal implementation**

- Extend image items with `isPreCropped` default `false` on normal upload.
- Add a new upload handler for precropped images that sets:
  - `isPreCropped: true`
  - `crop: { x: 0, y: 0 }`
  - `zoom: 1`
- Ensure precropped items still include existing postprocess defaults.

**Step 4: Run test to verify it passes**

No tests available. Skip.

**Step 5: Commit**

```bash
git add src/pages/Cropper.jsx
git commit -m "feat: add precropped upload handler"
```

### Task 2: Add “Import precropped” UI and force Step 2

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated tests are configured in this project. Skip.

**Step 2: Run test to verify it fails**

No tests available. Skip.

**Step 3: Write minimal implementation**

- Add a new button labeled “匯入已裁切圖片（Step 2）”.
- Wire it to the new precropped upload handler.
- When a precropped item is selected, force `step` to `'postprocess'` and disable/lock Step 1.
- Add helper text indicating the image is already cropped and goes directly to Step 2.

**Step 4: Run test to verify it passes**

No tests available. Skip.

**Step 5: Commit**

```bash
git add src/pages/Cropper.jsx
git commit -m "feat: add precropped import UI"
```

### Task 3: Ensure preview/export uses Step 2 for precropped items

**Files:**
- Modify: `src/pages/Cropper.jsx`

**Step 1: Write the failing test**

No automated tests are configured in this project. Skip.

**Step 2: Run test to verify it fails**

No tests available. Skip.

**Step 3: Write minimal implementation**

- If `currentItem.isPreCropped`, always use postprocess preview regardless of the Step switch.
- Ensure single and ZIP export use postprocess rendering for precropped items.
- Keep existing behavior for normal items.

**Step 4: Run test to verify it passes**

No tests available. Skip.

**Step 5: Commit**

```bash
git add src/pages/Cropper.jsx
git commit -m "feat: force postprocess for precropped items"
```
