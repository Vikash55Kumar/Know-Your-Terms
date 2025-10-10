import React, { useEffect, useState, useCallback } from 'react';
import { 
  Bot, 
  BotOff, 
  Loader2, 
  RefreshCw,
  Button,
  toast
} from '../lib/components';
import { authService } from '../services/authService';
import type { AgentStatus } from '../types/chat';
import { agentService } from '../services/agentService';

interface AgentControlProps {
  channelId: string;
  agreementSummary?: string;
  onStatusChange?: (status: AgentStatus) => void;
}

export const AgentControl: React.FC<AgentControlProps> = ({ 
  channelId, 
  agreementSummary = "General AI assistant", 
  onStatusChange 
}) => {
  const [status, setStatus] = useState<AgentStatus>({ status: 'disconnected' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAgentStatus = useCallback(async () => {
    try {
      setError(null);
      
      // Check if user is authenticated before making API call
      const token = await authService.getToken();
      if (!token) {
        setError('Please log in to access agent features');
        return;
      }
      
      const response = await agentService.getAgentStatus(channelId);
      const newStatus: AgentStatus = {
        status: response.data.status as 'connected' | 'connecting' | 'disconnected',
        channel_id: response.data.channel_id,
        agent_id: response.data.agent_id,
        user_id: response.data.user_id,
        activeAgents: response.data.activeAgents,
      };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check agent status';
      setError(errorMessage);
      console.error('Error checking agent status:', err);
    }
  }, [channelId, onStatusChange]);

  // Check agent status on component mount and when channelId changes
  useEffect(() => {
    if (channelId) {
      checkAgentStatus();
    }
  }, [channelId, checkAgentStatus]);

  const handleToggleAgent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (status.status === 'connected') {
        // Stop agent
        await agentService.stopAgent(channelId);
        const newStatus: AgentStatus = { status: 'disconnected' };
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        
        toast.success("AI assistant has been disconnected from this chat");
      } else {
        // Start agent
        setStatus({ status: 'connecting' });
        const response = await agentService.startAgent({
          channel_id: channelId,
          agreementSummary,
        });
        
        const newStatus: AgentStatus = {
          status: 'connected',
          channel_id: response.data.channel_id,
          agent_id: response.data.agent_id,
          user_id: response.data.user_id,
          activeAgents: response.data.activeAgents,
        };
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        
        toast.success("AI assistant is now active in this chat");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle agent';
      setError(errorMessage);
      setStatus({ status: 'disconnected' });
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'connected': return <Bot className="w-4 h-4" />;
      case 'connecting': return <Loader2 className="w-4 h-4 animate-spin" />;
      default: return <BotOff className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border shadow-sm">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="capitalize">{status.status}</span>
        </div>
        
        {error && (
          <div className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">
            Error
          </div>
        )}
      </div>

      {/* Agent Info */}
      {status.status === 'connected' && status.activeAgents && (
        <div className="text-sm text-muted-foreground">
          Active agents: {status.activeAgents}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2 ml-auto">
        <Button
          onClick={handleToggleAgent}
          disabled={loading || status.status === 'connecting'}
          className={`${
            status.status === 'connected' 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white px-4 py-2`}
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status.status === 'connected' ? (
            'Disconnect'
          ) : (
            'Connect Agent'
          )}
        </Button>

        <Button
          onClick={checkAgentStatus}
          variant="outline"
          size="sm"
          className="px-3 py-2"
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-500 text-sm max-w-xs truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  );
};