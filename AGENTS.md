# NotesheetAI Agent Contract

## Product context
NotesheetAI supports policy-driven, explainable note-sheet and approval workflows. This repository contains the Python backend and a Next.js frontend in `frontend/`.

## Frontend delivery standard

### Before implementation
- Read the current route, component tree, `frontend/package.json`, global styles, and any existing product copy/assets.
- State a one-line design read: target user, task to complete, visual direction, and whether the work is a refinement or redesign.
- Preserve route structure, form field names, and existing product claims unless a task explicitly changes them.

### Build order
1. Define or reuse semantic color, typography, spacing, radius, and focus-state tokens.
2. Build reusable primitives before page-specific composition.
3. Implement desktop and mobile behavior in the same pass.
4. Use real screenshots, supplied assets, or generated assets for major visuals. Do not build fake dashboard screenshots from decorative divs.

### Visual and accessibility rules
- Aim for calm, professional product UI. Prioritize clarity and explainability over decorative effects.
- Maintain one coherent accent-color system per surface. Avoid generic purple gradients, gratuitous glass cards, and repeated equal-card layouts.
- Labels sit above inputs. Never use placeholders as the only label.
- Provide keyboard focus, WCAG AA contrast for text and controls, empty/loading/error states where applicable, and `prefers-reduced-motion` behavior for non-trivial animation.
- Do not invent customer logos, testimonials, policy results, or precise metrics.

### Verification gate
Before saying a UI change is complete:
- Run the applicable frontend build or test command.
- Inspect the page with browser DOM/console tools. Resolve relevant console errors.
- Verify computed styles for any spacing, contrast, or theme bug rather than relying only on screenshots.
- Capture and inspect desktop and mobile renderings when a local server is available.
- Report actual commands and outcomes.

## Repo safety
- Do not edit `.env`, credentials, generated databases, or unrelated in-progress files.
- Do not commit or push unless explicitly asked.
- Use targeted edits and preserve existing project conventions.
