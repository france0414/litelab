# Editable HTML Copy Button Design

## Goal
Add one new button in Table Converter that copies an editor-friendly HTML block while preserving all existing behaviors.

## Scope
- Keep all current features unchanged.
- Keep existing export and copy buttons unchanged.
- Add one new button labeled `複製可編輯 HTML`.
- New button copies current preview HTML wrapped by:

```html
<div
  class="s_table_of_feature table-responsive"
  data-vcss="001"
  data-snippet="s_table_of_feature"
  data-name="Table of Feature"
  data-tablefeature-template="flexible_content"
>
  ...current preview table html...
</div>
```

## User Flow
1. User uploads and edits table as usual.
2. User clicks `複製可編輯 HTML`.
3. App reads the same preview HTML currently used by preview/copy path.
4. App wraps that HTML with `div.s_table_of_feature.table-responsive` and required snippet data attributes.
5. Wrapped HTML is copied to clipboard for WYSIWYG editor paste.

## Architecture and Boundaries
- `src/pages/TableConverter/index.jsx`
  - Add one new handler that builds wrapped HTML from the current preview HTML.
  - Pass this handler to `TableReview`.
- `src/pages/TableConverter/TableReview.jsx`
  - Thread new callback prop to `ExportPanel`.
- `src/pages/TableConverter/components/ExportPanel.jsx`
  - Add a new action button with text `複製可編輯 HTML`.
  - Wire click event to the new callback.

No data model, parsing logic, or table editing logic changes.

## Data Flow
- Existing preview HTML generation remains source of truth.
- New copy path uses that same generated HTML and only adds fixed wrapper markup and fixed data attributes.
- Clipboard target is plain HTML string.

## Error Handling
- Reuse existing clipboard error handling pattern.
- If clipboard write fails, show existing failure messaging path (no new notification system).

## Testing Strategy
- Unit/component test updates:
  - `ExportPanel` test: new button renders and triggers callback.
  - Table converter flow test: callback writes wrapped HTML with required class names.
- Manual verification:
  - Click `複製可編輯 HTML`, paste into visual editor, confirm wrapper div exists.
  - Confirm existing `複製 HTML` still copies original non-wrapped content.
  - Confirm exports (`HTML/CSV/JSON`) unchanged.

## Non-Goals
- No rename/removal of existing buttons.
- No changes to wrapper class names.
- No changes to wrapper data attribute keys/values.
- No editor-specific branching (Odoo-only logic).

## Acceptance Criteria
- New button `複製可編輯 HTML` is visible in export/copy panel.
- Copied content always includes outer wrapper:
  - `class="s_table_of_feature table-responsive"`
- Copied content always includes wrapper data attributes:
  - `data-vcss="001"`
  - `data-snippet="s_table_of_feature"`
  - `data-name="Table of Feature"`
  - `data-tablefeature-template="flexible_content"`
- Wrapped inner content reflects current preview options (strip color/bold/class name).
- Existing features keep behavior exactly as before.
