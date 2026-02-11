# Security Model

`meowsenger` implements a "Trust No One" (TNO) security architecture. All message content is end-to-end encrypted (E2EE), meaning the server only stores encrypted blobs and cannot read user messages.

## Cryptographic Primitives

The application uses standard, browser-native Web Crypto API primitives:

*   **RSA-OAEP (2048-bit):** Asymmetric encryption for Identity Keys (Public/Private Key Pairs).
*   **AES-GCM (256-bit):** Symmetric encryption for message content and private key protection.
*   **PBKDF2 (SHA-256):** Key derivation function for converting user passwords into encryption keys.
*   **SHA-256:** Hashing algorithm.

## Authentication & Identity

### User Identity
Each user is identified by a persistent **RSA-2048 Key Pair**.
*   **Public Key:** Stored openly on the server. Used by other users to encrypt messages destined for this user.
*   **Private Key:** Never sent to the server in plaintext. It is encrypted client-side using the user's password.

### Signup Flow
1.  **Key Generation:** The client generates a new RSA-2048 Key Pair.
2.  **Key Protection:** The client derives a wrapping key from the user's chosen password using PBKDF2 (100,000 iterations).
3.  **Private Key Encryption:** The RSA Private Key is encrypted with the wrapping key using AES-GCM.
4.  **Submission:** The client sends the `username`, a standard password hash (for server login), the `publicKey`, and the `encryptedPrivateKey` to the server.

### Login Flow
1.  **Authentication:** The user logs in with username and password. The server verifies the standard password hash.
2.  **Key Retrieval:** Upon success, the server returns the user's `encryptedPrivateKey`.
3.  **Decryption:** The client uses the user's password to derive the wrapping key again and decrypts the Private Key in memory.

## Message Encryption

The application uses a Hybrid Encryption scheme combining RSA and AES.

### Sending a Message
1.  **Session Key:** The sender generates a random, ephemeral **AES-256 Key** for the specific message.
2.  **Content Encryption:** The message body is encrypted with this AES key (AES-GCM).
3.  **Key Wrapping:** The sender retrieves the Public Keys of all recipients (e.g., all members of a group).
4.  **Multi-Recipient Encryption:** The AES key is encrypted separately for *each* recipient using their respective RSA Public Key (RSA-OAEP).
5.  **Packet Construction:** The payload sent to the server contains:
    *   `ciphertext`: The encrypted message content.
    *   `iv`: The initialization vector.
    *   `keys`: A map of `userId -> encryptedAesKey`.

### Receiving a Message
1.  **Key Extraction:** The recipient looks up their entry in the `keys` map.
2.  **Unwrapping:** The recipient uses their local RSA Private Key to decrypt the `encryptedAesKey` and recover the ephemeral AES key.
3.  **Decryption:** The recipient uses the AES key to decrypt the `ciphertext` and view the message.

## Transport Security
All communication between client and server is protected by **TLS (HTTPS/WSS)**, ensuring integrity and confidentiality of metadata (who is talking to whom) in transit.
