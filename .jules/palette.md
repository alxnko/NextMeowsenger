## 2024-05-24 - Semantic ARIA roles for custom Next.js UI components
**Learning:** Custom interactive components like switches and tab lists built with `div` and `button` elements in this app's design system frequently lack necessary semantic ARIA roles (`role="switch"`, `role="tablist"`). Relying solely on visual styling masks these accessibility gaps for screen readers.
**Action:** When inspecting or refactoring custom UI components that mimic native form controls or tabs, explicitly verify and inject the correct ARIA attributes to ensure semantic equivalence, particularly in heavily styled `div`/`button` wrappers.

## 2024-05-25 - ARIA attributes for Custom Modals and Toggle Buttons
**Learning:** Custom modal implementations in this codebase (like `ForwardModal`) that don't use the standard `ui/Modal` component often miss explicit ARIA attributes like `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Additionally, selectable items that function as toggles (like contacts in `ContactPicker` or chats in `ForwardModal`) rely only on visual state, neglecting `aria-pressed`.
**Action:** Always ensure custom modals have `role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` linked to their title. For buttons that act as toggles within lists, explicitly add `aria-pressed={isSelected}` so screen readers announce their active state properly.

## 2024-06-10 - ARIA Labels for visually hidden input contexts
**Learning:** In reusable UI components like `<Input />`, providing a visual `label` is not always appropriate (e.g., search bars, inline chat inputs). In these contexts, relying solely on placeholders is insufficient for screen readers.
**Action:** When a visible label is omitted from an input control, always supply an explicit `aria-label` attribute (e.g., `aria-label="Type a message"`) to guarantee accessibility and semantic meaning.
