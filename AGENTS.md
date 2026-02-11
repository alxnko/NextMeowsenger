# AGENTS.md - Shared Context & Project Standards

> This file is the Universal Context Layer for all AI agents (Antigravity, Copilot, etc.).
> It defines the immutable rules, tech stack, and architecture for this project.

## 🏗️ Project Architecture

**Root:** `meowsenger/` (Next.js Application)
**Agent Config:** `.agent/` (Antigravity Kit)

### Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Geist Font
- **ORM:** Prisma
- **Package Manager:** pnpm

### Directory Structure
- `app/`: Next.js App Router pages and layouts
- `components/`: React components
- `lib/`: Shared libraries and utilities
- `prisma/`: Database schema and migrations
- `.agent/`: AI Agent configuration (Rules, Skills, Workflows)

## 📜 Universal Rules

1. **Clean Code:** Follow `clean-code` principles. Concise, self-documenting, tested.
2. **Testing:** Pyramid strategy (Unit > Integration > E2E).
3. **Performance:** Core Web Vitals focus.
4. **Security:** Secure by default. No hardcoded secrets.

## 🤖 Agent Roles (Shared Definitions)

- **@frontend-specialist:** Web UI/UX, React, Tailwind.
- **@backend-specialist:** API, Database, Node.js.
- **@security-agent:** Security audits, vulnerability scanning.
- **@test-engineer:** Testing strategies, Playwright.

## 🔗 References

- **Architecture:** See `.agent/ARCHITECTURE.md` for detailed agent/skill breakdown.
- **Detailed Specs:** See `docs/context/` for feature specifications.
