import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeTool } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { BusinessContext, AgentTrigger } from "@/lib/supabase/types";

const MAX_ITERATIONS = 15;
const TIME_BUDGET_MS = 270_000; // 270s, leaving 30s buffer for Vercel's 300s limit

export interface AgentResult {
  output: string;
  runId: string;
  llmCalls: number;
  tokensUsed: number;
  durationMs: number;
}

/**
 * Run Mark's agent loop.
 *
 * @param userMessage - The prompt for this run (e.g., "Run your daily routine" or an owner's reply)
 * @param trigger - What initiated this run
 * @returns The agent's final text output and run metadata
 */
export async function runMark(
  userMessage: string,
  trigger: AgentTrigger
): Promise<AgentResult> {
  const startTime = Date.now();
  const client = new Anthropic();

  // Log the run start
  const { data: run } = await supabaseAdmin
    .from("agent_runs")
    .insert({
      trigger,
      status: "running",
      llm_calls: 0,
      tokens_used: 0,
    })
    .select("id")
    .single();
  const runId = run?.id ?? "unknown";

  // Load business context for the system prompt
  const { data: contextRows } = await supabaseAdmin
    .from("business_context")
    .select("*")
    .order("key");
  const businessContext = (contextRows ?? []) as BusinessContext[];

  const systemPrompt = buildSystemPrompt(businessContext);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  let totalTokens = 0;

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // Time budget check — force wrap-up if running low
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        messages.push({
          role: "user",
          content:
            "You are running out of time. Please provide your final summary now without further tool calls.",
        });

        const finalResponse = await client.messages.create({
          model: "claude-sonnet-4-5-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        });

        totalTokens +=
          (finalResponse.usage?.input_tokens ?? 0) +
          (finalResponse.usage?.output_tokens ?? 0);

        const finalText = finalResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        return await finishRun(
          runId,
          "completed",
          finalText,
          iterations,
          totalTokens,
          startTime
        );
      }

      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: toolDefinitions,
        messages,
      });

      totalTokens +=
        (response.usage?.input_tokens ?? 0) +
        (response.usage?.output_tokens ?? 0);

      // Append assistant response to conversation history
      messages.push({ role: "assistant", content: response.content });

      // If Claude is done (no more tool calls), return final text
      if (response.stop_reason === "end_turn") {
        const finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        return await finishRun(
          runId,
          "completed",
          finalText,
          iterations,
          totalTokens,
          startTime
        );
      }

      // Process tool calls
      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === "tool_use") {
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }
        }

        messages.push({ role: "user", content: toolResults });
      }
    }

    // Exceeded max iterations
    const lastText = messages
      .filter((m) => m.role === "assistant")
      .flatMap((m) => {
        if (typeof m.content === "string") return [m.content];
        if (Array.isArray(m.content)) {
          return m.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text);
        }
        return [];
      })
      .pop() ?? "Mark reached the maximum number of steps for this run.";

    return await finishRun(
      runId,
      "completed",
      lastText,
      iterations,
      totalTokens,
      startTime
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await finishRun(
      runId,
      "failed",
      errorMessage,
      iterations,
      totalTokens,
      startTime,
      errorMessage
    );

    throw error;
  }
}

async function finishRun(
  runId: string,
  status: "completed" | "failed" | "timed_out",
  output: string,
  llmCalls: number,
  tokensUsed: number,
  startTime: number,
  errorMessage?: string
): Promise<AgentResult> {
  const durationMs = Date.now() - startTime;

  if (runId !== "unknown") {
    await supabaseAdmin
      .from("agent_runs")
      .update({
        status,
        summary: { output: output.slice(0, 2000) },
        llm_calls: llmCalls,
        tokens_used: tokensUsed,
        duration_ms: durationMs,
        error_message: errorMessage ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  }

  return {
    output,
    runId,
    llmCalls: llmCalls,
    tokensUsed: tokensUsed,
    durationMs,
  };
}
