"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createNote } from "../services/noteService";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_WORD_COUNT = 1000;

const countWords = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

const CreateNoteModal = ({ isOpen, onClose, onCreated }: CreateNoteModalProps) => {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wordCount = useMemo(() => countWords(content), [content]);
  const isButtonDisabled =
    isSubmitting ||
    !!error ||
    wordCount === 0 ||
    wordCount > MAX_WORD_COUNT ||
    !content.trim();

  const resetForm = () => {
    setTitle("");
    setContent("");
    setMediaFiles([]);
    setError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("modal-open");
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setContent(newContent);

    const currentWordCount = countWords(newContent);
    if (currentWordCount > MAX_WORD_COUNT) {
      setError(`Note content exceeds the ${MAX_WORD_COUNT} word limit.`);
    } else if (error) {
      setError(null);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";

    const nextFiles: File[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File size (${(file.size / 1024 / 1024).toFixed(
            2
          )} MB) exceeds the 20MB limit.`
        );
        return;
      }

      if (!file.type.startsWith("image/") && !file.type.startsWith("audio/")) {
        setError("Only image or audio files are allowed.");
        return;
      }

      nextFiles.push(file);
    }

    setMediaFiles((previous) => [...previous, ...nextFiles]);
    if (wordCount <= MAX_WORD_COUNT) {
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isButtonDisabled) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createNote({
        title,
        content,
        mediaFiles,
      });

      resetForm();
      onClose();
      await onCreated?.();
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit note."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
        onClick={() => {
          resetForm();
          onClose();
        }}
      />

      <div
        className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/95 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="absolute right-4 top-4 text-3xl font-bold text-[#4a2f88] transition-colors hover:text-[#333]"
          aria-label="Close Note"
        >
          &times;
        </button>

        <h1 className="mb-8 text-center text-4xl font-extrabold tracking-widest text-[#333]">
          Create Anonymous Note
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col">
            <label
              htmlFor="title"
              className="mb-2 text-lg font-semibold text-[#333]"
            >
              Title (Optional, Max 100 characters)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Do a thought need a title?..."
              maxLength={100}
              className="rounded-xl border-2 border-[#4a2f88]/50 bg-[#f0f0f0dc] p-3 font-sans text-[#333] placeholder-[#535353] focus:border-[#4a2f88] focus:outline-none"
            />
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="content"
              className="mb-2 text-lg font-semibold text-[#333]"
            >
              Note
            </label>
            <textarea
              id="content"
              value={content}
              onChange={handleContentChange}
              placeholder="Hmmm....title wasn't enough let's me explain more!"
              required
              rows={8}
              className={`rounded-xl border-2 ${
                wordCount > MAX_WORD_COUNT
                  ? "border-red-500"
                  : "border-[#4a2f88]/50"
              } bg-[#f0f0f0dc] p-3 font-sans text-[#333] placeholder-[#535353] focus:border-[#4a2f88] focus:outline-none`}
            />
            <p
              className={`mt-1 text-right text-xs ${
                wordCount > MAX_WORD_COUNT
                  ? "font-bold text-red-600"
                  : "text-[#535353]"
              }`}
            >
              {wordCount} / {MAX_WORD_COUNT} words
            </p>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-lg font-semibold text-[#333]">
              Optional Media (Image or Audio, Max 20MB)
            </label>
            <div className="flex items-center">
              <label
                htmlFor="media"
                className="cursor-pointer rounded-lg bg-[#4a2f88] px-4 py-2 text-white transition-colors hover:bg-[#3e2773]"
              >
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
                      <li key={index}>
                        <strong>{file.name}</strong> (
                        {(file.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {mediaFiles.length === 0 && (
                <p className="ml-4 text-sm text-[#535353]">No file chosen</p>
              )}
            </div>
            {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full rounded-xl p-4 text-xl font-bold transition-colors ${
              isButtonDisabled
                ? "cursor-not-allowed bg-gray-400 text-gray-700"
                : "cursor-pointer bg-[#4a2f88] text-white hover:bg-[#3e2773]"
            }`}
          >
            {isSubmitting ? "Posting..." : "Post Anonymously"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;
