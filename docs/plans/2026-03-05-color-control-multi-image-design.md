# Color Control Multi-Image Design

## Goal
Add multi-image workflow to Color Control with a layout aligned to the Cropper page. Users can upload multiple images, switch via left thumbnails, edit per-image settings, and apply a set of adjustments to all images. Provide single and batch export.

## Scope
- Align page layout to Cropper frame (top nav + left thumbnails + center preview + right controls).
- Support multiple images with per-image settings and advanced adjustments.
- Add "apply to all" for settings/advanced.
- Keep existing AI flow (single API key, prompt, optional reference image).
- Add batch download (ZIP) and single download.

## Non-Goals
- Per-image AI prompt history.
- Multi-reference images per target.
- Server-side processing or storage.

## UI Structure
- Top bar: Color Control title + link back to LiteLab + primary actions.
- Left column: thumbnail list; click to set current image; show count.
- Center: preview canvas of current image; top-aligned within container.
- Right column: AI panel + global adjustments + advanced adjustments.

## Data Model
- `imageList`: array of items `{ id, name, src, imageObj, settings, advanced }`.
- `currentIndex`: active image index.
- `refImageSrc/refImageObj`: shared reference image.
- `apiKey`, `aiPrompt`, `aiExplanation`, `aiError`: shared AI state.
- `isProcessing`, `isAiLoading`: shared UI state.

## Data Flow
- Upload: create items with default settings; set current index.
- Select thumbnail: update `currentIndex`, load its `imageObj`, render canvas.
- Adjust sliders: update current item settings; re-render canvas.
- Apply to all: copy current item settings/advanced to all items.
- AI run: compute settings/advanced; apply to current or all based on user action.
- Download: render current item to canvas for PNG; batch zip uses JSZip.

## Error Handling
- Missing API key / missing image / missing prompt or ref image show user-facing errors.
- AI response parsing guarded; non-JSON or missing payload returns friendly error.
- localStorage access guarded with try/catch.

## Performance
- Keep preview max size capped (1000px) as is.
- Debounce advanced pixel processing and run in `requestAnimationFrame`.

## Testing
- Manual: multi-upload, switch images, apply-to-all, AI on current, AI on all, single download, batch download.
- Optional unit tests for AI response parsing and apply-to-all behavior.

## Implementation Notes
- Reuse Cropper layout classes and structure where possible.
- Keep existing styles and copy; avoid changing AI logic besides per-image application.
- Use dynamic JSZip loader as in Cropper.
