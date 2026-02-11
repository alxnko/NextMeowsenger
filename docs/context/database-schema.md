# Database Schema

The `meowsenger` application uses a relational database (PostgreSQL) managed via **Prisma ORM**. The schema is designed to support secure, encrypted messaging with features like groups, channels, and invite systems.

## Key Models

### 1. User (`User`)

Represents a registered user of the platform.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key. |
| `username` | String | Unique username for identification. |
| `passwordHash` | String | Bcrypt hash of the user's password for authentication. |
| `publicKey` | String | RSA-2048 Public Key (PEM format), visible to other users for encryption. |
| `encryptedPrivateKey` | String | RSA-2048 Private Key (PEM format), encrypted with the user's password (AES-GCM). Decrypted only on the client. |
| `allowAutoGroupAdd` | Boolean | Privacy setting allowing/disallowing automatic addition to groups. Defaults to `true`. |

### 2. Chat (`Chat`)

Represents a conversation container, which can be a Direct Message (DM), Group, or Channel.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key. |
| `type` | String | Chat type: `"DIRECT"`, `"GROUP"`, or `"CHANNEL"`. |
| `visibility` | String | Visibility level: `"PUBLIC"` or `"PRIVATE"`. |
| `name` | String? | Optional name for groups/channels. |
| `description` | String? | Optional description. |
| `avatar` | String? | URL to the chat avatar. |
| `inviteCode` | String? | Unique code for joining via link/invite. |
| `slug` | String? | Unique slug for public channel routing (e.g., `/c/tech-news`). |
| `createdAt` | DateTime | Timestamp of creation. |
| `updatedAt` | DateTime | Timestamp of last update. |

### 3. ChatParticipant (`ChatParticipant`)

A composite model representing the Many-to-Many relationship between `User` and `Chat`. It stores user-specific settings for a chat.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | String | Foreign Key to `User`. |
| `chatId` | String | Foreign Key to `Chat`. |
| `role` | String | Role in the chat: `"OWNER"`, `"ADMIN"`, or `"MEMBER"`. |
| `status` | String | Membership status: `"active"`, `"pending"`, `"blocked"`. Defaults to `"active"`. |
| `encryptedKey` | String | The Chat's symmetric key (AES), encrypted with the User's Public Key. This is crucial for group encryption. |
| `lastReadAt` | DateTime | Timestamp of the last message read by the user. |

**Composite Key:** `[userId, chatId]`

### 4. Message (`Message`)

Stores the encrypted content of a message.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key. |
| `encryptedContent` | String | The message payload, encrypted using AES-GCM. The server cannot read this. |
| `senderId` | String | Foreign Key to the `User` who sent the message. |
| `chatId` | String | Foreign Key to the `Chat` where the message belongs. |
| `createdAt` | DateTime | Timestamp when the message was sent. |
| `isDeleted` | Boolean | Soft delete flag. |
| `isEdited` | Boolean | Flag indicating if the message was edited. |
| `isForwarded` | Boolean | Flag indicating if the message was forwarded. |
| `replyToId` | String? | Self-relation ID pointing to the parent message if this is a reply. |

### 5. JoinRequest (`JoinRequest`)

Manages requests from users to join private or restricted chats.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key. |
| `userId` | String | The user requesting to join. |
| `chatId` | String | The target chat. |
| `status` | String | Request status: `"PENDING"`, `"APPROVED"`, or `"REJECTED"`. |

## Relationships

*   **User <-> Chat:** via `ChatParticipant`.
*   **Chat <-> Message:** One-to-Many (One Chat has many Messages).
*   **Message <-> Message:** Self-relation for replies (`replyTo`).
*   **User/Chat <-> JoinRequest:** For managing membership approvals.
