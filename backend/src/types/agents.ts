import type { Channel, StreamChat, User } from "stream-chat";

export interface AIAgent {
  user?: User;
  channel: Channel;
  chatClient: StreamChat;
  getLastInteraction: () => number;
  init: () => Promise<void>;
  dispose: () => Promise<void>;
}

export enum AgentPlatform {
  GEMINI = "gemini",
  WRITING_ASSISTANT = "writing_assistant",
  LEGAL_ASSISTANT = "legal_assistant", // Added for Know Your Terms
}

// Extended message type for legal document assistance features
export interface LegalMessage {
  custom?: {
    messageType?: "user_question" | "ai_response" | "system_message";
    agreementType?: "rental" | "loan" | "employment" | "service" | "other";
    clauseReference?: string;
    legalTerms?: string[];
  };
}

// Extended message type for writing assistant features (kept for compatibility)
export interface WritingMessage {
  custom?: {
    messageType?: "user_input" | "ai_response" | "system_message";
    writingTask?: string;
    suggestions?: string[];
  };
}
