---
name: frontend
description: "Frontend expertise skill for TypeScript, Next.js, Vite, and React projects. Provides best practices, patterns, and conventions for building modern web applications. Covers: component architecture, state management, styling (Tailwind + shadcn/ui), animation (Framer Motion), accessibility, performance, testing (Playwright + Vitest), and design integration (Figma MCP). Use when implementing frontend tasks, reviewing frontend code, designing UI components, or when the task type is 'frontend'."
---

# Frontend Expertise

Expert-level frontend engineering guidance for the project stack.

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Language | TypeScript 5+ | Strict mode, no `any` |
| Framework | Next.js 15 (App Router) | SSR, RSC, routing, API routes |
| Build | Vite | Fast dev server, HMR for non-Next modules |
| UI Primitives | Radix UI | Accessible, unstyled headless components |
| Component Library | shadcn/ui | Radix + Tailwind pre-composed components |
| Styling | Tailwind CSS 4 | Utility-first, design tokens via CSS variables |
| Animation | Framer Motion | Declarative layout and gesture animations |
| Icons | Lucide React | Consistent, tree-shakeable icon set |
| Charts | Recharts | Composable chart components |
| Forms | React Hook Form + Zod | Validation at runtime and type level |
| State (client) | Zustand | Minimal global state when needed |
| State (server) | TanStack Query | Cache, refetch, optimistic updates |
| Testing | Vitest + Playwright | Unit/integration + E2E |
| Design | Figma (via MCP) | Design-to-code bridge |

## TypeScript Rules

- `strict: true` in tsconfig — no exceptions
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `satisfies` over `as` for type narrowing
- Derive types from schemas (Zod → infer) rather than duplicating
- Use discriminated unions for state machines and variant props
- Avoid `enum` — use `as const` objects with derived union types
- Generic constraints: `<T extends Record<string, unknown>>` over `<T extends object>`
- Return types: explicit on exported functions, inferred on internal ones

```typescript
// Derive types from Zod schemas
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: z.enum(["admin", "member", "viewer"]),
});
type User = z.infer<typeof userSchema>;

// Discriminated union for state
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

// as const over enum
const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  settings: "/settings",
} as const;
type Route = (typeof ROUTES)[keyof typeof ROUTES];
```

## Next.js Patterns

### Server vs Client Components

Default to Server Components. Add `"use client"` only when the component needs:
- Event handlers (`onClick`, `onChange`, etc.)
- Hooks (`useState`, `useEffect`, `useRef`, etc.)
- Browser APIs (`window`, `localStorage`, etc.)
- Third-party client libraries (Framer Motion, etc.)

```text
app/
  layout.tsx          # Server — shared shell
  page.tsx            # Server — data fetching at page level
  _components/        # Page-scoped components
    dashboard.tsx     # Client — interactive chart wrapper
    stats-card.tsx    # Server — static display
```

### Data Fetching

- Fetch in Server Components directly — no `useEffect`
- Use `fetch()` with Next.js extended options for caching/revalidation
- Colocate data fetching with the component that needs it
- Use TanStack Query only in Client Components for interactive data

```typescript
// Server Component — direct fetch
async function UserList() {
  const users = await getUsers(); // server-side
  return <ul>{users.map(u => <UserCard key={u.id} user={u} />)}</ul>;
}

// Client Component — TanStack Query for interactive data
"use client";
function SearchResults({ query }: { query: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchUsers(query),
  });
  // ...
}
```

### Route Organization

```text
app/
  (auth)/             # Route group — shared auth layout
    login/page.tsx
    register/page.tsx
  (dashboard)/        # Route group — shared dashboard layout
    layout.tsx
    overview/page.tsx
    settings/page.tsx
  api/                # API routes
    users/route.ts
```

### Loading and Error States

Every route segment should have:
- `loading.tsx` — Suspense fallback (skeleton, not spinner)
- `error.tsx` — Error boundary with retry
- `not-found.tsx` — 404 for dynamic segments

