import type { User } from "stream-chat";

export interface ChatUser extends User {
  uid?: string;
  email?: string;
}

export interface AgentStatus {
  status: 'connected' | 'connecting' | 'disconnected';
  channel_id?: string;
  agent_id?: string;
  user_id?: string;
  activeAgents?: number;
}

export interface AgentControlProps {
  channelId: string;
  agreementSummary?: string;
  onStatusChange?: (status: AgentStatus) => void;
}

export interface ChatMessage {
  id: string;
  text: string;
  user: ChatUser;
  created_at: string;
  ai_generated?: boolean;
  custom?: {
    messageType?: "user_input" | "ai_response" | "system_message";
    agreementSummary?: string;
  };
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}