import { useState } from "react";
import { cn } from "@/lib/utils";
import { Crown, User, ChevronDown, ChevronUp, Brain } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "ai";
  content: string;
  thinking?: string;
  timestamp: string;
}

export function ChatMessage({ role, content, thinking, timestamp }: ChatMessageProps) {
  const [showThinking, setShowThinking] = useState(false);
  const isAI = role === "ai";

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      {isAI && (
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-primary" />
        </div>
      )}

      <div className={cn("max-w-[75%] space-y-2", !isAI && "order-first")}>
        <div className={isAI ? "chat-bubble-ai" : "chat-bubble-user"}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>

        {isAI && thinking && (
          <div>
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>View thinking process</span>
              {showThinking ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {showThinking && (
              <div className="thinking-panel mt-2 animate-slide-up">
                <p className="text-muted-foreground whitespace-pre-wrap">{thinking}</p>
              </div>
            )}
          </div>
        )}

        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>

      {!isAI && (
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
