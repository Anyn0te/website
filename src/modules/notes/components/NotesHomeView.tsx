"use client";

import { useMemo, useState } from "react";
import BottomNav from "@/components/navigation/BottomNav";
import { useNotesData } from "../hooks/useNotesData";
import NoteSection from "./NoteSection";
import CreateNoteModal from "./CreateNoteModal";

const NotesHomeView = () => {
  const { notes, isLoading, error, reload } = useNotesData();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { followingNotes, globalNotes } = useMemo(() => {
    const following = notes.filter((note) => note.isFollowing);
    const global = notes.filter((note) => !note.isFollowing);

    return {
      followingNotes: following,
      globalNotes: global,
    };
  }, [notes]);

  return (
    <div className="p-8 pb-32">
      <header className="mb-8 rounded-2xl bg-white/75 p-4 backdrop-blur-sm">
        <h1 className="text-center text-3xl font-bold text-[#333]">Anyn0te</h1>
      </header>

      <main className="space-y-12">
        {isLoading && (
          <section className="rounded-2xl bg-white/75 p-6 text-center text-[#333] shadow-xl">
            Loading notes...
          </section>
        )}

        {error && !isLoading && (
          <section className="rounded-2xl bg-red-100 p-6 text-center text-[#7f1d1d] shadow-xl">
            {error}
          </section>
        )}

        {!isLoading && !error && notes.length === 0 && (
          <section className="rounded-2xl bg-white/75 p-6 text-center text-[#333] shadow-xl">
            No notes available yet. Be the first to post!
          </section>
        )}

        {!isLoading && !error && notes.length > 0 && (
          <>
            <NoteSection title="Adminotes" notes={followingNotes} />
            <NoteSection title="Global Notes" notes={globalNotes} />
          </>
        )}
      </main>

      <BottomNav onOpenCreateModal={() => setIsCreateModalOpen(true)} />
      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={reload}
      />
    </div>
  );
};

export default NotesHomeView;
