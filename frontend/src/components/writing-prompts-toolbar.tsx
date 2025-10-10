import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  List,
  Minimize2,
  Palette,
  PenLine,
  Smile,
  SpellCheck,
  Type,
  Button,
  ScrollArea
} from "../lib/components";

interface WritingPromptsToolbarProps {
  onPromptSelect: (prompt: string) => void;
  className?: string;
}

const toolbarPrompts = [
  {
    icon: List,
    text: "List the questions regarding this agreement",
    category: "Legal Terms",
  },
  {
    icon: Minimize2,
    text: "Summarize this document in simple terms",
    category: "Summary",
  },
  {
    icon: PenLine,
    text: "What are my rights and obligations?",
    category: "Rights & Duties",
  },
  {
    icon: Palette,
    text: "Are there any red flags or concerns?",
    category: "Risk Analysis",
  },
  {
    icon: Type,
    text: "What happens if I want to terminate early?",
    category: "Termination",
  },
  {
    icon: Smile,
    text: "Are the payment terms fair?",
    category: "Payment Terms",
  },
  {
    icon: SpellCheck,
    text: "How does this compare to industry standards?",
    category: "Comparison",
  },
  {
    icon: List,
    text: "What questions should I ask before signing?",
    category: "Before Signing",
  },
];

export const WritingPromptsToolbar: React.FC<WritingPromptsToolbarProps> = ({
  onPromptSelect,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Expanded Menu */}
      {isExpanded && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsExpanded(false)}
          />

          {/* Menu content */}
          <div className="absolute bottom-full left-0 right-0 mb-2 z-20">
            <div className="bg-background border rounded-lg shadow-xl mx-4">
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {toolbarPrompts.map((prompt, index) => {
                  const IconComponent = prompt.icon;
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onPromptSelect(prompt.text);
                        setIsExpanded(false);
                      }}
                      className="h-auto p-2 text-xs text-left justify-start hover:bg-muted/50"
                    >
                      <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">
                          {prompt.text}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {prompt.category}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toolbar - always visible */}
      <div className="bg-background border-t">
        <div className="flex items-center px-4 py-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2 text-xs font-medium flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-1" />
            ) : (
              <ChevronUp className="h-4 w-4 mr-1" />
            )}
            Prompts
          </Button>

          <ScrollArea className="flex-1 max-w-full">
            <div className="flex gap-1 pb-1">
              {toolbarPrompts.slice(0, 3).map((prompt, index) => {
                const IconComponent = prompt.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onPromptSelect(prompt.text)}
                    className="h-7 px-2 text-xs whitespace-nowrap flex-shrink-0 hover:bg-muted/50"
                  >
                    <IconComponent className="h-3 w-3 mr-1" />
                    {prompt.text}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
