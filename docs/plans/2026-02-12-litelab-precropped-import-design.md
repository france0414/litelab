# LiteLab Precropped Step 2 Import Design

**Goal**
Add a dedicated upload path for “already-cropped” images that jumps directly into Step 2 postprocess and locks Step 1 cropping UI.

**Scope**
- New upload action: “Import precropped images (Step 2)”
- Per-image flag to identify precropped assets
- Step 2 only UI and preview behavior when such image is selected
- No change to drag-and-drop (remains standard Step 1 upload)

**Key Decisions**
- Precropped images skip Step 1 and go directly to Step 2.
- Step 1 UI is hidden/disabled for precropped items.
- Crop state remains present but fixed at defaults for compatibility with render/export pipeline.

## Data Model

Extend each image item with:

```js
{
  isPreCropped: true,
  crop: { x: 0, y: 0 },
  zoom: 1
}
```

All images still carry the existing postprocess fields; precropped items simply skip crop UI and always render via Step 2 postprocess.

## UI/UX

- Add a new top-level upload button labeled “匯入已裁切圖片（Step 2）”.
- After precropped upload, auto-select the first new image and set Step to postprocess.
- When the current item is precropped:
  - Step switch is locked to Step 2.
  - Step 1 controls are hidden.
  - Helper text indicates the image is already cropped.

## Rendering & Export

- Preview always uses the Step 2 postprocess pipeline for precropped items.
- Export uses the same postprocess pipeline; Step 1 output is not available for precropped items.

## Error Handling

- Non-image files are ignored as in existing upload flow.
- If no image is selected, Step 2 controls remain disabled.

## Testing

- No automated tests (project lacks test runner).
- Manual verification steps:
  1) Upload via precropped button → UI jumps to Step 2.
  2) Step 1 controls hidden/locked for precropped item.
  3) Postprocess sliders update preview.
  4) Single and ZIP export reflect postprocess settings.