## Component Patterns

### File Structure

```text
components/
  ui/                 # shadcn/ui components (managed by CLI)
    button.tsx
    dialog.tsx
  [feature]/          # Feature-scoped components
    user-card.tsx
    user-card.test.tsx
```

### Component Conventions

- One component per file, named export matching filename
- Props interface named `{Component}Props`
- Use `forwardRef` for components that wrap native elements
- Compose with `cn()` utility for conditional Tailwind classes
- Prefer composition over configuration — slots over boolean props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
```

### Accessibility Checklist

- Every interactive element: keyboard navigable + visible focus ring
- Images: meaningful `alt` text or `alt=""` for decorative
- Forms: labels linked to inputs, error messages with `aria-describedby`
- Modals: focus trap, `aria-modal`, Escape to close
- Use Radix UI primitives — they handle ARIA attributes automatically
- Color contrast: minimum 4.5:1 for text, 3:1 for large text
- Test with keyboard-only navigation before marking complete

## Styling

### Tailwind Conventions

- Design tokens as CSS variables in `globals.css`, consumed via Tailwind config
- Responsive: mobile-first (`sm:` `md:` `lg:` breakpoints)
- Dark mode: `class` strategy, use `dark:` variant
- No arbitrary values `[...]` when a design token exists
- Use `cn()` (clsx + tailwind-merge) for conditional classes

```typescript
import { cn } from "@/lib/utils";

function Card({ className, highlighted }: CardProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-6 shadow-sm",
      highlighted && "border-primary ring-2 ring-primary/20",
      className
    )}>
      {/* ... */}
    </div>
  );
}
```

### Animation with Framer Motion

- Use `motion` components for enter/exit animations
- `layout` prop for smooth layout shifts
- `AnimatePresence` for exit animations
- Keep animations subtle: 150-300ms duration, ease-out curve
- Respect `prefers-reduced-motion`

```typescript
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
>
  {content}
</motion.div>
```

## State Management

### Decision Tree

1. **Server state** (API data) → TanStack Query
2. **URL state** (filters, pagination) → `useSearchParams` / route params
3. **Form state** → React Hook Form
4. **Local UI state** (open/closed, selected tab) → `useState`
5. **Shared client state** (theme, sidebar) → Zustand

### Zustand Pattern

```typescript
interface AppStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

## Forms

Always React Hook Form + Zod. Share schema between frontend validation and API.

```typescript
const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;

function LoginPage() {
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <Form {...form}>
      <FormField name="email" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </Form>
  );
}
```

## Testing

### Vitest — Unit and Integration

- Colocate tests: `component.test.tsx` next to `component.tsx`
- Test behavior, not implementation — query by role/label, not class/id
- Use `@testing-library/react` with `userEvent` over `fireEvent`

### Playwright — E2E

- Use Playwright MCP for test generation and debugging when available
- Page Object Model for shared selectors
- Test critical user flows, not every permutation
- Use `data-testid` sparingly — prefer accessible selectors (`getByRole`, `getByLabel`)

