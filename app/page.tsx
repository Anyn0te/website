import NavBar from "./components/NavBar";
import NoteSection from "./components/NoteSection";
import mockNotesData from "./data/mockNotes.json";
import { Note } from "./data/Note";

const mockNotes: Note[] = mockNotesData as Note[];

export default function Home() {
  const followingNotes = mockNotes.filter(note => note.isFollowing);
  const newPeopleNotes = mockNotes.filter(note => !note.isFollowing);

  return (
    <div className="p-8 pb-32">
      
      <header className="mb-8 p-4 bg-white/75 rounded-2xl backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-center text-[#333]">Anyn0te</h1>
      </header>

      <main className="space-y-12">
        <NoteSection 
          title="Adminotes" 
          notes={followingNotes} 
        />
        
        <NoteSection 
          title="Global Notes" 
          notes={newPeopleNotes} 
        />
      </main>

      <NavBar />
    </div>
  );
}