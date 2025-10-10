import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Channel, type User } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { v4 as uuidv4 } from "uuid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Loader2,
} from "../lib/components";
import { ChatProvider } from "../providers/chat-provider";
import { ChatInterface } from "./chat-interface";
import { ChatSidebar } from "./chat-sidebar";

interface AuthenticatedAppProps {
  user: User;
  onLogout: () => void;
  summaryData?: string;
}

export const AuthenticatedApp = ({ user, onLogout, summaryData }: AuthenticatedAppProps) => (
  <ChatProvider user={user}>
    <AuthenticatedCore user={user} onLogout={onLogout} summaryData={summaryData} />
  </ChatProvider>
);

const AuthenticatedCore = ({ user, onLogout, summaryData }: AuthenticatedAppProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const { client, setActiveChannel } = useChatContext();
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string;

  useEffect(() => {
    const syncChannelWithUrl = async () => {
      if (!client) return;

      if (channelId) {
        const channel = client.channel("messaging", channelId);
        await channel.watch();
        setActiveChannel(channel);
      } else {
        setActiveChannel(undefined);
      }
    };
    syncChannelWithUrl();
  }, [channelId, client, setActiveChannel]);

  // Auto-create channel with summary data when coming from home page
  useEffect(() => {
    const createChannelWithSummary = async () => {
      // Check if we've already created a channel for this summary in this session
      const summaryHash = summaryData ? btoa(summaryData.substring(0, 100)) : '';
      const sessionKey = `channel_created_${summaryHash}`;
      const hasCreatedForThisSummary = sessionStorage.getItem(sessionKey);
      
      // Only create channel if we have client, summary data, no existing channelId, and haven't created for this summary
      if (!client || !summaryData || channelId || hasCreatedForThisSummary) return;

      try {
        // Mark that we're creating a channel for this summary
        sessionStorage.setItem(sessionKey, 'true');
        // Create a new channel with the summary data
        const newChannelId = uuidv4();
        
        // Extract document type from summary for channel name
        const getChannelName = (summary: string) => {
          // Look for document type indicators
          if (summary.toLowerCase().includes('rental')) return 'Rental Agreement Analysis';
          if (summary.toLowerCase().includes('employment')) return 'Employment Contract Analysis';
          if (summary.toLowerCase().includes('internship')) return 'Internship Agreement Analysis';
          if (summary.toLowerCase().includes('service')) return 'Service Agreement Analysis';
          if (summary.toLowerCase().includes('partnership')) return 'Partnership Agreement Analysis';
          if (summary.toLowerCase().includes('loan')) return 'Loan Agreement Analysis';
          if (summary.toLowerCase().includes('business')) return 'Business Document Analysis';
          
          // Fallback to timestamp-based name
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `Document Analysis ${timestamp}`;
        };
        
        const channelName = getChannelName(summaryData);
        
        const newChannel = client.channel("messaging", newChannelId, {
          members: [user.id],
          ...({
            name: channelName,
            summary_data: summaryData,
            created_at: new Date().toISOString(),
            document_type: 'legal_analysis'
          } as Record<string, unknown>)
        });
        await newChannel.watch();
        
        // Set the channel as active (but don't navigate - stay on current route)
        setActiveChannel(newChannel);

        // Send the summary data as the first message with welcome context
        await newChannel.sendMessage({
          text: `✅ **Document Analysis Complete**

            Your ${summaryData.toLowerCase().includes('rental') ? 'rental agreement' :
                  summaryData.toLowerCase().includes('employment') ? 'employment contract' :
                  summaryData.toLowerCase().includes('internship') ? 'internship agreement' :
                  summaryData.toLowerCase().includes('service') ? 'service agreement' :
                  summaryData.toLowerCase().includes('partnership') ? 'partnership agreement' :
                  summaryData.toLowerCase().includes('loan') ? 'loan agreement' :
                  'legal document'} has been successfully analyzed and is ready for review.

            **📄 Document Preview:**
            ${summaryData.substring(0, 250)}${summaryData.length > 250 ? '...' : ''}

            ---

            **🔍 What would you like to know?**

            **Key Terms & Clauses**
            • Explain the important terms and definitions
            • What are the most critical clauses I should understand?

            **Rights & Obligations** 
            • What are my main rights in this agreement?
            • What are my key responsibilities and obligations?

            **Risk Analysis**
            • Are there any red flags or concerning clauses?
            • What potential risks should I be aware of?

            **Practical Questions**
            • What happens if I want to terminate this agreement?
            • How do the payment terms compare to industry standards?

            💬 **Ready to help!** Ask me anything about your document or click any suggestion above.`
          });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Something went wrong";
        console.error("Error creating channel with summary:", errorMessage);
      }
    };

    createChannelWithSummary();
  }, [client, summaryData, channelId, user.id, setActiveChannel]); // Removed navigate from dependencies

  const handleNewChatMessage = async (message: { text: string }) => {
    if (!user.id) return;

    try {
      // 1. Create a new channel with the user as the only member
      // Use the actual message content for the channel name
      const getChannelNameFromMessage = (messageText: string) => {
        // Clean the message and get first meaningful part
        const cleanMessage = messageText.trim();
        if (cleanMessage.length > 0) {
          // Take first 30 characters and add ellipsis if longer
          return cleanMessage.length > 30 
            ? cleanMessage.substring(0, 30) + "..."
            : cleanMessage;
        }
        
        // Fallback if message is empty
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `New Chat ${timestamp}`;
      };
      
      const channelName = getChannelNameFromMessage(message.text);
      
      const newChannel = client.channel("messaging", uuidv4(), {
        members: [user.id],
        ...({
          name: channelName,
          created_at: new Date().toISOString(),
          document_type: 'general_chat'
        } as Record<string, unknown>)
      });
      await newChannel.watch();

      // 2. Set the channel as active (stay on current route)
      setActiveChannel(newChannel);

      // 3. Send the initial message
      await newChannel.sendMessage(message);

      // Note: Agent connection will be handled by the AgentControl component
      // which is integrated into the ChatInterface
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      console.error("Error creating new chat:", errorMessage);
    }
  };

  const handleNewChatClick = () => {
    setActiveChannel(undefined);
    // Don't navigate - just clear the active channel to show empty state
    setSidebarOpen(false);
  };

  const handleDeleteClick = (channel: Channel) => {
    setChannelToDelete(channel);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (channelToDelete) {
      try {
        if (channelId === channelToDelete.id) {
          navigate("/chat");
        }
        await channelToDelete.delete();
      } catch (error) {
        console.error("Error deleting channel:", error);
      }
    }
    setShowDeleteDialog(false);
    setChannelToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setChannelToDelete(null);
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          Connecting to chat...
        </p>
      </div>
    );
  }

  // const filters: ChannelFilters = {
  //   type: "messaging",
  //   members: { $in: [user.id] },
  // };
  // const sort: ChannelSort = { last_message_at: -1 };
  // const options = { state: true, presence: true, limit: 10 };

  return (
    <div className="flex h-full pt-20 w-full">
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        onNewChat={handleNewChatClick}
        onChannelDelete={handleDeleteClick}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChatMessage={handleNewChatMessage}
          backendUrl={backendUrl}
          summaryData={summaryData}
        />
      </div>

      {/* Delete Chat Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Writing Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this writing session? This action
              cannot be undone and all content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
