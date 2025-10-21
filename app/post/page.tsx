"use client";

import React, { useState, ChangeEvent, FormEvent } from 'react';
import NavBar from "../components/NavBar"; 
import { useRouter } from 'next/navigation'; 

const MAX_FILE_SIZE = 20 * 1024 * 1024; 
const MAX_WORD_COUNT = 1000; 
const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
};

export default function CreateNotePage() {
  const router = useRouter(); 

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wordCount = countWords(content);
  
  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const currentWordCount = countWords(newContent);
    setContent(newContent);
    if (currentWordCount > MAX_WORD_COUNT) {
        setError(`Note content exceeds the ${MAX_WORD_COUNT} word limit.`);
    } else {
        setError('');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    
    const newFiles = [...mediaFiles];
    let errorFound = false;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the 20MB limit.`);
        errorFound = true;
        break;
      }

      if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
        setError('Only image or audio files are allowed.');
        errorFound = true;
        break;
      }
      newFiles.push(file);
    }

    if (!errorFound) {
      setMediaFiles(newFiles);
      if (wordCount <= MAX_WORD_COUNT) {
          setError('');
      }
    } else {
      setMediaFiles([]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !content.trim() || wordCount > MAX_WORD_COUNT) return;

    setIsSubmitting(true);
    setError('');

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        
        for (const file of mediaFiles) {
            formData.append('mediaFiles', file);
        }

        const response = await fetch('/api/notes', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            router.push('/'); 
            
            setTitle('');
            setContent('');
            setMediaFiles([]);

        } else {
            setError(result.error || 'An unknown error occurred during submission.');
            alert(`Submission Failed: ${result.error || 'Unknown Error'}`);
        }

    } catch (err) {
        console.error('Submission error:', err);
        setError('Network or server connection failed.');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isButtonDisabled = isSubmitting || !!error || !content.trim() || wordCount === 0 || wordCount > MAX_WORD_COUNT;


  return (
    <div className="p-4 md:p-8 pb-16 flex flex-col items-center">
      
      <header className="mb-8 p-4 bg-white/75 rounded-2xl backdrop-blur-sm shadow-xl w-full max-w-2xl">
        <h1 className="text-4xl font-extrabold text-center text-[#333] tracking-widest">
          Create Anonymous Note
        </h1>
      </header>

      <main className="w-full max-w-2xl bg-white/50 p-6 rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex flex-col">
            <label htmlFor="title" className="text-lg font-semibold text-[#333] mb-2">
              Title (Optional, Max 100 characters)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Do a thought need a title?..."
              maxLength={100}
              className="p-3 rounded-xl border-2 border-[#4a2f88]/50 focus:border-[#4a2f88] focus:outline-none bg-[#f0f0f0dc] text-[#333] placeholder-[#535353] font-sans"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="content" className="text-lg font-semibold text-[#333] mb-2">
              Note
            </label>
            <textarea
              id="content"
              value={content}
              onChange={handleContentChange}
              placeholder="Hmmm....title wasn't enough let's me explain more!"
              required
              rows={8}
              className={`p-3 rounded-xl border-2 ${wordCount > MAX_WORD_COUNT ? 'border-red-500' : 'border-[#4a2f88]/50'} focus:border-[#4a2f88] focus:outline-none bg-[#f0f0f0dc] text-[#333] placeholder-[#535353] resize-y font-sans`}
            />
            <p className={`text-xs text-right mt-1 ${wordCount > MAX_WORD_COUNT ? 'text-red-600 font-bold' : 'text-[#535353]'}`}>
                {wordCount} / {MAX_WORD_COUNT} words
            </p>
          </div>

          <div className="flex flex-col">
            <label className="text-lg font-semibold text-[#333] mb-2">
              Optional Media (Image or Audio, Max 20MB)
            </label>
            <div className="flex items-center">
              <label htmlFor="media" className="cursor-pointer bg-[#4a2f88] text-white px-4 py-2 rounded-lg transition-colors hover:bg-[#3e2773]">
                Choose File
              </label>
              <input
                id="media"
                type="file"
                accept="image/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              {mediaFiles.length > 0 && !error && (
                <div className="ml-4">
                  <p className="text-sm text-[#4a2f88]">Files ready:</p>
                  <ul className="text-sm text-[#4a2f88]">
                    {mediaFiles.map((file, index) => (
                      <li key={index}><strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                    ))}
                  </ul>
                </div>
              )}
              {mediaFiles.length === 0 && (
                <p className="text-sm ml-4 text-[#535353]">No file chosen</p>
              )}
            </div>
            {error && <p className="text-red-600 text-sm mt-2 font-bold">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full p-4 text-xl font-bold rounded-xl transition-colors ${
              isButtonDisabled
                ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                : 'bg-[#4a2f88] hover:bg-[#3e2773] text-white cursor-pointer'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post Anonymously'}
          </button>
        </form>
      </main>

      <NavBar />
    </div>
  );
}