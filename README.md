# Recipe Flow

Create a new project called "Recipes" — a personal recipe hosting site.

THEME

Match the color palette, typography, and overall dark aesthetic of https://huzaifah.me 

(source: https://github.com/simjeeh/portfolio). Pull the actual hex values from that repo's 

Tailwind/CSS config rather than guessing — I want it to feel like a companion site to that portfolio.

TECH

- React + Vite frontend

- Supabase for auth and data storage (single admin user, no public sign-up)

- Use a lightweight flow/diagram library (e.g. React Flow or a simple custom step-connector 

  component) for the "process" section — it should visually show steps in sequence, not just 

  render as another list

DATA MODEL

Each recipe has:

- title, slug

- ingredients: list of { amount, unit, name }

- process: ordered list of steps (each step is a node in the flow chart; steps can branch, 

  e.g. "prep toppings" happening in parallel with "blend base")

- is_hidden: boolean (default false)

- created/updated timestamps

PAGES

- Home: grid/list of all recipes (visible recipes only, unless logged in — then show hidden 

  ones too with a visual "hidden" badge)

- Recipe detail page: two clearly separated sections — "Ingredients" (simple checklist-style 

  list) and "Process" (flow chart of steps)

- No public recipe creation — only I add/edit recipes when logged in

AUTH

- Single admin account, no public registration

- Login via email/password + TOTP (authenticator app) as a second factor

- Login icon/button in the top-right corner; when logged out it just opens a login form, 

  no account info leaks (don't reveal whether an email exists, etc.)

ADMIN CAPABILITIES (visible only when logged in)

- Edit any existing recipe's title, ingredients, and process steps

- Toggle a recipe's hidden/visible status

- (Do not build recipe deletion or public multi-user support yet — keep scope to editing 

  and hide/show for now)

FIRST RECIPE (seed this as the initial page)

Title: Açaí Bowl

Ingredients (Blend):

- Açaí

- Frozen banana

- Frozen blueberries

- Frozen strawberries

- 1/2 cup apple juice

- 1/2 cup Greek yogurt

Toppings:

- Shredded coconut

- Strawberry

- Blueberry

- Banana

- Granola

- Chopped almonds

- Chia seeds

- Sunflower seeds

- Pumpkin seeds

Process (as flow steps):

1. Add açaí, frozen banana, frozen blueberries, frozen strawberries, apple juice, and Greek 

   yogurt to blender

2. Blend until smooth (branch: if too thick, add more apple juice; if too thin, add more 

   frozen fruit)

3. Pour into bowl

4. Add toppings: coconut, strawberry, blueberry, banana, granola, almonds, chia seeds, 

   sunflower seeds, pumpkin seeds

5. Serve immediately

GENERAL

- Follow modern web design best practices: clear visual hierarchy, generous whitespace, 

  accessible contrast ratios, consistent spacing scale

- Fully responsive/mobile-friendly — the ingredients list and flow chart both need to work 

  well on small screens (the flow chart especially, since diagrams tend to break on mobile — 

  consider a vertical/stacked layout on narrow viewports rather than shrinking a wide diagram)

- Before building, ask me any clarifying questions you have about the plan, data model, or 

  design direction

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://simjeeh-recipes.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b186e486-6ac2-4c25-b038-63c9a893c465).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
