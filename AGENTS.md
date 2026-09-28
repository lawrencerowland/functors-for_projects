# Project Apps Repository

This repository contains a basic React/Vite setup that can host many small applications. Only a single template app lives in `apps/portfolio-state-machine/` but the tooling supports adding more apps under `apps/<app-name>`.

## Working With Apps

- `npm start` launches a development server on port `3000`. Use `APP=<app-name>` to serve a different app if more are added.
- `npm test` runs the Vitest test suite (tests live under each app's `src` folder).
- `npm run build` executes `scripts/build-all.js` which builds every app under `apps/` and outputs them to `docs/apps/<app-name>`.

## Repository Conventions

- Each app lives in `apps/<app-name>` with its own `src` directory and `index.html`. Shared utilities are under `src/common`.
- Screenshots for the index page are stored in `pics/`. The numeric `#` column in `app-index.csv` matches a screenshot named `pics/<number>.png`. Missing images fall back to `pics/blank.png`.
- Include `<a href="../../index.html">Back to app index</a>` somewhere in each app's `index.html` so users can return easily.

## Design Guidelines
- Use the shared `common.css` stylesheet in all static apps to ensure a unified look. It imports the Inter font and defines base margins, heading styles and button classes.
- Link to `common.css` with a relative path, e.g. `<link rel="stylesheet" href="../../common.css">`.
- Include `<meta name="viewport" content="width=device-width, initial-scale=1">` and design with flexible layouts so pages remain responsive on mobile.
- Keep asset paths relative (avoid leading `/`) so the site works when published to GitHub Pages. In React apps pass `basename={import.meta.env.BASE_URL}` to `BrowserRouter`.
- Embed small datasets inline so each app can be opened directly without a server.


## Grounded-theory illustration

The static app in `apps/grounded-theory-colimit/index.html` computes a finite quotient and candidate factor map. Preserve its explicit mathematical limits and user-chosen identifications. Run `node tests/grounded-theory-colimit.cjs` when editing it. Its ordinary entry is the home-page catalogue at `index.html#apps`; the old `app-index.html` route redirects there.

## Home catalogue and atlas (28 September 2026)
`app-index.csv` is the catalogue source; `scripts/generate-catalogue.js` maintains the static cards in the home page and runs during build. Keep the atlas explanation and project graph reciprocal links. The project graph checks relationship coverage, not functor laws. Run the four `tests/*.cjs` checks before publishing catalogue or atlas changes.

## Milestone context example (28 September 2026)
Keep `apps/fibration-milestone-linking/` canonical and preserve the V2 redirect. The example distinguishes observed changes, shared-scope decisions, supplied adaptation rules, computed dependencies/feasibility and the unproved categorical interpretation. Run the milestone context and catalogue tests alongside existing checks when changing it. Do not restore baseline-as-total-order or float-as-linear-extension claims.


## Geometry of Interaction — Island Reading Room (28 September 2026)
Keep the canonical route `apps/geometry-of-interaction/`. The main essay implements finite Int(Pfn, disjoint union) routing; it does not claim full game semantics, learned policies, ecological safety or completed delivery. Preserve the two externally initiated episodes and the distinction between a changed observation, changed action and deliberately changed policy. The signed feedback diagram and observable A/C projection must follow the computed model. `wiring-lab.html` preserves the corrected matching comparison; its detached loop counts are not scalars of Int(Pfn). Run `node tests/goi-interaction.cjs` and `node tests/goi-page.cjs`, the other required model/catalogue checks, a build and desktop/phone/keyboard journeys before publication.