```typescript
// Playwright E2E
test("user can log in and see dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

## Performance

- Lazy load below-fold components with `dynamic()` or `React.lazy`
- Images: use `next/image` with `width`/`height` or `fill` — never raw `<img>`
- Fonts: use `next/font` for zero-CLS font loading
- Bundle analysis: `@next/bundle-analyzer` — keep JS under 200KB initial load
- Memoize expensive computations with `useMemo`, not renders with `React.memo` (measure first)

## Figma MCP Integration

**Server**: `figma-developer-mcp` (Framelink)

Setup in `.claude/mcp_servers.json`:

```json
{
  "figma": {
    "command": "npx",
    "args": ["-y", "figma-developer-mcp", "--figma-api-key=${FIGMA_PERSONAL_ACCESS_TOKEN}"]
  }
}
```

Set the `FIGMA_PERSONAL_ACCESS_TOKEN` environment variable before launching Claude Code, or configure it via your shell profile / a secure secrets manager. Get a free personal access token at: Figma → Settings → Personal access tokens. Never hardcode the token directly in the args.

### Available Tools

- `get_file` — fetch full Figma file structure (pages, frames, components)
- `get_node` — get a specific node by ID with layout, style, and children
- `get_images` — export frames/nodes as PNG/SVG/PDF
- `get_file_styles` — extract all published styles (colors, text, effects)
- `get_file_components` — list all components and their properties

### Workflow

1. **Extract design tokens** — call `get_file_styles` to pull colors, typography, spacing → map to Tailwind CSS variables in `globals.css`
2. **Implement component** — call `get_node` for the target frame → read layout (auto-layout → flex, constraints → responsive), spacing, typography, colors → translate to Tailwind classes + Radix/shadcn primitives
3. **Export assets** — call `get_images` for icons/illustrations → save to `public/` or use as React components
4. **Verify** — compare rendered component with Figma frame visually

### Tips

- Use Figma node URLs from the user — parse the node ID from `?node-id=X-Y`
- Auto-layout in Figma maps directly to flexbox: `direction` → `flex-col`/`flex-row`, `gap` → `gap-N`, `padding` → `p-N`
- Figma color values are 0-1 floats — multiply by 255 for RGB or convert to HSL for Tailwind tokens
- Prefer extracting component variants from Figma as discriminated union props

## Playwright MCP Integration

**Server**: `@playwright/mcp`

Setup in `.claude/mcp_servers.json`:
```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@playwright/mcp"]
  }
}
```

No API key needed — fully free and open source.

### Available Tools

- `browser_navigate` — navigate to a URL
- `browser_click` — click an element (by text, selector, or coordinates)
- `browser_fill` — fill an input field
- `browser_screenshot` — capture the current page as a screenshot
- `browser_snapshot` — get an accessibility tree snapshot of the page
- `browser_evaluate` — run JavaScript in the browser context
- `browser_wait` — wait for navigation, network idle, or selector
- `browser_select` — select an option from a dropdown
- `browser_hover` — hover over an element

### Workflows

**Visual verification**:
1. Start dev server (`npm run dev`)
2. `browser_navigate` to the page
3. `browser_screenshot` to capture current state
4. Compare against Figma design or expected layout
5. Iterate on implementation until match

**E2E test generation**:
1. `browser_navigate` through the user flow manually using MCP tools
2. Record each step (navigate, fill, click, assert visibility)
3. Translate recorded steps into a Playwright test file

**Debugging failing tests**:
1. `browser_navigate` to the failing page state
2. `browser_snapshot` to inspect the accessibility tree
3. `browser_evaluate` to check DOM state, console errors, network requests
4. `browser_screenshot` to capture what the user actually sees

### Tips

- Prefer `browser_snapshot` (accessibility tree) over `browser_screenshot` for element discovery — it gives structured data
- Use `browser_snapshot` to verify ARIA roles and labels for accessibility testing
- Chain `browser_navigate` + `browser_snapshot` + `browser_screenshot` for a complete page audit
- For visual regression: screenshot before and after changes, compare side by side

## Code Review Checklist (Frontend)

When reviewing frontend code, verify:
- [ ] No `any` types — strict TypeScript throughout
- [ ] Server Components used by default, `"use client"` only when necessary
- [ ] Accessible: keyboard navigation, ARIA attributes, color contrast
- [ ] Responsive: works on mobile, tablet, desktop
- [ ] Loading/error states handled for async operations
- [ ] No layout shift (CLS) — skeleton loaders, image dimensions set
- [ ] Forms validated with Zod schema shared with API
- [ ] No hardcoded strings — use design tokens and constants
- [ ] Tests cover critical user flows
