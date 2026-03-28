import type Anthropic from "@anthropic-ai/sdk";
import {
  getPendingFollowupsDef,
  getPendingFollowups,
} from "./get-pending-followups";
import { searchLeadsDef, searchLeads } from "./search-leads";
import { saveLeadDef, saveLead } from "./save-lead";
import { draftOutreachDef, draftOutreach } from "./draft-outreach";
import {
  getConversationHistoryDef,
  getConversationHistory,
} from "./get-conversation-history";
import { listContactsDef, listContacts } from "./list-contacts";
import {
  getOutreachStatusDef,
  getOutreachStatus,
} from "./get-outreach-status";
import {
  saveBusinessContextDef,
  saveBusinessContext,
} from "./save-business-context";

export const toolDefinitions: Anthropic.Tool[] = [
  getPendingFollowupsDef,
  searchLeadsDef,
  saveLeadDef,
  draftOutreachDef,
  getConversationHistoryDef,
  listContactsDef,
  getOutreachStatusDef,
  saveBusinessContextDef,
];

const MAX_TOOL_RESULT_LENGTH = 4000;

/**
 * Execute a tool by name, returning the result as a string.
 * Errors are caught and returned as JSON error objects so the agent can recover.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    let result: string;

    switch (name) {
      case "get_pending_followups":
        result = await getPendingFollowups(
          input as { days_since_last_contact?: number }
        );
        break;
      case "search_leads":
        result = await searchLeads(input as { query: string });
        break;
      case "save_lead":
        result = await saveLead(
          input as {
            email: string;
            name: string;
            company: string;
            company_domain?: string;
            title?: string;
            notes?: string;
          }
        );
        break;
      case "draft_outreach":
        result = await draftOutreach(
          input as {
            contact_id: string;
            subject: string;
            body_text: string;
            body_html?: string;
          }
        );
        break;
      case "get_conversation_history":
        result = await getConversationHistory(
          input as { contact_email?: string; limit?: number }
        );
        break;
      case "list_contacts":
        result = await listContacts(
          input as { status?: string; limit?: number }
        );
        break;
      case "get_outreach_status":
        result = await getOutreachStatus(
          input as { status?: string; limit?: number }
        );
        break;
      case "save_business_context":
        result = await saveBusinessContext(
          input as { key: string; value: string }
        );
        break;
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }

    // Truncate large results to prevent unbounded token growth (#010)
    if (result.length > MAX_TOOL_RESULT_LENGTH) {
      return (
        result.slice(0, MAX_TOOL_RESULT_LENGTH) +
        "\n...[truncated — result exceeded 4000 chars]"
      );
    }

    return result;
  } catch (err) {
    // Return errors to the agent instead of crashing the loop (#005)
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Tool "${name}" failed:`, message);
    return JSON.stringify({
      error: `Tool "${name}" failed: ${message}`,
    });
  }
}
