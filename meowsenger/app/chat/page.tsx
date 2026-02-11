import { siteConfig } from "@/lib/site-config";

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-default-400 p-4 text-center">
      <div className="text-6xl mb-4 opacity-50">🔒</div>
      <h2 className="text-2xl font-bold text-foreground">
        Welcome to {siteConfig.name}
      </h2>
      <p className="mt-2 text-sm max-w-xs">
        Select a conversation from the sidebar to start a secure, end-to-end
        encrypted chat.
      </p>
    </div>
  );
}
