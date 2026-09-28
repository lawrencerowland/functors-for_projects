# The Island Reading Room — Geometry of Interaction

Canonical route: `apps/geometry-of-interaction/index.html`.

The fictional project is fitting out a reading room on a tidal island. An inspector supplies an access report; a landing coordinator interprets it; a delivery coordinator proposes a delivery plan. Their authored response policies can agree, refuse an option, omit a response or repeat an internal exchange. Outputs are proposed work instructions, not completed deliveries or evidence of ecological or engineering safety.

## Why this scenario

The scene combines a visible small project and a purpose worth caring about, physical and organisational boundaries, a shared resource, alternative actions and a change that propagates. The tide affects access; pallet versus hand-carried boxes creates a genuinely different delivery response. A seal is a bystander, not a second animal-blocking-the-road story. The model remains small enough to predict and inspect, while the reusable pattern extends beyond the island: an observation becomes an offered capability, and another component interprets that capability under its own policy.

## Model and evidence boundary

`model.js` implements finite typed partial functions with disjoint-union tensor and Int-style composition. An A→B component has type A+ ⊔ B− ⇀ A− ⊔ B+. The shared B+ and B− ports are fed between f and g; g ∘ f exposes A+ ⊔ C− ⇀ A− ⊔ C+. Exact repeated `(component side, input message)` states witness internal divergence. Missing and divergent routes both leave the exterior function undefined, while retained traces explain their different causes.

The dialogue has two independently initiated exterior episodes. A C− request reaches an A− request for a report. A reader then supplies A+; it is not inferred from the request. A partial function is not by itself a full game strategy: legal histories, game arenas and stronger strategy conditions would need a separate construction. Policies here are authored deterministic response rules, not learned strategies or equilibrium solutions. A changed input can change the next action without modifying the receiving policy.

`wiring-lab.html` preserves the older undirected matching demonstration and its available choices, token tracing and formal loop counts. Its composition label, internal-launch explanation and strategy claims are corrected; ports now also support keyboard activation. This matching model can retain distinct detached-loop counts. Int(Pfn) has only the empty partial function as a scalar at its empty unit, so those counts are not silently transferred to the main model.

## Source → concept → construction

- Samson Abramsky, [Retracing GoI with Phil](https://oxford24.github.io/assets/slides/retracing_PJS.pdf#page=9), ACT/MFPS Oxford 2024, numbered slide 5: the signed symmetric-feedback picture that motivates the main diagram.
- Esfandiar Haghverdi and Philip Scott, [Geometry of Interaction and the Dynamics of Proof Reduction: a tutorial](https://www.site.uottawa.ca/~phil/papers/HS.GoI-tut.33.pdf), 2008 preprint: §4.1 (especially pp.28–29) for particle-style partial-function traces, §4.3 (pp.32–33) for Int. Foundational construction: Joyal, Street and Verity, [Traced Monoidal Categories](https://doi.org/10.1017/S0305004100074338), 1996.
- Samson Abramsky, [Semantics of Interaction](https://www.cs.ox.ac.uk/people/samson.abramsky/coursenotes.pdf#page=10), 1997, pp.10–11: interaction and hiding for strategies in specified games. This is the next semantics to connect explicitly, not a theorem claimed for arbitrary routing maps.
- Ghani, Hedges, Winschel and Zahn, [Compositional Game Theory](https://pureportal.strath.ac.uk/files-asset/81228619/Ghani_etal_LICS_2018_Compositional_game_theory.pdf), 2018, §3: an optional bridge to strategic open games. The lens/Int agreement on p.4 assumes a traced cartesian base. Ordinary open games are not simply the compact-closed construction pictured here.

The scenario, interface vocabulary, component policies and visual teaching sequence are this essay's construction. The source theory does not establish the usefulness of those modelling choices in a real project.

## Verification

From repository root run `node tests/goi-interaction.cjs` and `node tests/goi-page.cjs`, plus the existing model/catalogue checks, then `npm run build`. The pure-model tests cover normal outputs, absent rules, exact cycle witnesses, typing, identity and associativity in finite instances. Browser verification should cover the explicit report boundary, policy alternatives, diagnostic outcomes, exterior view, reset/reload, keyboard and narrow-screen use. Passing these checks establishes bounded software behaviour, not human-user validation or a proof of general organisational value.

## Artwork

`assets/emblem.svg`: an original code-native emblem combining an open book with an island hut and two opposing request/reply curves; also used as `pics/6.svg` in the catalogue.

`assets/island-reading-room.jpg`: original illustration generated with the built-in image-generation tool on 28 September 2026, then encoded as JPEG for the webpage. No source photograph or third-party reference image was used. The original generated PNG is retained outside the repository; the JPEG is the published asset. The scene is figurative and does not prescribe a real landing operation.

Generation prompt:

> Use case: illustration-story. Asset type: wide hero illustration for a public educational project-mathematics app, 'The Island Reading Room'. Create a warm, witty, beautiful editorial illustration in textured ink and gouache on pale cream paper. Wide landscape composition, approximately 2:1. A very small fictional Scottish tidal island has an old stone cottage becoming a community reading room. Bookshelves and books in small crates wait by a little delivery boat. The jetty ends above the low-tide waterline, while a separate gently sloping shingle landing and footpath lead to the cottage. Two adult coordinators, one at the landing with a clipboard and one beside the boat with a pallet and several carryable book boxes, are visibly talking across this logistical puzzle; make their friendly discussion legible without words. A contented seal sits on a nearby rock, a humorous unconcerned observer, not blocking either route. One seabird, distant blue-grey hills, seaweed and a few planted flowers. Palette: deep petrol teal, warm muted ochre, sea-glass green, chalk cream, restrained coral. Style: sophisticated illustrated field notebook, confident fine linework, tactile printed grain, inviting and slightly whimsical, not a software diagram, not childish clipart or glossy 3D. Strong silhouette of cottage, boat, low-tide jetty and alternate path; coherent scale and geography. Leave some breathing space in the upper sky. No text, lettering, equations, labels, arrows, logos, watermarks or speech bubbles. This is an imagined scenario illustration, not engineering guidance.
