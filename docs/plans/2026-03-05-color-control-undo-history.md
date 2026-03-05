# Color Control Undo History

## Goal
Provide per-image multi-step undo/redo (20 steps) for color adjustments so users can recover earlier states while editing multiple images.

## Scope
- Maintain independent history for each image.
- Record changes when settings/advanced controls change.
- Provide Undo/Redo buttons for the current image.
- Apply-to-all or AI apply resets history for affected images to avoid confusion.

## Data Model
- Each image item includes:
  - `settings`
  - `advanced`
  - `history`: array of snapshots `{ settings, advanced }`
  - `historyIndex`: current pointer in the history

## Behavior
- Every slider/toggle change pushes a snapshot.
- If user undoes and then changes values, truncate forward history.
- Keep at most 20 snapshots; discard oldest when over limit.
- Undo moves to previous snapshot; Redo moves to next.
- Apply-to-all or AI apply resets history for affected images to a single snapshot.

## UI
- Add Undo/Redo buttons on the right panel.
- Disable buttons when no history in that direction.

## Error Handling
- No extra error handling needed beyond existing checks.

## Testing
- Manual: adjust sliders → undo/redo; switch images; apply-to-all; AI apply; confirm history behaves as expected.
