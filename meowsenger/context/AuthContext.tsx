"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  generateIdentityKeyPair,
  exportKey,
  encryptPrivateKeyWithPassword,
  decryptPrivateKeyWithPassword,
  importPrivateKey,
} from "../utils/crypto";

interface User {
  id: string;
  username: string;
  publicKey: string;
  allowAutoGroupAdd: boolean;
}

interface AuthContextType {
  user: User | null;
  privateKey: CryptoKey | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedUser = localStorage.getItem("meowsenger_user");
        const savedKey = sessionStorage.getItem("meowsenger_session_key");

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);

          // Set cookie for API routes consistency
          Cookies.set("meowsenger_user_id", parsedUser.id, { expires: 7 });

          if (savedKey) {
            const key = await importPrivateKey(savedKey);
            setPrivateKey(key);
          }
        }
      } catch (err) {
        console.error("Session restoration failed", err);
        // Don't logout automatically, just let user be in "semi-auth"
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const signup = async (username: string, password: string) => {
    try {
      const keyPair = await generateIdentityKeyPair();
      const publicKeyStr = await exportKey(keyPair.publicKey);
      const privKeyStr = await exportKey(keyPair.privateKey);

      const encryptedPrivateKey = await encryptPrivateKeyWithPassword(
        keyPair.privateKey,
        password,
      );

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          publicKey: publicKeyStr,
          encryptedPrivateKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newUser = {
        id: data.user.id,
        username: data.user.username,
        publicKey: publicKeyStr,
        allowAutoGroupAdd: data.user.allowAutoGroupAdd ?? true,
      };

      // Persistence
      localStorage.setItem("meowsenger_user", JSON.stringify(newUser));
      sessionStorage.setItem("meowsenger_session_key", privKeyStr);
      Cookies.set("meowsenger_user_id", newUser.id, { expires: 7 });

      setUser(newUser);
      setPrivateKey(keyPair.privateKey);

      router.push("/chat");
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const decryptedKey = await decryptPrivateKeyWithPassword(
        data.user.encryptedPrivateKey,
        password,
      );

      const privKeyStr = await exportKey(decryptedKey);

      const newUser = {
        id: data.user.id,
        username: data.user.username,
        publicKey: data.user.publicKey,
        allowAutoGroupAdd: data.user.allowAutoGroupAdd ?? true,
      };

      // Persistence
      localStorage.setItem("meowsenger_user", JSON.stringify(newUser));
      sessionStorage.setItem("meowsenger_session_key", privKeyStr);
      Cookies.set("meowsenger_user_id", newUser.id, { expires: 7 });

      setUser(newUser);
      setPrivateKey(decryptedKey);

      router.push("/chat");
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.name === "OperationError") {
        throw new Error("Decryption failed. Wrong password?");
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Failed to log out from server:", error);
    }
    setUser(null);
    setPrivateKey(null);
    localStorage.removeItem("meowsenger_user");
    sessionStorage.removeItem("meowsenger_session_key");
    Cookies.remove("meowsenger_user_id");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, privateKey, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
