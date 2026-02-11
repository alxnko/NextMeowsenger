import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { prisma } from "../../lib/prisma";

interface SocketServer extends HTTPServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
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
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on(
      "send_message",
      async (data: {
        chatId: string;
        senderId: string;
        content: string;
        replyToId?: string;
        isForwarded?: boolean;
        tempId?: string;
      }) => {
        try {
          // Check if this is a channel and enforce admin-only sending
          const chat = await prisma.chat.findUnique({
            where: { id: data.chatId },
            include: {
              participants: {
                where: { userId: data.senderId },
              },
            },
          });

          if (!chat) {
            socket.emit("error", { message: "Chat not found" });
            return;
          }

          // For channels, only admins and owners can send messages
          if (chat.type === "CHANNEL") {
            const senderParticipant = chat.participants[0];
            if (
              !senderParticipant ||
              (senderParticipant.role !== "ADMIN" &&
                senderParticipant.role !== "OWNER")
            ) {
              socket.emit("error", {
                message: "Only admins can send messages in channels",
              });
              return;
            }
          }

          const now = new Date();
          const message = await prisma.message.create({
            data: {
              chatId: data.chatId,
              senderId: data.senderId,
              encryptedContent: data.content,
              replyToId: data.replyToId,
              isForwarded: data.isForwarded || false,
              createdAt: now,
            },
            include: {
              replyTo: true,
            },
          });

          await prisma.chat.update({
            where: { id: data.chatId },
            data: { updatedAt: now },
          });

          await prisma.chatParticipant.update({
            where: {
              userId_chatId: {
                userId: data.senderId,
                chatId: data.chatId,
              },
            },
            data: {
              lastReadAt: now,
            },
          });

          // Send confirmation back to sender with real DB ID
          socket.emit("message_sent", {
            tempId: data.tempId, // We'll need to send this from frontend
            message: {
              ...data,
              id: message.id,
              createdAt: now.toISOString(),
            },
          });

          io.to(data.chatId).emit("receive_message", {
            ...data,
            id: message.id,
            createdAt: now.toISOString(),
          });

          const participants = await prisma.chatParticipant.findMany({
            where: { chatId: data.chatId },
          });

          participants.forEach((p: any) => {
            if (p.userId !== data.senderId) {
              io.to(`user_${p.userId}`).emit("refresh_chats", {
                chatId: data.chatId,
              });
            }
          });
        } catch (err) {
          console.error("Failed to process message:", err);
        }
      },
    );

    socket.on(
      "edit_message",
      async (data: { messageId: string; content: string; userId: string }) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { chat: true },
          });

          if (!message || message.senderId !== data.userId) return;

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
      async (data: { messageId: string; userId: string }) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { chat: { include: { participants: true } } },
          });

          if (!message) return;

          const participant = message.chat.participants.find(
            (p: any) => p.userId === data.userId,
          );
          const isSender = message.senderId === data.userId;
          const isDirect = message.chat.type === "DIRECT";
          const isAdmin =
            !isDirect &&
            (participant?.role === "ADMIN" || participant?.role === "OWNER");

          if (isSender) {
            // Allow sender to delete their own messages (within 24 hours for safety/testing)
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
      (data: { participantIds: string[]; chat: any }) => {
        data.participantIds.forEach((id) => {
          io.to(`user_${id}`).emit("new_chat", data.chat);
        });
      },
    );

    socket.on("mark_read", async (data: { userId: string; chatId: string }) => {
      try {
        const now = new Date();
        const updatedParticipant = await prisma.chatParticipant.update({
          where: {
            userId_chatId: {
              userId: data.userId,
              chatId: data.chatId,
            },
          },
          data: {
            lastReadAt: now,
          },
        });

        // Notify the user to refresh their sidebar (read status changed)
        io.to(`user_${data.userId}`).emit("refresh_chats", {
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
