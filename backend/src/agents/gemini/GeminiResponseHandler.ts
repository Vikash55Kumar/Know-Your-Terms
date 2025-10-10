import { GenerativeModel, FunctionCall } from "@google/generative-ai";
import type { Channel, Event, MessageResponse, StreamChat } from "stream-chat";

export class GeminiResponseHandler {
  private message_text = "";
  private is_done = false;
  private last_update_time = 0;
  private abortController?: AbortController;

  constructor(
    private readonly model: GenerativeModel,
    private readonly chatHistory: Array<{ role: string; parts: Array<{ text: string }> }>,
    private readonly chatClient: StreamChat,
    private readonly channel: Channel,
    private readonly message: MessageResponse,
    private readonly onDispose: () => void
  ) {
    this.chatClient.on("ai_indicator.stop", this.handleStopGenerating);
  }

  run = async () => {
    const { cid, id: message_id } = this.message;

    try {
      this.abortController = new AbortController();
      const chat = this.model.startChat({
        history: this.chatHistory.slice(0, -1), // Exclude the last message as it will be sent separately
      });

      // Get the last user message
      const lastMessage = this.chatHistory[this.chatHistory.length - 1];
      const userMessage = lastMessage.parts[0].text;

      let result = await chat.sendMessageStream(userMessage);
      let isCompleted = false;

      while (!isCompleted) {
        let functionCalls: FunctionCall[] = [];

        for await (const chunk of result.stream) {
          if (this.is_done) {
            return;
          }

          const text = chunk.text();
          if (text) {
            this.message_text += text;
            const now = Date.now();
            if (now - this.last_update_time > 1000) {
              await this.chatClient.partialUpdateMessage(message_id, {
                set: { text: this.message_text },
              });
              this.last_update_time = now;
            }
          }

          // Check for function calls
          const functionCall = chunk.functionCalls();
          if (functionCall && functionCall.length > 0) {
            functionCalls.push(...functionCall);
          }
        }

        // Handle function calls
        if (functionCalls.length > 0) {
          await this.channel.sendEvent({
            type: "ai_indicator.update",
            ai_state: "AI_STATE_EXTERNAL_SOURCES",
            cid: cid,
            message_id: message_id,
          });

          const functionResponses = [];
          for (const call of functionCalls) {
            if (call.name === "web_search") {
              const args = call.args as { query: string };
              const searchResult = await this.performWebSearch(args.query);
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { result: searchResult },
                },
              });
            }
          }

          // Continue the conversation with function responses
          await this.channel.sendEvent({
            type: "ai_indicator.update",
            ai_state: "AI_STATE_GENERATING",
            cid: cid,
            message_id: message_id,
          });

          result = await chat.sendMessageStream(functionResponses);
        } else {
          isCompleted = true;
        }
      }

      // Final update with complete message
      await this.chatClient.partialUpdateMessage(message_id, {
        set: { text: this.message_text },
      });

      // Add assistant response to chat history
      this.chatHistory.push({
        role: "model",
        parts: [{ text: this.message_text }],
      });

      await this.channel.sendEvent({
        type: "ai_indicator.clear",
        cid: cid,
        message_id: message_id,
      });
    } catch (error) {
      console.error("An error occurred during the Gemini run:", error);
      await this.handleError(error as Error);
    } finally {
      await this.dispose();
    }
  };

  dispose = async () => {
    if (this.is_done) {
      return;
    }
    this.is_done = true;
    this.chatClient.off("ai_indicator.stop", this.handleStopGenerating);
    this.onDispose();
  };

  private handleStopGenerating = async (event: Event) => {
    if (this.is_done || event.message_id !== this.message.id) {
      return;
    }

    console.log("Stop generating for message", this.message.id);
    
    // Abort the current request
    if (this.abortController) {
      this.abortController.abort();
    }

    await this.channel.sendEvent({
      type: "ai_indicator.clear",
      cid: this.message.cid,
      message_id: this.message.id,
    });
    await this.dispose();
  };

  private handleError = async (error: Error) => {
    if (this.is_done) {
      return;
    }
    await this.channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_ERROR",
      cid: this.message.cid,
      message_id: this.message.id,
    });
    await this.chatClient.partialUpdateMessage(this.message.id, {
      set: {
        text: error.message ?? "Error generating the message",
        message: error.toString(),
      },
    });
    await this.dispose();
  };

  private performWebSearch = async (query: string): Promise<string> => {
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

    if (!TAVILY_API_KEY) {
      return JSON.stringify({
        error: "Web search is not available. API key not configured.",
      });
    }

    console.log(`Performing web search for: "${query}"`);

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query: query,
          search_depth: "advanced",
          max_results: 5,
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Tavily search failed for query "${query}":`, errorText);
        return JSON.stringify({
          error: `Search failed with status: ${response.status}`,
          details: errorText,
        });
      }

      const data = await response.json();
      console.log(`Tavily search successful for query "${query}"`);

      return JSON.stringify(data);
    } catch (error) {
      console.error(
        `An exception occurred during web search for "${query}":`,
        error
      );
      return JSON.stringify({
        error: "An exception occurred during the search.",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}
