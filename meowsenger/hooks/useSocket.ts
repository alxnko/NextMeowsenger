"use client";

import { useSocketContext } from "@/context/SocketContext";

export const useSocket = () => {
  return useSocketContext();
};
