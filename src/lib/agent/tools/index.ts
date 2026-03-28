import type Anthropic from "@anthropic-ai/sdk";
import {
  getBusinessContextDef,
  getBusinessContext,
} from "./get-business-context";
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
import { readSharedFileDef, readSharedFile } from "./read-shared-file";

export const toolDefinitions: Anthropic.Tool[] = [
  getBusinessContextDef,
  getPendingFollowupsDef,
  searchLeadsDef,
  saveLeadDef,
  draftOutreachDef,
  getConversationHistoryDef,
  readSharedFileDef,
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_business_context":
      return getBusinessContext();
    case "get_pending_followups":
      return getPendingFollowups(input as { days_since_last_contact?: number });
    case "search_leads":
      return searchLeads(input as { query: string });
    case "save_lead":
      return saveLead(
        input as {
          email: string;
          name: string;
          company: string;
          company_domain?: string;
          title?: string;
          notes?: string;
        }
      );
    case "draft_outreach":
      return draftOutreach(
        input as {
          contact_id: string;
          subject: string;
          body_text: string;
          body_html?: string;
        }
      );
    case "get_conversation_history":
      return getConversationHistory(
        input as { contact_email?: string; limit?: number }
      );
    case "read_shared_file":
      return readSharedFile(
        input as { file_id?: string; list_all?: boolean }
      );
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
