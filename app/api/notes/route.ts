import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache'; 
import { Note } from '../../data/Note'; 

const MAX_FILE_SIZE = 5 * 1024 * 1024; 
const MAX_WORD_COUNT = 1000; 

const DATA_FILE_PATH = path.join(process.cwd(), 'app', 'data', 'mockNotes.json');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');

const getMediaExtension = (mimeType: string): string | null => {
    if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) return 'jpg';
    if (mimeType.includes('image/png')) return 'png';
    if (mimeType.includes('audio/mpeg') || mimeType.includes('audio/mp3')) return 'mp3';    
    return null; 
};

const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string || 'Untitled Note'; 
    const content = formData.get('content') as string;
    const mediaFile = formData.get('mediaFile') as File | null; 
    
    const wordCount = countWords(content);

    if (!content || wordCount === 0) {
        return NextResponse.json({ error: 'Note content is required.' }, { status: 400 });
    }
    if (wordCount > MAX_WORD_COUNT) {
        return NextResponse.json({ error: `Note content exceeds the ${MAX_WORD_COUNT} word limit.` }, { status: 400 });
    }

    let mediaPath: string | null = null;
    let newNoteMedia: Note['media'] = null;

    if (mediaFile && mediaFile.size > 0) {
        if (mediaFile.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds the 5MB limit.' }, { status: 400 });
        }
        
        const fileExtension = getMediaExtension(mediaFile.type);
        if (fileExtension === null) {
             return NextResponse.json({ error: 'Invalid media file type or extension. Only JPG, PNG, and MP3 are allowed.' }, { status: 400 });
        }
        
        const fileBuffer = await mediaFile.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);
        
        const fileName = `${nanoid(10)}.${fileExtension}`;
        mediaPath = `/media/${fileName}`;
        
        await fs.mkdir(MEDIA_DIR, { recursive: true });
        // The path.join is safe as fileName is controlled by nanoid and fileExtension by our whitelist
        await fs.writeFile(path.join(MEDIA_DIR, fileName), buffer);
        
        newNoteMedia = mediaFile.type.startsWith('image/') ? 'image' : 'audio';
    }

    let notes: Note[] = [];
    try {
        const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf-8');
        notes = JSON.parse(fileContent) as Note[];
    } catch (readError: any) {
        if (readError.code === 'ENOENT' || readError instanceof SyntaxError) {
            notes = [];
        } else {
            throw readError;
        }
    }
    
    const newNote: Note = {
        id: Date.now() + Math.random(), 
        title: title,
        content: content,
        media: newNoteMedia,
        isFollowing: false, 
        mediaUrl: mediaPath 
    };

    notes.unshift(newNote);
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(notes, null, 2));
    revalidatePath('/');
    return NextResponse.json({ 
        message: 'Note submitted successfully!', 
        noteId: newNote.id,
        mediaUrl: mediaPath
    }, { status: 200 });

  } catch (error) {
    console.error('API Submission Error:', error);
    return NextResponse.json({ error: 'Server failed to process note submission.' }, { status: 500 });
  }
}