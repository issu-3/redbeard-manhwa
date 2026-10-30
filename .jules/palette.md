## 2024-05-15 - ARIA Labels on Drag-and-Drop Image Grids
**Learning:** Icon-only buttons within list items or drag-and-drop grids (like drag handles and delete actions) need item-specific dynamic `aria-label`s (e.g., interpolating page numbers) rather than generic labels, so screen reader users can distinguish which specific item an action applies to when navigating via rotor or tab.
**Action:** When adding ARIA labels to repeated icon-only buttons, dynamically interpolate unique item identifiers (like title or index) into the label string.
