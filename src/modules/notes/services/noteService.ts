export interface CreateNotePayload {
  title: string;
  content: string;
  mediaFiles: File[];
}

export const createNote = async ({
  title,
  content,
  mediaFiles,
}: CreateNotePayload): Promise<void> => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("content", content);

  for (const file of mediaFiles) {
    formData.append("mediaFiles", file);
  }

  const response = await fetch("/api/notes", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Unable to create note.");
  }
};
