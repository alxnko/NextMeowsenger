# Project Architecture

## Tech Stack

The `meowsenger` project is built on a modern, robust stack designed for performance, security, and developer experience.

*   **Framework:** [Next.js 16.1.4](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React 19.2.3](https://react.dev/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Component Library:** [@heroui/react](https://heroui.com)
*   **Database:** PostgreSQL (accessed via [Prisma ORM 6.2.1](https://www.prisma.io/))
*   **Real-time Communication:** [Socket.io 4.8.3](https://socket.io/) (Client & Server)
*   **Authentication & Security:** Custom End-to-End Encryption (RSA-OAEP + AES-GCM), bcryptjs for password hashing.
*   **Package Manager:** [pnpm](https://pnpm.io/)

## High-Level Architecture

The application utilizes the Next.js App Router, leveraging React Server Components (RSC) for efficient data fetching and initial rendering, while using Client Components for interactive features like the chat interface and real-time updates.

### Frontend Layer

*   **Routing:** File-system based routing via the `app/` directory.
*   **State Management:**
    *   **React Context:** `AuthProvider` manages user identity and cryptographic keys. `SocketProvider` manages the WebSocket connection and event listeners.
    *   **Server State:** Data fetched in Server Components is passed down or hydrated.
*   **UI Components:** Modular components located in `components/`, utilizing Tailwind CSS for styling and HeroUI for accessible primitives.

### Backend Layer

*   **API Routes:** Next.js Route Handlers (`app/api/`) serve as the RESTful API for:
    *   Authentication (Login, Signup)
    *   User Management (Search, Profile)
    *   Chat Management (Create, Join, List)
*   **Real-time Server:** A Socket.io server handles:
    *   Instant message delivery
    *   Presence (Online/Offline status)
    *   Typing indicators
    *   Group/Channel events
*   **Database Access:** All database interactions are mediated by the Prisma Client (`lib/prisma.ts`), ensuring type safety and preventing SQL injection.

### Security Architecture

Security is a core feature, not an afterthought. The application implements a "Trust No One" (TNO) model where the server acts as a blind relay for encrypted messages.

*   **End-to-End Encryption (E2EE):**
    *   **Messages:** Encrypted client-side using **AES-256-GCM**.
    *   **Key Exchange:** The AES key for each message is encrypted with the recipient's **RSA-2048 Public Key** (RSA-OAEP).
*   **Identity Protection:**
    *   **Private Keys:** Generated on the client. They are encrypted with the user's password (AES-GCM) before being stored on the server. The server never has access to the raw private key.
    *   **Password Hashing:** Passwords are hashed using `bcrypt` before storage.

### Deployment & Environment

*   **Environment Variables:** Configuration is managed via `.env` files (e.g., `DATABASE_URL`).
*   **Build System:** `next build` compiles the application for production.
