import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import { Note } from "../types";

export interface UseNotesDataResult {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setSortBy: (sortBy: 'date' | 'activity') => void; 
  sortBy: 'date' | 'activity'; 
}

const fetchNotes = async (
  _key: string,
  viewerKey: string,
  tokenKey: string | null | undefined,
  sortBy: 'date' | 'activity', 
): Promise<Note[]> => {
  const viewerId = viewerKey === "guest" ? null : viewerKey;
  const token = tokenKey && tokenKey.length > 0 ? tokenKey : null;

  const queryParams = new URLSearchParams();
  if (viewerId) {
    queryParams.append("guestId", viewerId);
  }
  if (sortBy && sortBy !== 'date') { 
    queryParams.append("sortBy", sortBy);
  }
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : "";

  const response = await fetch(`/api/notes${query}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("Sign in to view your personalized feed.");
  }

  if (!response.ok) {
    throw new Error("Failed to load notes.");
  }

  const payload = (await response.json()) as { notes?: Note[] };
  return Array.isArray(payload.notes) ? payload.notes : [];
};

export const useNotesData = (
  viewerId: string | null,
  token: string | null,
): UseNotesDataResult => {
  const [sortBy, setSortBy] = useState<'date' | 'activity'>('date'); 
  
  const swrKey = useMemo(
    () => ["notes", viewerId ?? "guest", token ?? "", sortBy], 
    [viewerId, token, sortBy],
  );

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Note[]>(swrKey, ([_key, viewerKey, tokenKey, sortBy]) => 
    fetchNotes(_key, viewerKey, tokenKey, sortBy as 'date' | 'activity'), 
  {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
  });

  const reload = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    notes: data ?? [],
    isLoading: (isLoading || isValidating) && !data,
    error:
      error instanceof Error
        ? error.message
        : error
          ? "Unable to fetch notes."
          : null,
    reload,
    setSortBy,
    sortBy,
  };
};