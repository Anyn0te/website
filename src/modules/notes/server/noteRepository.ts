import { promises as fs } from "fs";
import path from "path";
import { mockNotes } from "../data/mockNotes";
import { Note } from "../types";

const STORAGE_FOLDER = path.join(process.cwd(), "storage");
const NOTES_FILE_PATH = path.join(STORAGE_FOLDER, "notes.json");

const cloneNotes = (source: Note[]): Note[] =>
  source.map((note) => ({
    ...note,
    media: note.media.map((mediaItem) => ({ ...mediaItem })),
  }));

const ensureStorage = async () => {
  await fs.mkdir(STORAGE_FOLDER, { recursive: true });
};

export const readNotes = async (): Promise<Note[]> => {
  try {
    const contents = await fs.readFile(NOTES_FILE_PATH, "utf-8");
    const parsed = JSON.parse(contents) as Note[];
    return Array.isArray(parsed) ? cloneNotes(parsed) : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      return cloneNotes(mockNotes);
    }

    if (error instanceof SyntaxError) {
      return cloneNotes(mockNotes);
    }

    throw error;
  }
};

export const writeNotes = async (notes: Note[]): Promise<void> => {
  await ensureStorage();
  await fs.writeFile(NOTES_FILE_PATH, JSON.stringify(notes, null, 2), "utf-8");
};
