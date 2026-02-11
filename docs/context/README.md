# Detailed Feature Specifications & Context

> This directory contains detailed specifications and context for project features.
> Use these files as "Executable Context" for AI agents to understand the codebase.

## Documentation Index

The following documents provide in-depth information about specific aspects of the `meowsenger` project:

*   [**Project Architecture**](./architecture.md)
    *   Overview of the Tech Stack (Next.js, React, Tailwind, etc.) and system design.
*   [**Database Schema**](./database-schema.md)
    *   Detailed explanation of Prisma models (`User`, `Chat`, `Message`) and relationships.
*   [**Security Model**](./security-model.md)
    *   Comprehensive guide to the End-to-End Encryption (E2EE) implementation and authentication flow.
*   [**Project Structure**](./project-structure.md)
    *   Map of the directory layout to help navigate the codebase.

## Latest Versions

Ensure all code changes are compatible with the following core dependency versions:

| Package | Version |
| :--- | :--- |
| `next` | **16.1.4** |
| `react` | **19.2.3** |
| `prisma` | **6.2.1** |
| `tailwindcss` | **v4** |
| `socket.io` | **4.8.3** |
| `typescript` | **5.x** |

## Instructions for AI Agents

1.  **Read Before Coding:** Before implementing new features, consult the relevant context file (e.g., `security-model.md` for auth/crypto changes).
2.  **Maintain Consistency:** Follow the patterns described in `project-structure.md` and `architecture.md`.
3.  **Update Documentation:** If you make significant architectural changes, update these documents to keep them current.
