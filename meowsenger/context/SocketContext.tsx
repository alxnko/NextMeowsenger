"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocketContext = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let socketInstance: Socket | null = null;

    const initSocket = async () => {
      // 1. Initialize the socket server
      await fetch("/api/socket");

      // 2. Client-side connection
      socketInstance = io({
        path: "/api/socket_io",
        transports: ["websocket"], // Forces WebSocket only (no polling)
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socketInstance.on("connect", () => {
        console.log("Socket Connected:", socketInstance?.id);
        setIsConnected(true);

        // Join user room immediately if logged in
        if (user?.id) {
          socketInstance?.emit("join_room", `user_${user.id}`);
        }
      });

      socketInstance.on("disconnect", () => {
        console.log("Socket Disconnected");
        setIsConnected(false);
      });

      socketInstance.on("connect_error", (err) => {
        console.error("Socket Connection Error:", err);
        // If websocket fails (e.g. firewall), we might want to fallback,
        // but user specifically requested optimization.
        // We'll keep it strict for now per request.
      });

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []); // Run once on mount

  // Watch for Auth changes to re-join user room if socket exists
  useEffect(() => {
    if (socket && isConnected && user?.id) {
      socket.emit("join_room", `user_${user.id}`);
    }
  }, [socket, isConnected, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
