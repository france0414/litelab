# Editable HTML Copy Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `複製可編輯 HTML` button that copies the current preview HTML wrapped with the required container class and snippet data attributes, without changing any existing export/copy behavior.

**Architecture:** Keep current Table Converter flow intact and add one parallel copy path. Implement wrapper generation in a tiny utility so the wrapper format is testable in isolation, then thread a new callback from `index.jsx` -> `TableReview.jsx` -> `ExportPanel.jsx`.

**Tech Stack:** React, Vite, Vitest, Testing Library

---

## File Structure

- Create: `src/pages/TableConverter/utils/buildEditableHtml.js`  
  Responsibility: Build wrapped HTML string with fixed class + data attributes.
- Create: `src/pages/TableConverter/utils/buildEditableHtml.test.js`  
  Responsibility: Verify wrapper structure and attribute values.
- Modify: `src/pages/TableConverter/index.jsx`  
  Responsibility: Reuse preview HTML source of truth; add new copy callback using wrapper utility.
- Modify: `src/pages/TableConverter/TableReview.jsx`  
  Responsibility: Accept and forward new callback prop to export panel.
- Modify: `src/pages/TableConverter/components/ExportPanel.jsx`  
  Responsibility: Render `複製可編輯 HTML` button and call new callback.
- Modify: `src/pages/TableConverter/components/ExportPanel.test.jsx`  
  Responsibility: Verify new button renders and fires callback.

### Task 1: Add wrapper utility with TDD

**Files:**
- Create: `src/pages/TableConverter/utils/buildEditableHtml.js`
- Create: `src/pages/TableConverter/utils/buildEditableHtml.test.js`

- [ ] **Step 1: Write the failing test for wrapper output**

```js
import { describe, expect, it } from 'vitest';
import { buildEditableHtml } from './buildEditableHtml.js';

describe('buildEditableHtml', () => {
  it('wraps preview html with required class and snippet attributes', () => {
    const previewHtml = '<table><tr><td>A</td></tr></table>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toContain('class="s_table_of_feature table-responsive"');
    expect(result).toContain('data-vcss="001"');
    expect(result).toContain('data-snippet="s_table_of_feature"');
    expect(result).toContain('data-name="Table of Feature"');
    expect(result).toContain('data-tablefeature-template="flexible_content"');
    expect(result).toContain(previewHtml);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/pages/TableConverter/utils/buildEditableHtml.test.js`

Expected: FAIL with module-not-found or export-not-found for `buildEditableHtml`.

- [ ] **Step 3: Write minimal implementation**

