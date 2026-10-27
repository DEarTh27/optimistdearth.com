# Portfolio — modern editorial redesign

## Original resources restored

Recovered 15 unique original image resources from https://optimistdearth.com/ on 27 October 2026 into `images/`: project screenshots, five employer logos, and the profile photo. All ten project screenshots now have keyboard-accessible thumbnail links opening in a new tab. Their destinations match the corresponding text links. Window Therapeutics was corrected from the parked window.com domain to the verified https://windowtx.com/ site. All nine unique project destinations returned HTTP 200 (OMR Global required a full GET instead of HEAD). Browser verified all ten thumbnails decode and each thumbnail matches its text destination. Original assets are bundled, so no live-site hotlink is required.

The earlier notes about missing imagery and graphic studies below describe the previous milestone and are superseded by this resource restoration.

Updated 27 October 2026. The current design uses ivory, charcoal, sage, and burnt orange, custom typography, a drawn layered hero, graphic project covers, a compact career timeline, and a dark technology section. All ten project entries and the supplied experience/contact content are retained. Project covers are decorative typographic studies, not screenshots of client sites.

Open `index.html` for the current design. `milestone-1.html` preserves the preceding version. Do not rerun the old preparation script over the current page. To regenerate this redesign, run `node projects-handoff/redesign-portfolio.cjs` from the workspace root; style changes live in `design.css`.

Browser verification: 360px, 768px and 1440px layouts checked; no horizontal overflow at those widths. Mobile navigation opens and closes with Escape. Ten project articles render. No warnings or errors were captured in the checked browser session. External destination availability remains unverified.

## Original milestone notes (historical)

Buildless HTML/CSS/JavaScript. Original recovered files remain in `../../source/two-project-starter/portfolio/` and `../../portfolio/`.

Open `index.html` directly, or serve this directory with any static HTTP server. No install or build is required. This working copy has not been published.

Implemented: usable mobile menu with expanded state and Escape handling, progressive enhancement, skip link, keyboard focus, reduced motion, responsive company rows, metadata, descriptive image alternatives, safe external links, and repaired Quazma text.

The supplied archive contains no image assets. Clearly labeled placeholders retain the original paths in `data-original-src`; no screenshots or portraits have been fabricated. To restore an image, add its original file at that path and rerun `node projects-handoff/prepare-portfolio.cjs` from the workspace root. Preparation regenerates `index.html` from the preserved source; make durable HTML edits in that script.

Existing claims, employment dates, project URLs, and both Qral entries are preserved pending verification. Window Therapeutics links to window.com while the screenshot path says windowtx.com; confirm the intended domain before changing it. Canonical and social image metadata remain pending confirmation of deployment and original assets.
