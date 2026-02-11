# Meowsenger 🐱💬

Meowsenger is a secure, end-to-end encrypted messaging application designed for privacy and performance. Built on the modern web stack, it ensures that your conversations remain private through client-side encryption.

## Features ✨

*   **🔒 End-to-End Encryption (E2EE):** All messages are encrypted on your device using AES-256-GCM before being sent. Identity is verified via RSA-2048 keys. The server acts as a blind relay and cannot decrypt your messages.
*   **⚡ Real-time Messaging:** Powered by Socket.io for instant message delivery, typing indicators, and presence updates.
*   **👥 Groups & Channels:** Create private groups for friends or public channels for communities.
*   **🎨 Modern UI:** A responsive, accessible interface built with Next.js 16, React 19, and Tailwind CSS v4.
*   **🛡️ Trust No One (TNO):** Your private key is encrypted with your password and only decrypted in your browser's memory.

## Tech Stack 🛠️

*   **Framework:** [Next.js 16.1.4](https://nextjs.org/) (App Router)
*   **UI Library:** [React 19.2.3](https://react.dev/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & [@heroui/react](https://heroui.com)
*   **Database:** PostgreSQL with [Prisma ORM 6.2.1](https://www.prisma.io/)
*   **Real-time:** [Socket.io 4.8.3](https://socket.io/)
*   **Package Manager:** [pnpm](https://pnpm.io/)

## Getting Started 🚀

### Prerequisites

*   Node.js (v20+ recommended)
*   pnpm (or npm/yarn/bun)
*   PostgreSQL database instance

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/meowsenger.git
    cd meowsenger
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure Environment:**
    Create a `.env` file in the root of the `meowsenger` directory and add your database connection string:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/meowsenger?schema=public"
    ```

4.  **Database Setup:**
    Run migrations to set up the schema:
    ```bash
    pnpm prisma migrate dev
    ```

5.  **Start Development Server:**
    ```bash
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation 📚

Detailed technical documentation for AI agents and developers can be found in the [`docs/context`](../docs/context) directory:

*   [**Project Architecture**](../docs/context/architecture.md): Overview of the system design and tech stack.
*   [**Database Schema**](../docs/context/database-schema.md): Detailed breakdown of Prisma models.
*   [**Security Model**](../docs/context/security-model.md): Comprehensive guide to the encryption and auth implementation.
*   [**Project Structure**](../docs/context/project-structure.md): Directory map for navigating the codebase.

## License

MIT
