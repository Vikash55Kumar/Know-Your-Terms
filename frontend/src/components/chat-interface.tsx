import { useRef, useState } from "react";
import {
  Bot,
  Briefcase,
  FileText,
  Lightbulb,
  Menu,
  MessageSquare,
  Sparkles,
  Button,
  Channel,
  useAIState,
  useChannelActionContext,
  useChannelStateContext,
  useChatContext,
  Window,
  MessageList,
} from "../lib/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AgentControl } from "./agent-control";
import { ChatInput, type ChatInputProps } from "./chat-input";
import ChatMessage from "./chat-message";

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  onNewChatMessage: (message: { text: string }) => Promise<void>;
  backendUrl: string;
  summaryData?: string;
}

const EmptyStateWithInput: React.FC<{
  onNewChatMessage: ChatInputProps["sendMessage"];
  hasSummaryData?: boolean;
  summaryData?: string;
}> = ({ onNewChatMessage, hasSummaryData, summaryData }) => {
  const [inputText, setInputText] = useState("");

  // Legal document analysis prompts organized by category
  const legalAnalysisCategories = [
    {
      id: "contracts",
      icon: <FileText className="h-4 w-4" />,
      title: "Contracts",
      prompts: [
        "Analyze this rental agreement and explain my rights as a tenant",
        "What are the key terms I should understand in this employment contract?",
        "Review this service agreement and highlight potential risks",
        "Explain the termination clauses in this contract",
      ],
    },
    {
      id: "agreements",
      icon: <Briefcase className="h-4 w-4" />,
      title: "Agreements",
      prompts: [
        "Break down this business partnership agreement in simple terms",
        "What obligations do I have under this licensing agreement?",
        "Analyze the payment terms and conditions in this document",
        "Explain the liability clauses and what they mean for me",
      ],
    },
    {
      id: "legal-terms",
      icon: <MessageSquare className="h-4 w-4" />,
      title: "Legal Terms",
      prompts: [
        "What does 'force majeure' mean in this contract?",
        "Explain the difference between 'warranty' and 'guarantee' here",
        "What are my rights if the other party breaches this agreement?",
        "Help me understand the arbitration clause in this document",
      ],
    },
    {
      id: "document-review",
      icon: <Lightbulb className="h-4 w-4" />,
      title: "Review",
      prompts: [
        "Is this a fair agreement? What should I negotiate?",
        "What are the potential red flags in this document?",
        "Compare the terms of this agreement with industry standards",
        "What questions should I ask before signing this contract?",
      ],
    },
  ];

  const handlePromptClick = (prompt: string) => {
    setInputText(prompt);
  };

  // Show document-ready state if summary data is loaded
  if (hasSummaryData && summaryData) {
    // Parse summary data to extract key information
    const getSummaryInfo = (summary: string) => {
      const lines = summary.split('\n').filter(line => line.trim());
      const title = lines.find(line => line.toLowerCase().includes('agreement') || 
                                      line.toLowerCase().includes('contract') ||
                                      line.toLowerCase().includes('title'))?.replace(/['"{}]/g, '') || 
                    "Legal Document";
      
      const documentType = summary.toLowerCase().includes('rental') ? 'Rental Agreement' :
                          summary.toLowerCase().includes('employment') ? 'Employment Contract' :
                          summary.toLowerCase().includes('internship') ? 'Internship Agreement' :
                          summary.toLowerCase().includes('service') ? 'Service Agreement' :
                          summary.toLowerCase().includes('partnership') ? 'Partnership Agreement' :
                          'Legal Document';
      
      return { title, documentType };
    };

    const { documentType } = getSummaryInfo(summaryData);

    // Document-specific analysis categories
    const documentAnalysisCategories = [
      {
        id: "key-terms",
        icon: <MessageSquare className="h-4 w-4" />,
        title: "Key Terms",
        prompts: [
          "Explain the key terms and clauses in this document",
          "What are the most important definitions I should understand?",
          "Break down the legal terminology used in this agreement",
          "Which clauses require my immediate attention?",
        ],
      },
      {
        id: "rights-duties",
        icon: <Briefcase className="h-4 w-4" />,
        title: "Rights & Duties",
        prompts: [
          "What are my main rights and obligations in this agreement?",
          "What can I expect from the other party?",
          "What happens if I don't fulfill my obligations?",
          "How are disputes resolved according to this document?",
        ],
      },
      {
        id: "risk-analysis",
        icon: <Lightbulb className="h-4 w-4" />,
        title: "Risk Analysis",
        prompts: [
          "Are there any concerning clauses or red flags in this document?",
          "What are the potential risks I should be aware of?",
          "How can I protect myself from unfavorable terms?",
          "Is this a fair agreement? What should I negotiate?",
        ],
      },
      {
        id: "practical-info",
        icon: <FileText className="h-4 w-4" />,
        title: "Practical Info",
        prompts: [
          "What happens if I want to terminate this agreement early?",
          "Are the payment terms fair and standard for this type of agreement?",
          "How does this compare to standard industry practices?",
          "What questions should I ask before signing this contract?",
        ],
      },
    ];

    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
          <div className="text-center max-w-4xl w-full">
            {/* Hero Section */}
            <div className="mb-2">
              <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse"></div>
              <Bot className="h-8 w-8 text-primary relative z-10" />
              <Sparkles className="h-4 w-4 text-primary/60 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Know Your Terms - AI Legal Assistant 
            </h1>
              <p className="text-md text-muted-foreground mb-4">
                Your {documentType.toLowerCase()} has been analyzed and is ready for review.
              </p>
            </div>

            {/* Document Info Card */}
            <div className="bg-card border rounded-xl p-1 mb-6">

              
              
              {/* Document Preview */}
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  <div className="flex items-center justify-between flex-row pb-1">
                    <div className="flex items-center animate-pulse " >
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-gray-700">{documentType}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-700 dark:text-green-300 font-medium">AI Ready</span>
                    </div>
                  </div>
                  {summaryData.substring(0, 300)}
                  {summaryData.length > 300 && "..."}
                </p>
              </div>
            </div>

            {/* Document Analysis Categories - Tabbed Interface */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                What would you like to know about your document?
              </h2>

              <Tabs defaultValue="key-terms" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  {documentAnalysisCategories.map((category) => (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {category.icon}
                      <span className="hidden sm:inline">{category.title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {documentAnalysisCategories.map((category) => (
                  <TabsContent
                    key={category.id}
                    value={category.id}
                    className="mt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.prompts.map((prompt, promptIndex) => (
                        <button
                          key={promptIndex}
                          onClick={() => handlePromptClick(prompt)}
                          className="p-3 text-left text-sm rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-muted/50 hover:border-muted group"
                        >
                          <span className="text-foreground group-hover:text-primary transition-colors">
                            {prompt}
                          </span>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-foreground">
                  {Math.ceil(summaryData.length / 100)}
                </div>
                <div className="text-xs text-muted-foreground">Key Sections</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-foreground">
                  {summaryData.split(/[.!?]/).length - 1}
                </div>
                <div className="text-xs text-muted-foreground">Clauses Found</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">
                  ✓
                </div>
                <div className="text-xs text-muted-foreground">AI Analyzed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur-sm">
          <div className="p-0">
            <ChatInput
              sendMessage={onNewChatMessage}
              placeholder="Ask me anything about your document... (e.g., 'What are the termination conditions?')"
              value={inputText}
              onValueChange={setInputText}
              className="!p-4"
              isGenerating={false}
              onStopGenerating={() => {}}
            />
          </div>
        </div>
      </div>
    );
  }

  // Default empty state with prompt categories
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
        <div className="text-center max-w-3xl w-full">
          {/* Hero Section */}
          <div className="mb-6">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse"></div>
              <Bot className="h-8 w-8 text-primary relative z-10" />
              <Sparkles className="h-4 w-4 text-primary/60 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Know Your Terms - AI Legal Assistant
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your legal document and get instant analysis, explanations, and insights.
            </p>
          </div>

          {/* Writing Prompt Categories - Tabbed Interface */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              What would you like to analyze today?
            </h2>

            <Tabs defaultValue="contracts" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {legalAnalysisCategories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {category.icon}
                    <span className="hidden sm:inline">{category.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {legalAnalysisCategories.map((category) => (
                <TabsContent
                  key={category.id}
                  value={category.id}
                  className="mt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.prompts.map((prompt, promptIndex) => (
                      <button
                        key={promptIndex}
                        onClick={() => handlePromptClick(prompt)}
                        className="p-3 text-left text-sm rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-muted/50 hover:border-muted group"
                      >
                        <span className="text-foreground group-hover:text-primary transition-colors">
                          {prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="p-4">
          <ChatInput
            sendMessage={onNewChatMessage}
            placeholder="Paste your contract text here, or ask about specific legal terms..."
            value={inputText}
            onValueChange={setInputText}
            className="!p-4"
            isGenerating={false}
            onStopGenerating={() => {}}
          />
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>Press Enter to send</span>
            <span>•</span>
            <span>Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageListContent = () => {
  const { thread } = useChannelStateContext();
  const isThread = !!thread;

  if (isThread) return null;

  return <MessageList Message={ChatMessage} />;
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onToggleSidebar,
  onNewChatMessage,
  summaryData,
}) => {
  const { channel } = useChatContext();
  
  // Get summary data from channel metadata or from props
  const channelSummaryData = (channel?.data as { summary_data?: string })?.summary_data;
  const effectiveSummaryData = channelSummaryData || summaryData;

  const ChannelMessageInputComponent = () => {
    const { sendMessage } = useChannelActionContext();
    const { channel, messages } = useChannelStateContext();
    const { aiState } = useAIState(channel);
    const [inputText, setInputText] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Add validation to ensure channel is ready
    if (!channel || !sendMessage) {
      return null;
    }

    const isGenerating =
      aiState === "AI_STATE_THINKING" ||
      aiState === "AI_STATE_GENERATING" ||
      aiState === "AI_STATE_EXTERNAL_SOURCES";

    console.log("aiState", aiState);

    const handleStopGenerating = () => {
      if (channel && messages) {
        const aiMessage = [...messages]
          .reverse()
          .find((m) => m.user?.id?.startsWith("ai-legal-bot"));
        if (aiMessage) {
          channel.sendEvent({
            type: "ai_indicator.stop",
            cid: channel.cid,
            message_id: aiMessage.id,
          });
        }
      }
    };

    // Wrapper to convert ChatInput interface to Stream Chat sendMessage interface
    const handleSendMessage = async ({ text }: { text: string }) => {
      if (channel) {
        // Use channel.sendMessage directly to avoid duplication
        await channel.sendMessage({ text });
      }
    };

    return (
      <ChatInput
        sendMessage={handleSendMessage}
        value={inputText}
        onValueChange={setInputText}
        textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
        showPromptToolbar={true}
        className="!p-4"
        isGenerating={isGenerating}
        onStopGenerating={handleStopGenerating}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Enhanced Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden h-9 w-9"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {(() => {
                  const channelData = channel?.data as { name?: string };
                  if (channelData?.name) {
                    return channelData.name;
                  }
                  return "Legal Document Analysis";
                })()}
              </h2>
              <p className="text-xs text-muted-foreground">
                Know Your Terms • AI Legal Assistant
              </p>
            </div>
          </div>
        </div>
        {channel?.id && (
          // <div className="flex-shrink-0 ml-2">
            <AgentControl
              channelId={channel.id}
              agreementSummary={effectiveSummaryData || "No summary data provided. Please provide context for analysis."}
            />
          // </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {!channel ? (
          <EmptyStateWithInput 
            onNewChatMessage={onNewChatMessage} 
            hasSummaryData={!!effectiveSummaryData}
            summaryData={effectiveSummaryData}
          />
        ) : (
          <Channel channel={channel}>
            <Window>
              <MessageListContent />
              <ChannelMessageInputComponent />
            </Window>
          </Channel>
        )}
      </div>
    </div>
  );
};
