export type UserRole = "owner" | "admin";

export type ContactSource = "web_search" | "inbound_email" | "manual";
export type ContactStatus = "lead" | "prospect" | "customer" | "dead";

export type OutreachStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "failed";

export type ThreadType =
  | "daily_update"
  | "owner_conversation"
  | "prospect_outreach";

export type EmailDirection = "inbound" | "outbound";

export type AgentTrigger = "cron" | "inbound_email" | "manual";
export type AgentRunStatus = "running" | "completed" | "failed" | "timed_out";

export type BusinessContextSource = "admin_input" | "agent_learned";

export type SharedFileType = "spreadsheet" | "document" | "presentation";

// --- Table row types ---

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferences: {
    timezone?: string;
    email_frequency?: string;
  } | null;
  created_at: string;
}

export interface BusinessContext {
  id: string;
  key: string;
  value: string;
  source: BusinessContextSource;
  updated_at: string;
}

export interface Contact {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  company_domain: string | null;
  title: string | null;
  source: ContactSource;
  status: ContactStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachDraft {
  id: string;
  contact_id: string;
  subject: string;
  body_html: string;
  body_text: string;
  status: OutreachStatus;
  resend_message_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailThread {
  id: string;
  thread_type: ThreadType;
  contact_id: string | null;
  subject: string;
  resend_thread_id: string | null;
  created_at: string;
  last_message_at: string;
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  direction: EmailDirection;
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  resend_message_id: string | null;
  headers: Record<string, string> | null;
  created_at: string;
}

export interface SharedFile {
  id: string;
  google_file_id: string;
  file_type: SharedFileType;
  title: string;
  google_url: string;
  extracted_content: string | null;
  metadata: Record<string, unknown> | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface AgentRun {
  id: string;
  trigger: AgentTrigger;
  status: AgentRunStatus;
  summary: Record<string, unknown> | null;
  llm_calls: number;
  tokens_used: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}
