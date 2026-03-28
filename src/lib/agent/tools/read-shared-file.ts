import { supabaseAdmin } from "@/lib/supabase/server";

export const readSharedFileDef = {
  name: "read_shared_file" as const,
  description:
    "Read the extracted text content of a Google Drive file that has been shared with Mark. Returns the file title and its parsed content.",
  input_schema: {
    type: "object" as const,
    properties: {
      file_id: {
        type: "string",
        description:
          "The database ID or Google file ID of the shared file to read.",
      },
      list_all: {
        type: "boolean",
        description:
          "If true, list all shared files without returning content. Useful to see what files are available.",
      },
    },
    required: [] as string[],
  },
};

export async function readSharedFile(input: {
  file_id?: string;
  list_all?: boolean;
}): Promise<string> {
  if (input.list_all) {
    const { data, error } = await supabaseAdmin
      .from("shared_files")
      .select("id, google_file_id, file_type, title, last_synced_at")
      .order("title");

    if (error) return JSON.stringify({ error: error.message });
    if (!data || data.length === 0) {
      return JSON.stringify({ message: "No shared files found." });
    }
    return JSON.stringify(data);
  }

  if (!input.file_id) {
    return JSON.stringify({
      error: "Provide file_id or set list_all to true.",
    });
  }

  // Try matching by database ID or Google file ID
  const { data, error } = await supabaseAdmin
    .from("shared_files")
    .select("*")
    .or(`id.eq.${input.file_id},google_file_id.eq.${input.file_id}`)
    .maybeSingle();

  if (error) return JSON.stringify({ error: error.message });
  if (!data) {
    return JSON.stringify({ error: `File not found: ${input.file_id}` });
  }

  return JSON.stringify({
    title: data.title,
    file_type: data.file_type,
    last_synced: data.last_synced_at,
    content: data.extracted_content ?? "File content has not been extracted yet.",
  });
}
