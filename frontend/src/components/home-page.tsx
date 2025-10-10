import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
  Bot,
  FileText,
  Sparkles,
  ArrowRight
} from "../lib/components";
import type { User } from "../types";

interface HomePageProps {
  user: User;
  onStartChat: (summaryData: string) => void;
  onLogout: () => void;
}

export const HomePage = ({ user, onStartChat, onLogout }: HomePageProps) => {
  const [summaryData, setSummaryData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAskWithAgent = async () => {
    if (!summaryData.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      // Pass the summary data to parent and navigate to chat
      await onStartChat(summaryData.trim());
      navigate('/chat');
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Know Your Terms</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img 
                src={(user.image as string) || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.id}`} 
                alt={(user.name as string) || 'User'} 
                className="h-8 w-8 rounded-full"
              />
              <span className="text-sm font-medium">{(user.name as string) || 'User'}</span>
            </div>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-foreground">
              Know Your Legal Terms
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your legal document and get instant analysis, explanations, and insights. 
              Our AI legal assistant will help you understand your rights and obligations.
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                <FileText className="h-6 w-6" />
                <span>Legal Document Analysis</span>
              </CardTitle>
              <CardDescription className="text-base">
                Paste your legal document text below to start analyzing contracts, agreements, and legal terms
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Summary Input */}
              <div className="space-y-3">
                <label htmlFor="summary" className="text-sm font-medium text-foreground">
                  Legal Document / Contract Text
                </label>
                <Textarea
                  id="summary"
                  placeholder="Paste your contract, agreement, or legal document text here. For example:

RENTAL AGREEMENT
This agreement is between John Smith (Landlord) and Jane Doe (Tenant) for the property at 123 Main Street...

The AI will analyze the terms, explain your rights, and answer your questions about the document."
                  value={summaryData}
                  onChange={(e) => setSummaryData(e.target.value)}
                  rows={10}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Your document will be automatically loaded into the chat for continuous analysis and follow-up questions
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleAskWithAgent}
                  disabled={!summaryData.trim() || isLoading}
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Preparing Legal Analysis...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Analyze Document with AI</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span>Contract Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Analyze rental agreements, employment contracts, service agreements, and more with AI-powered insights.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-green-500" />
                  <span>Legal Term Explanations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get plain-English explanations of complex legal jargon, clauses, and terminology.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span>Rights & Obligations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Understand your rights, responsibilities, and potential risks before signing any agreement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};