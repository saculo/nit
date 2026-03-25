# Design — Frontend Expertise Skill and Agent Configuration

<design>

  <type>frontend</type>

  <summary>
    Create a dedicated frontend expertise skill that provides the frontend engineer agent with comprehensive stack knowledge, conventions, and MCP tool integrations. The skill lives exclusively in .claude/skills/frontend/ (not synced to .nit/) since it is a project-specific customization rather than a core nit workflow artifact. Update the frontend engineer agent to always load this skill.
  </summary>

  <key-decisions>
    <decision id="D-1">
      <title>Skill placement — .claude only, not .nit</title>
      <rationale>The frontend skill is a project-specific customization (stack choice, library preferences, MCP setup). It does not belong in .nit/ which stores canonical nit workflow artifacts. Users add custom skills to .claude/ directly.</rationale>
    </decision>
    <decision id="D-1b">
      <title>Skill namespace convention — nit: prefix vs plain name</title>
      <rationale>Core nit workflow skills use the "nit:" prefix (e.g., nit:implement, nit:clarify) and live in .nit/skills/. Project-specific or custom skills use plain names (e.g., "frontend") and live in .claude/skills/ only. This follows from D-1: .nit/ is for canonical workflow artifacts, .claude/ is for user customizations.</rationale>
    </decision>
    <decision id="D-2">
      <title>Technology stack selection</title>
      <rationale>TypeScript + Next.js + Vite as core. shadcn/ui (Radix + Tailwind) for components — accessible, composable, well-maintained. Framer Motion for animation. Zustand + TanStack Query for state. React Hook Form + Zod for forms with shared validation. Vitest + Playwright for testing.</rationale>
    </decision>
    <decision id="D-3">
      <title>Figma MCP — figma-developer-mcp (Framelink)</title>
      <rationale>Free and open source. Only requires a Figma personal access token (free tier). Provides tools for extracting design tokens, component specs, and asset export.</rationale>
    </decision>
    <decision id="D-4">
      <title>Playwright MCP — @playwright/mcp</title>
      <rationale>Free, open source, by Microsoft. No API key needed. Provides browser interaction tools for visual verification, E2E test generation, and debugging.</rationale>
    </decision>
  </key-decisions>

</design>