```js
export const buildEditableHtml = (previewHtml) => {
  return `<div class="s_table_of_feature table-responsive" data-vcss="001" data-snippet="s_table_of_feature" data-name="Table of Feature" data-tablefeature-template="flexible_content">${previewHtml}</div>`;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/pages/TableConverter/utils/buildEditableHtml.test.js`

Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add src/pages/TableConverter/utils/buildEditableHtml.js src/pages/TableConverter/utils/buildEditableHtml.test.js
git commit -m "test: add editable html wrapper utility"
```

### Task 2: Add new copy callback and UI button with TDD

**Files:**
- Modify: `src/pages/TableConverter/components/ExportPanel.test.jsx`
- Modify: `src/pages/TableConverter/components/ExportPanel.jsx`
- Modify: `src/pages/TableConverter/TableReview.jsx`
- Modify: `src/pages/TableConverter/index.jsx`

- [ ] **Step 1: Write failing component test for new button callback**

```jsx
it('fires onCopyEditableHtml when editable copy button is clicked', async () => {
  const onCopyEditableHtml = vi.fn();
  const user = userEvent.setup();

  render(
    <ExportPanel
      onExport={() => {}}
      onCopyHtml={() => {}}
      onCopyEditableHtml={onCopyEditableHtml}
      stripColor={false}
      onStripColorChange={() => {}}
      stripBold={false}
      onStripBoldChange={() => {}}
      className=""
      onClassNameChange={() => {}}
    />,
  );

  await user.click(screen.getByRole('button', { name: '複製可編輯 HTML' }));

  expect(onCopyEditableHtml).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/pages/TableConverter/components/ExportPanel.test.jsx`

Expected: FAIL because button `複製可編輯 HTML` is not rendered yet.

- [ ] **Step 3: Implement button + callback threading**

Update `src/pages/TableConverter/components/ExportPanel.jsx` props and button:

```jsx
const ExportPanel = ({ onExport, onCopyHtml, onCopyEditableHtml, stripColor, onStripColorChange, stripBold, onStripBoldChange, className, onClassNameChange }) => {
  // existing code...

  return (
    <div>
      {/* existing controls... */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {/* existing export buttons... */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCopyEditableHtml} className="inline-flex items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-600/20 px-4 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-600/30">
            複製可編輯 HTML
          </button>
          <button type="button" onClick={handleCopy} className="inline-flex items-center justify-center rounded-2xl border border-blue-500/40 bg-blue-600/20 px-4 py-3 text-sm font-black text-blue-200 transition hover:bg-blue-600/30">
            {copied ? '✓ 已複製' : '複製 HTML'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

Update `src/pages/TableConverter/TableReview.jsx` prop signature and forwarding:

```jsx
const TableReview = ({
  // existing props...
  onCopyHtml,
  onCopyEditableHtml,
  // existing props...
}) => {
  return (
    <section className="space-y-6">
      {/* existing sections... */}
      <ExportPanel
        onExport={onExport}
        onCopyHtml={onCopyHtml}
        onCopyEditableHtml={onCopyEditableHtml}
        stripColor={stripColor}
        onStripColorChange={onStripColorChange}
        stripBold={stripBold}
        onStripBoldChange={onStripBoldChange}
        className={tableClassName}
        onClassNameChange={onClassNameChange}
      />
    </section>
  );
};
```

Update `src/pages/TableConverter/index.jsx` to reuse preview HTML and wire new callback:

```jsx
import { buildEditableHtml } from './utils/buildEditableHtml.js';

const previewHtml = activeTable
  ? toHtml(activeTable, { stripColor, stripBold, className: tableClassName || undefined })
  : '';

<TableReview
  // existing props...
  previewHtml={previewHtml}
  onCopyHtml={() => {
    navigator.clipboard.writeText(previewHtml);
  }}
  onCopyEditableHtml={() => {
    navigator.clipboard.writeText(buildEditableHtml(previewHtml));
  }}
  // existing props...
/>
```

- [ ] **Step 4: Run focused tests to verify pass**

Run: `npm run test -- src/pages/TableConverter/components/ExportPanel.test.jsx src/pages/TableConverter/utils/buildEditableHtml.test.js`

Expected: PASS for both files.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TableConverter/components/ExportPanel.jsx src/pages/TableConverter/components/ExportPanel.test.jsx src/pages/TableConverter/TableReview.jsx src/pages/TableConverter/index.jsx
git commit -m "feat: add editable html copy action"
```

### Task 3: Verify no regressions and document manual editor paste check

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Run all Table Converter tests**

Run: `npm run test -- src/pages/TableConverter`

Expected: PASS for Table Converter test suite.

- [ ] **Step 2: Run full test suite**

Run: `npm run test -- --run`

Expected: PASS with no newly introduced failures.

- [ ] **Step 3: Manual browser verification for copy flows**

Run: `npm run dev`

Manual checks:
1. Upload sample `.xlsx`/`.docx` with a visible table.
2. Click `複製 HTML`, paste into text editor, confirm no wrapper `div.s_table_of_feature` is added.
3. Click `複製可編輯 HTML`, paste into text editor, confirm wrapper exists and includes all attributes.
4. Paste `複製可編輯 HTML` result into visual editor and confirm table remains editable/displayed.

- [ ] **Step 4: Commit verification note (only if project convention requires)**

```bash
git status
```

Expected: clean working tree (or only unrelated pre-existing changes).

---

## Spec Coverage Check

- New button label `複製可編輯 HTML`: covered in Task 2.
- Preserve existing features/old copy behavior: covered in Task 2 + Task 3 manual checks.
- Wrapper class and required attributes: covered in Task 1 tests + Task 2 wiring.
- Current preview HTML as source of truth (strip options/class): covered in Task 2 (`previewHtml` reuse).

## Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- All code-edit steps include concrete snippets and exact file paths.

## Type/Interface Consistency

- Prop name is consistently `onCopyEditableHtml` across `index.jsx`, `TableReview.jsx`, and `ExportPanel.jsx`.
- Utility function name is consistently `buildEditableHtml` across implementation and tests.
