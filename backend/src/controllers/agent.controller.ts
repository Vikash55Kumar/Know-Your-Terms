import { Request, Response } from "express";
import { createAgent } from "../agents/createAgent";
import { AgentPlatform, AIAgent } from "../types/agents";
import { apiKey, serverClient } from "../serverClient";
import { ApiError } from "../utility/ApiError";
import ApiResponse from "../utility/ApiResponse";
import { asyncHandler } from "../utility/asyncHandler";

// Map to store the AI Agent instances
// [user_id string]: AI Agent
const aiAgentCache = new Map<string, AIAgent>();
const pendingAiAgents = new Set<string>();

// TODO: temporary set to 8 hours, should be cleaned up at some point
const inactivityThreshold = 480 * 60 * 1000;

// Periodically check for inactive AI agents and dispose of them
setInterval(async () => {
  const now = Date.now();
  for (const [userId, aiAgent] of aiAgentCache) {
    if (now - aiAgent.getLastInteraction() > inactivityThreshold) {
      console.log(`Disposing AI Agent due to inactivity: ${userId}`);
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(userId);
    }
  }
}, 5000);

// Helper function to dispose AI agent
async function disposeAiAgent(aiAgent: AIAgent) {
  await aiAgent.dispose();
  if (!aiAgent.user) {
    return;
  }
  await serverClient.deleteUser(aiAgent.user.id, {
    hard_delete: true,
  });
}

/**
 * Handle the request to start the AI Agent for legal document Q&A
 */
const startAiAgent = asyncHandler(async (req: Request, res: Response) => {
  const { channel_id, channel_type = "messaging", agreementSummary } = req.body;
  console.log(`[API] /start-ai-agent called for channel: ${channel_id}`);

  // Simple validation
  if (!channel_id) {
    throw new ApiError(400, "Missing required field: channel_id");
  }

  if (!agreementSummary) {
    throw new ApiError(400, "Missing required field: agreementSummary");
  }

  const authenticatedUser = req.user;
  
  if (!authenticatedUser) {
    throw new ApiError(401, "User not authenticated");
  }

  const user_id = `ai-legal-bot-${authenticatedUser.uid}-${channel_id.replace(/[!]/g, "")}`;
  console.log(`[API] Generated user_id: ${user_id}`);

  try {
    // Prevent multiple agents from being created for the same channel simultaneously
    if (!aiAgentCache.has(user_id) && !pendingAiAgents.has(user_id)) {
      console.log(`[API] Creating new legal AI agent for ${user_id}`);
      pendingAiAgents.add(user_id);

      console.log(`[API] Step 1: Creating Stream Chat user...`);
      await serverClient.upsertUser({
        id: user_id,
        name: "Legal AI Assistant",
        // Remove the role property as it's not defined in Stream Chat
        // role: "legal_ai_bot",
      });

      const channel = serverClient.channel(channel_type, channel_id);
      await channel.addMembers([user_id]);

      const agent = await createAgent(
        user_id,
        AgentPlatform.GEMINI,
        channel_type,
        channel_id,
        agreementSummary,
        authenticatedUser
      );
      console.log(`[API] Step 3: Agent created successfully`);

      await agent.init();
      console.log(`[API] Step 4: Agent initialized successfully`);
      
      // Final check to prevent race conditions where an agent might have been added
      // while this one was initializing.
      if (aiAgentCache.has(user_id)) {
        console.log(`[API] WARNING: Agent already exists, disposing new one`);
        await agent.dispose();
      } else {
        aiAgentCache.set(user_id, agent);
        console.error(`[API] SUCCESS: Agent added to cache. Total active agents: ${aiAgentCache.size}`);
      }
    } else {
      console.error(`AI Agent ${user_id} already started or is pending.`);
    }

    res.status(200).json(
      new ApiResponse(200, {
        channel_id,
        agent_id: user_id,
        activeAgents: aiAgentCache.size
      }, "Legal AI Agent started successfully")
    );
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[API] ERROR: Failed to start AI Agent for ${user_id}:`, errorMessage);
    console.error(`[API] ERROR: Full error:`, error);
    throw new ApiError(500, "Failed to start AI Agent", [errorMessage]);
  } finally {
    console.log(`[API] Finally: Removing ${user_id} from pending agents`);
    pendingAiAgents.delete(user_id);
  }
});

/**
 * Handle the request to stop the AI Agent
 */
const stopAiAgent = asyncHandler(async (req: Request, res: Response) => {
  const { channel_id } = req.body;
  console.log(`[API] /stop-ai-agent called for channel: ${channel_id}`);
  
  if (!channel_id) {
    throw new ApiError(400, "Missing required field: channel_id");
  }

  const authenticatedUser = req.user;
  
  if (!authenticatedUser) {
    throw new ApiError(401, "User not authenticated");
  }

  const user_id = `ai-legal-bot-${authenticatedUser.uid}-${channel_id.replace(/[!]/g, "")}`;
  
  try {
    const aiAgent = aiAgentCache.get(user_id);
    if (aiAgent) {
      console.log(`[API] Disposing agent for ${user_id}`);
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(user_id);
    } else {
      console.log(`[API] Agent for ${user_id} not found in cache.`);
    }
    
    res.status(200).json(
      new ApiResponse(200, {
        channel_id,
        agent_id: user_id
      }, "Legal AI Agent stopped successfully")
    );
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to stop AI Agent", errorMessage);
    throw new ApiError(500, "Failed to stop AI Agent", [errorMessage]);
  }
});

/**
 * Get AI Agent status
 */
const getAgentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { channel_id } = req.query;
  
  if (!channel_id || typeof channel_id !== "string") {
    throw new ApiError(400, "Missing or invalid channel_id parameter");
  }

  const authenticatedUser = req.user;
  
  if (!authenticatedUser) {
    throw new ApiError(401, "User not authenticated");
  }
  
  // ✅ Use authenticated user in agent ID
  const user_id = `ai-legal-bot-${authenticatedUser.uid}-${channel_id.replace(/[!]/g, "")}`;
  
  let status: string;
  if (aiAgentCache.has(user_id)) {
    console.log(`[API] Status for ${user_id}: connected`);
    status = "connected";
  } else if (pendingAiAgents.has(user_id)) {
    console.log(`[API] Status for ${user_id}: connecting`);
    status = "connecting";
  } else {
    console.log(`[API] Status for ${user_id}: disconnected`);
    status = "disconnected";
  }

  res.status(200).json(
    new ApiResponse(200, {
      channel_id,
      agent_id: user_id,
      status,
      activeAgents: aiAgentCache.size
    }, "Agent status retrieved")
  );
});

/**
 * Token provider endpoint - generates secure tokens for Stream Chat
 */
const generateToken = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  // Create token with expiration (1 hour) and issued at time for security
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiration = issuedAt + 60 * 60; // 1 hour from now

  const token = serverClient.createToken(userId, expiration, issuedAt);

  res.status(200).json(
    new ApiResponse(200, { token }, "Token generated successfully")
  );
});

/**
 * Get system info
 */
const getSystemInfo = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    new ApiResponse(200, {
      message: "Know Your Terms - Legal AI Agent Server",
      apiKey: apiKey,
      activeAgents: aiAgentCache.size,
      pendingAgents: pendingAiAgents.size,
      uptime: process.uptime()
    }, "Legal AI Agent System Info")
  );
});

export {
  startAiAgent,
  stopAiAgent,
  getAgentStatus,
  generateToken,
  getSystemInfo
};