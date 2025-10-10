import { backend_url } from '../utils/baseApi';
import { authService } from './authService';

export interface StartAgentRequest {
  channel_id: string;
  channel_type?: string;
  agreementSummary: string;
}

export interface AgentResponse {
  success: boolean;
  data: {
    channel_id: string;
    agent_id: string;
    user_id: string;
    status?: string;
    activeAgents?: number;
  };
  message: string;
}

export interface StreamTokenResponse {
  success: boolean;
  data: {
    token: string;
  };
  message: string;
}

class AgentService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await authService.getToken();
    if (!token) {
      throw new Error('No authentication token available. Please log in.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async startAgent(params: StartAgentRequest): Promise<AgentResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${backend_url}/api/v1/agents/start-ai-agent`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to start agent: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to start agent');
    }
  }

  async stopAgent(channelId: string): Promise<AgentResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${backend_url}/api/v1/agents/stop-ai-agent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel_id: channelId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to stop agent: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to stop agent');
    }
  }

  async getAgentStatus(channelId: string): Promise<AgentResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(
        `${backend_url}/api/v1/agents/agent-status?channel_id=${channelId}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to get agent status: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get agent status');
    }
  }

  async getStreamToken(): Promise<StreamTokenResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Get the current user ID from auth service
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const response = await fetch(`${backend_url}/api/v1/agents/token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: currentUser.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to get stream token: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get stream token');
    }
  }
}

export const agentService = new AgentService();