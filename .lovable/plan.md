## Recipes — personal recipe hosting site

### Theme (pulled from simjeeh/portfolio)
Confirmed from the repo, not guessed:
- `tailwind.config.ts` → `primary: #90d5c5` (mint/teal accent)
- `app/layouts/default.vue` → `bg-black text-white`
- `app/app.vue` → Inter (Google Fonts)
- Navbar/cards → `bg-black/90` + `backdrop-blur-md`, `border-gray-700`, hover `bg-white/5`, bold nav labels, teal underline on active

These become design tokens in `src/styles.css`: near-black background, white foreground, `#90d5c5` primary, gray-700 borders, subtle white/5 surfaces. Inter loaded via `<link>` in the root route.

### Tech note
The project scaffold is React + Vite with TanStack Start (SSR-capable router) rather than bare React Router — same React/Vite stack, just a better routing/data layer. Backend is Lovable Cloud (Supabase under the hood) for auth + Postgres.

### Data model
`recipes`
- `id` uuid, `title` text, `slug` text unique
- `ingredients` jsonb — flat ordered list of `{ amount, unit, name }`
- `process` jsonb — ordered steps: `{ id, label, detail?, parents: string[], branch_label? }`; a step with multiple children renders as a fork, so "if too thick / if too thin" and parallel prep both work
- `is_hidden` boolean default false
- `created_at`, `updated_at` timestamptz

Security: RLS on. `anon` + `authenticated` can SELECT only `is_hidden = false`; authenticated can SELECT all and UPDATE. No INSERT/DELETE policies (scope: edit + hide/show only). Grants issued explicitly.

The Açaí Bowl recipe is seeded directly in the migration (ingredients flattened, toppings included in the same list; process steps 1–5 with the thick/thin branch off step 2).

### Pages
- `/` — Home: card grid of recipes. Logged out shows visible only; logged in also shows hidden ones with a teal-outlined "Hidden" badge.
- `/recipe/$slug` — detail page, two clearly separated sections:
  - **Ingredients** — checklist-style, tappable checkboxes with strikethrough (local state only)
  - **Process** — flow chart
- `/recipe/$slug/flow-b` — same recipe, alternate flow-chart implementation, with a small toggle link between the two so you can compare
- `/auth` — login form
- `/recipe/$slug/edit` — admin-only, under the authenticated gate

### Flow chart — two variants to choose from
Both render the same `process` data from a shared adapter.
1. **React Flow** (`@xyflow/react`): auto-laid-out node graph, dark themed, pan/zoom, branch edges with labels. On narrow viewports it switches to a single-column vertical layout with fitView so it doesn't become a shrunken wide diagram.
2. **Custom step connector**: no heavy dependency — vertical numbered nodes with drawn connector rails, forks splitting into side-by-side branch columns on desktop and stacking into indented branch lanes on mobile.

You pick one; the loser gets deleted in a follow-up.

### Auth
- Email/password sign-in, plus TOTP as a required second factor (Supabase MFA).
- First successful password login with no enrolled factor → in-app enrollment screen with QR code + secret, verify a code to complete. Afterwards every login prompts for the 6-digit code.
- No sign-up route, no password-reset email disclosure, no "user not found" messaging — every failure returns one generic "Invalid credentials" string.
- Top-right icon button in the header: logged out → opens login; logged in → account menu with Sign out and, on a recipe page, an Edit link.

### Admin capabilities (authenticated only)
- Edit title, ingredients (add/remove/reorder rows), and process steps (label, detail, parent links to form branches)
- Toggle hidden/visible
- No create, no delete, no multi-user

### Responsive & accessibility
- Single spacing scale, generous whitespace, max-width content column
- Teal `#90d5c5` on near-black passes AA for body and large text; teal used for accents/links, white for primary text
- Focus rings on all interactive elements, checkboxes are real inputs with labels
- Flow charts both have explicit mobile layouts as described

### Technical details
- Lovable Cloud enabled; schema + seed applied via one migration with explicit GRANTs
- Reads through public server functions (publishable-key client) so the home page and recipe pages SSR and get proper OG metadata; admin reads/writes go through `requireSupabaseAuth` server functions
- Per-route `head()` metadata: home, each recipe (title + description from the recipe), auth
- Edit route lives under `_authenticated/`; auth gate is the integration-managed one
