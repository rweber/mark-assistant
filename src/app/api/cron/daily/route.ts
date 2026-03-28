import { NextRequest } from "next/server";
import { runMark } from "@/lib/agent/mark";
import { sendEmail } from "@/lib/email/send";
import {
  renderDailyEmail,
  type DailyEmailData,
} from "@/lib/email/templates/daily-update";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if onboarding is complete
  const { data: context } = await supabaseAdmin
    .from("business_context")
    .select("key")
    .limit(1);

  if (!context || context.length === 0) {
    return Response.json({
      status: "skipped",
      reason: "Business context not configured. Complete onboarding first.",
    });
  }

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    return Response.json({
      status: "error",
      reason: "OWNER_EMAIL not configured.",
    });
  }

  try {
    // Run Mark's daily reasoning loop
    const result = await runMark(
      "Run your daily routine. Check for prospect replies, review contacts needing follow-up, research new leads, and draft outreach if appropriate. Return your findings in the specified JSON format.",
      "cron"
    );

    // Parse Mark's output into email sections
    const emailData = parseAgentOutput(result.output);

    // Render and send the daily email
    const { subject, html, text } = renderDailyEmail(emailData);
    await sendEmail({ to: ownerEmail, subject, html, text });

    // Store any new learnings Mark discovered
    if (emailData.learnings.length > 0) {
      for (const learning of emailData.learnings) {
        await supabaseAdmin.from("business_context").upsert(
          {
            key: learning.key,
            value: learning.value,
            source: "agent_learned",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }
    }

    return Response.json({
      status: "success",
      runId: result.runId,
      llmCalls: result.llmCalls,
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Try to notify admin of failure
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: "Mark: Daily cron failed",
          html: `<p>Mark's daily cron job failed:</p><pre>${errorMessage}</pre>`,
          text: `Mark's daily cron job failed:\n${errorMessage}`,
        });
      } catch {
        // Don't let notification failure mask the original error
      }
    }

    return Response.json({ status: "error", error: errorMessage }, { status: 500 });
  }
}

function parseAgentOutput(output: string): DailyEmailData {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Try to parse JSON from the agent's output
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Number the outreach drafts
      const drafts = (parsed.outreach_drafts ?? parsed.outreachDrafts ?? []).map(
        (
          d: { contact_name: string; subject: string; body: string; rationale: string },
          i: number
        ) => ({
          ...d,
          draft_number: i + 1,
        })
      );

      return {
        ownerName: "",
        prospectReplies: parsed.prospect_replies ?? parsed.prospectReplies ?? [],
        followUpReminders:
          parsed.follow_up_reminders ?? parsed.followUpReminders ?? [],
        newLeads: parsed.new_leads ?? parsed.newLeads ?? [],
        outreachDrafts: drafts,
        learnings: parsed.learnings ?? [],
        date: today,
      };
    } catch {
      // JSON parsing failed — fall through to fallback
    }
  }

  // Fallback: treat the whole output as a learning / text summary
  return {
    ownerName: "",
    prospectReplies: [],
    followUpReminders: [],
    newLeads: [],
    outreachDrafts: [],
    learnings: [
      {
        key: "Daily Summary",
        value: output.slice(0, 1000),
      },
    ],
    date: today,
  };
}
