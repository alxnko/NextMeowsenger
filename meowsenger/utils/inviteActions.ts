import { encryptChatMessage, importPublicKey } from "./crypto";

export async function sendAutoInvite(
  socket: any,
  currentUser: any,
  targetUser: { id: string; username: string },
  groupName: string,
  inviteCode: string,
) {
  try {
    console.log(`[AutoInvite] Starting for ${targetUser.username}`);

    // 1. Get or Create DM
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        type: "DIRECT",
        participantIds: [currentUser.id, targetUser.id],
      }),
    });
    const data = await res.json();
    if (!data.chat) throw new Error("Failed to get DM");

    const chat = data.chat;
    const participants = chat.participants;

    // 2. Prepare Keys
    const recipientKeys = await Promise.all(
      participants.map(async (p: any) => ({
        userId: p.userId,
        key: await importPublicKey(p.user.publicKey),
      })),
    );

    // 3. Encrypt Message
    const text = `I invited you to group '${groupName}'.\nUse this link to join: ${window.location.origin}/join/${inviteCode}`;
    const packet = await encryptChatMessage(text, recipientKeys);
    const encryptedContent = JSON.stringify(packet);
    const tempId = `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 4. Send via Socket
    socket.emit("send_message", {
      chatId: chat.id,
      senderId: currentUser.id,
      content: encryptedContent,
      tempId,
      isForwarded: false,
    });

    console.log(`[AutoInvite] Sent to ${targetUser.username}`);
    return true;
  } catch (e) {
    console.error(`[AutoInvite] Failed for ${targetUser.username}`, e);
    return false;
  }
}
