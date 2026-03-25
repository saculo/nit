# Task 7 — Frontend Expertise Skill and Agent Configuration

<task>

  <meta>
    <id>TASK-007</id>
    <phase>PHASE-1</phase>
    <title>Frontend Expertise Skill and Agent Configuration</title>
    <type>frontend</type>
    <module>.claude/skills/frontend, .claude/agents/frontend-engineer</module>
    <status>done</status>
  </meta>

  <user-story>
    As a frontend engineer agent,
    I want a dedicated expertise skill with stack conventions, patterns, and MCP integrations,
    So that I can implement frontend tasks consistently using the project's chosen technology stack.
  </user-story>

  <scope>
    <in-scope>
    - Frontend expertise skill (SKILL.md) with full stack definition
    - TypeScript strict-mode rules and patterns
    - Next.js App Router patterns (Server vs Client Components, data fetching, routing)
    - Vite configuration guidance
    - UI library stack: Radix UI, shadcn/ui, Tailwind CSS 4, Framer Motion, Lucide, Recharts
    - State management decision tree (TanStack Query, Zustand, React Hook Form + Zod)
    - Figma MCP integration (figma-developer-mcp) with design-to-code workflow
    - Playwright MCP integration (@playwright/mcp) with visual verification and E2E workflows
    - Frontend code review checklist
    - Frontend engineer agent updated to always load the frontend skill
    </in-scope>
    <out-of-scope>
    - Skill not placed in .nit/skills (project-specific, lives only in .claude/skills)
    - Actual MCP server installation or configuration
    - Backend or DevOps patterns
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1" status="met">
      Given the frontend skill exists at .claude/skills/frontend/SKILL.md,
      When a frontend task is implemented,
      Then the frontend engineer agent loads the skill and follows its conventions.
    </criterion>
    <criterion id="AC-2" status="met">
      Given the skill defines the technology stack,
      When referenced during implementation,
      Then it covers TypeScript, Next.js, Vite, Radix UI, shadcn/ui, Tailwind CSS, Framer Motion, Zustand, TanStack Query, React Hook Form, Zod, Vitest, and Playwright.
    </criterion>
    <criterion id="AC-3" status="met">
      Given the skill includes Figma MCP integration,
      When a frontend task requires design specs,
      Then the agent can use figma-developer-mcp tools to extract tokens, specs, and assets.
    </criterion>
    <criterion id="AC-4" status="met">
      Given the skill includes Playwright MCP integration,
      When a frontend task requires testing or visual verification,
      Then the agent can use @playwright/mcp tools for browser interaction, screenshots, and E2E.
    </criterion>
    <criterion id="AC-5" status="met">
      Given the frontend engineer agent definition,
      When it starts any task,
      Then it explicitly loads the frontend skill before beginning work.
    </criterion>
  </acceptance-criteria>

  <dependencies>
    TASK-001 in PHASE-1
  </dependencies>

</task>
