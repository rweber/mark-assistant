import { supabaseAdmin } from "@/lib/supabase/server";
import type { OutreachDraft } from "@/lib/supabase/types";

export interface ApprovalCommand {
  action: "approve" | "reject" | "edit";
  target: "all" | number;
  editText?: string;
}

/**
 * Parse an approval command from the owner's reply.
 * Uses keyword matching (not LLM) to prevent hallucinated confirmations.
 *
 * Supported formats:
 *   APPROVE 1, APPROVE ALL, APPROVE (defaults to all)
 *   REJECT 1, REJECT ALL
 *   EDIT 1: new text here
 */
export function parseApprovalCommand(text: string): ApprovalCommand | null {
  const match = text.match(
    /^\s*(APPROVE|REJECT|EDIT)\s*(ALL|\d+)?\s*(?::\s*(.+))?/im
  );
  if (!match) return null;

  const action = match[1].toLowerCase() as "approve" | "reject" | "edit";
  const targetStr = match[2]?.toUpperCase();
  const editText = match[3]?.trim();

  const target: "all" | number =
    !targetStr || targetStr === "ALL" ? "all" : parseInt(targetStr, 10);

  if (action === "edit" && !editText) return null;

  return { action, target, editText };
}

/**
 * Execute an approval command against pending outreach drafts.
 * Uses claim-once semantics to prevent double-send on webhook retry.
 */
export async function executeApproval(
  command: ApprovalCommand
): Promise<{ processed: string[]; errors: string[] }> {
  const processed: string[] = [];
  const errors: string[] = [];

  // Get pending drafts ordered by creation (for numbered reference)
  const { data: drafts, error } = await supabaseAdmin
    .from("outreach_drafts")
    .select("*")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  if (error || !drafts) {
    return { processed: [], errors: ["Failed to fetch pending drafts."] };
  }

  if (drafts.length === 0) {
    return { processed: [], errors: ["No pending outreach drafts found."] };
  }

  const targetDrafts: OutreachDraft[] =
    command.target === "all"
      ? drafts
      : drafts[command.target - 1]
        ? [drafts[command.target - 1]]
        : [];

  if (targetDrafts.length === 0) {
    return {
      processed: [],
      errors: [`Draft #${command.target} not found. There are ${drafts.length} pending drafts.`],
    };
  }

  for (const draft of targetDrafts) {
    try {
      if (command.action === "approve") {
        // Claim-once: atomically set status to 'approved' only if still 'pending_approval'
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("outreach_drafts")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("id", draft.id)
          .eq("status", "pending_approval") // claim-once guard
          .select("id")
          .maybeSingle();

        if (updateError || !updated) {
          errors.push(
            `Draft for ${draft.subject} was already processed (claim-once guard).`
          );
        } else {
          processed.push(`Approved: "${draft.subject}"`);
        }
      } else if (command.action === "reject") {
        await supabaseAdmin
          .from("outreach_drafts")
          .update({ status: "draft" })
          .eq("id", draft.id)
          .eq("status", "pending_approval");

        processed.push(`Rejected: "${draft.subject}"`);
      } else if (command.action === "edit" && command.editText) {
        await supabaseAdmin
          .from("outreach_drafts")
          .update({
            body_text: command.editText,
            body_html: `<p>${command.editText.replace(/\n/g, "</p><p>")}</p>`,
            status: "pending_approval",
          })
          .eq("id", draft.id);

        processed.push(
          `Updated draft "${draft.subject}" — still pending your approval.`
        );
      }
    } catch (err) {
      errors.push(
        `Error processing "${draft.subject}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { processed, errors };
}
