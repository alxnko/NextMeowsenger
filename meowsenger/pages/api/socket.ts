import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { prisma } from "../../lib/prisma";
import { verifySession } from "../../lib/session";

interface SocketServer extends HTTPServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

function parseCookies(req: any) {
  const list: any = Object.create(null);
  const rc = req.headers.cookie;
  
  if (!rc) {
    console.log("[parseCookies] No cookies found in request headers");
    return list;
  }

  rc.split(';').forEach(function(cookie: string) {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (!key || key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    const value = decodeURIComponent(parts.join('='));
    list[key] = value;
  });

  console.log(`[parseCookies] Keys found: ${Object.keys(list).join(', ')}`);
  return list;
}

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket,
) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new Server(res.socket.server as any, {
    path: "/api/socket_io",
    transports: ["websocket", "polling"],
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.request);
      // Client uses 'session_token'
      const token = cookies.session_token;
      
      console.log(`[Socket Auth] Cookie string length: ${socket.request.headers.cookie?.length || 0}`);
      console.log(`[Socket Auth] Token present: ${!!token}`);

      if (!token) {
        console.warn("[Socket Auth Warning] Token missing from cookies");
        return next(new Error("Authentication error: Token missing"));
      }

      const userId = await verifySession(token);
      if (!userId) {
        console.warn("[Socket Auth Warning] Invalid token provided");
        return next(new Error("Authentication error: Invalid token"));
      }

      // Attach user ID to socket data
      socket.data.userId = userId;
      console.log(`[Socket Auth Success] Authenticated user: ${userId}`);
      next();
    } catch (err) {
      console.error("[Socket Auth Error]", err);
      next(new Error("Authentication error"));
    }
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    socket.on("join_room", async (roomId) => {
      // Security: Only allow joining own user room
      if (roomId.startsWith("user_")) {
        if (roomId !== `user_${userId}`) {
          // Silent fail or warning
          return;
        }
      } else {
        // Security: Verify user is a participant of the chat room
        try {
          const participant = await prisma.chatParticipant.findUnique({
            where: {
              userId_chatId: {
                userId,
                chatId: roomId,
              },
            },
          });
          if (!participant) {
            socket.emit("error", { message: "You are not a member of this chat" });
            return;
          }
        } catch (err) {
          console.error("Failed to verify chat membership for join_room:", err);
          return;
        }
      }
      socket.join(roomId);
    });

    socket.on(
      "send_message",
      async (data: {
        chatId: string;
        content: string;
        replyToId?: string;
        isForwarded?: boolean;
        tempId?: string;
      }) => {
        try {
          console.log(`[Socket] send_message received for chat ${data.chatId} from user ${userId}`);
          // Use authenticated userId
          const senderId = userId;

          // Check if this is a channel and enforce admin-only sending
          const chat = await prisma.chat.findUnique({
            where: { id: data.chatId },
            include: {
              participants: {
                where: { userId: senderId },
              },
            },
          });

          if (!chat) {
            console.log(`[Socket] Chat ${data.chatId} not found`);
            socket.emit("error", { message: "Chat not found" });
            return;
          }

          // Verify membership (implicitly done by include participants where userId)
          const senderParticipant = chat.participants[0];
          if (!senderParticipant) {
             console.log(`[Socket] User ${senderId} is not a member of chat ${data.chatId}`);
             socket.emit("error", { message: "You are not a member of this chat" });
             return;
          }

          // For channels, only admins and owners can send messages
          if (chat.type === "CHANNEL") {
            if (
              senderParticipant.role !== "ADMIN" &&
              senderParticipant.role !== "OWNER"
            ) {
              console.log(`[Socket] User ${senderId} is not an admin in channel ${data.chatId}`);
              socket.emit("error", {
                message: "Only admins can send messages in channels",
              });
              return;
            }
          }

          const now = new Date();
          console.log(`[Socket] Creating message in DB for chat ${data.chatId}...`);
          const message = await prisma.message.create({
            data: {
              chatId: data.chatId,
              senderId: senderId, // Trusted ID
              encryptedContent: data.content,
              replyToId: data.replyToId,
              isForwarded: data.isForwarded || false,
              createdAt: now,
            },
            include: {
              replyTo: true,
            },
          });
          console.log(`[Socket] Message created with ID: ${message.id}`);

          await prisma.chat.update({
            where: { id: data.chatId },
            data: { updatedAt: now },
          });

          await prisma.chatParticipant.update({
            where: {
              userId_chatId: {
                userId: senderId,
                chatId: data.chatId,
              },
            },
            data: {
              lastReadAt: now,
            },
          });

          // Send confirmation back to sender with real DB ID
          socket.emit("message_sent", {
            tempId: data.tempId,
            message: {
              ...data,
              senderId, // Ensure senderId is returned
              id: message.id,
              createdAt: now.toISOString(),
            },
          });

          console.log(`[Socket] Broadcasting message to chat room ${data.chatId}`);
          io.to(data.chatId).emit("receive_message", {
            ...data,
            senderId, // Ensure senderId is correct
            id: message.id,
            createdAt: now.toISOString(),
          });

          const participants = await prisma.chatParticipant.findMany({
            where: { chatId: data.chatId },
          });

          console.log(`[Socket] Notifying ${participants.length} participants to refresh sidebars`);
          participants.forEach((p: any) => {
            io.to(`user_${p.userId}`).emit("refresh_chats", {
              chatId: data.chatId,
            });
          });
        } catch (err) {
          console.error("[Socket] Failed to process message:", err);
          socket.emit("error", { message: "Internal server error while sending message" });
        }
      },
    );

    socket.on(
      "edit_message",
      async (data: { messageId: string; content: string }) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { chat: true },
          });

          if (!message || message.senderId !== userId) return; // Verify ownership

          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (message.createdAt < oneHourAgo) {
            socket.emit("error", {
              message: "Edit window expired (1 hour limit)",
            });
            return;
          }

          const updatedMessage = await prisma.message.update({
            where: { id: data.messageId },
            data: {
              encryptedContent: data.content,
              isEdited: true,
            },
          });

          io.to(message.chatId).emit("message_updated", {
            id: updatedMessage.id,
            chatId: updatedMessage.chatId,
            content: updatedMessage.encryptedContent,
            isEdited: true,
          });
        } catch (err) {
          console.error("Failed to edit message:", err);
        }
      },
    );

    socket.on(
      "delete_message",
      async (data: { messageId: string }) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { chat: { include: { participants: true } } },
          });

          if (!message) return;

          const participant = message.chat.participants.find(
            (p: any) => p.userId === userId,
          );
          const isSender = message.senderId === userId;
          const isDirect = message.chat.type === "DIRECT";
          const isAdmin =
            !isDirect &&
            (participant?.role === "ADMIN" || participant?.role === "OWNER");

          if (isSender) {
            // Allow sender to delete their own messages (within 24 hours)
            const twentyFourHoursAgo = new Date(
              Date.now() - 24 * 60 * 60 * 1000,
            );
            if (message.createdAt < twentyFourHoursAgo) {
              socket.emit("error", {
                message: "Delete window expired (24 hour limit)",
              });
              return;
            }
          } else if (!isAdmin) {
            return; // Not sender and not a group admin
          }

          // Soft delete
          await prisma.message.update({
            where: { id: data.messageId },
            data: { isDeleted: true, encryptedContent: "" },
          });

          io.to(message.chatId).emit("message_deleted", {
            id: message.id,
            chatId: message.chatId,
          });
        } catch (err) {
          console.error("[Socket] Failed to delete message:", err);
        }
      },
    );

    socket.on(
      "notify_new_chat",
      async (data: { chat: any }) => {
        console.log(`[Socket] notify_new_chat received from user ${userId} for chat ${data.chat?.id}`);
        // Secure notification: Only notify actual participants if sender is one of them
        try {
          const chatId = data.chat?.id;
          if (!chatId) return;

          const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: { participants: true }
          });

          if (!chat) {
            console.log(`[Socket] Chat ${chatId} not found in DB`);
            return;
          }

          const isSenderParticipant = chat.participants.some(p => p.userId === userId);
          if (!isSenderParticipant) {
            console.log(`[Socket] User ${userId} is not a participant of chat ${chatId}`);
            return;
          }

          console.log(`[Socket] Notifying ${chat.participants.length} participants of new chat ${chatId}`);
          chat.participants.forEach((p) => {
             console.log(`[Socket] Emitting new_chat to user_${p.userId}`);
             io.to(`user_${p.userId}`).emit("new_chat", data.chat);
          });

        } catch (e) {
            console.error("Notify new chat error", e);
        }
      },
    );

    socket.on("mark_read", async (data: { chatId: string }) => {
      try {
        const now = new Date();
        const updatedParticipant = await prisma.chatParticipant.update({
          where: {
            userId_chatId: {
              userId: userId, // Trusted ID
              chatId: data.chatId,
            },
          },
          data: {
            lastReadAt: now,
          },
        });

        // Notify the user to refresh their sidebar (read status changed)
        io.to(`user_${userId}`).emit("refresh_chats", {
          chatId: data.chatId,
          lastReadAt: updatedParticipant.lastReadAt,
        });
      } catch (err) {
        console.error("Error marking chat read via socket:", err);
      }
    });

    socket.on("disconnect", () => {
    });
  });

  res.end();
}
