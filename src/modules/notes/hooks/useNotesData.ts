import { useCallback, useEffect, useRef, useState } from "react";
import { getMockNotes } from "../data/mockNotes";
import { Note } from "../types";

export interface UseNotesDataResult {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const useNotesData = (): UseNotesDataResult => {
  const [notes, setNotes] = useState<Note[]>(getMockNotes());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notes");
      if (!response.ok) {
        throw new Error("Failed to load notes.");
      }

      const payload = (await response.json()) as { notes?: Note[] };
      if (payload.notes && isMountedRef.current) {
        setNotes(payload.notes);
      }
    } catch (fetchError) {
      if (isMountedRef.current) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to fetch notes."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  return { notes, isLoading, error, reload: fetchNotes };
};
