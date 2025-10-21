"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createNote } from "../services/noteService";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
  token: string | null;
  username: string | null;
  displayUsername: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_WORD_COUNT = 1000;

const countWords = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

const CreateNoteModal = ({
  isOpen,
  onClose,
  onCreated,
  token,
  username,
  displayUsername,
}: CreateNoteModalProps) => {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wordCount = useMemo(() => countWords(content), [content]);
  const canPost = Boolean(token);
  const isButtonDisabled =
    isSubmitting ||
    !canPost ||
    !!error ||
    wordCount === 0 ||
    wordCount > MAX_WORD_COUNT ||
    !content.trim();
  const submitLabel =
    canPost
      ? displayUsername && username
        ? `Post as ${username}`
        : "Post Anonymously"
      : "Sign in to post";

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

    if (!token) {
      setError("Sign in to submit a note.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createNote({
        title,
        content,
        mediaFiles,
        token,
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
        className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-modal-bg)]/96 p-6 shadow-[0_40px_100px_var(--color-glow)] backdrop-blur-2xl transition-colors"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="absolute right-4 top-4 text-3xl font-bold text-[color:var(--color-text-accent)] transition-colors hover:text-[color:var(--color-text-primary)]"
          aria-label="Close Note"
        >
          &times;
        </button>

        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-widest text-[color:var(--color-text-primary)]">
            Create Note
          </h1>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text-muted)]">
            {canPost
              ? displayUsername && username
                ? `Posting as ${username}`
                : "Posting anonymously"
              : "Sign in with Google to share across devices."}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col">
            <label
              htmlFor="title"
              className="mb-2 text-lg font-semibold text-[color:var(--color-text-primary)]"
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
              className="rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 font-sans text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-text-accent)] focus:outline-none"
            />
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="content"
              className="mb-2 text-lg font-semibold text-[color:var(--color-text-primary)]"
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
                  : "border-[color:var(--color-divider)]"
              } bg-[color:var(--color-input-bg)] p-3 font-sans text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-text-accent)] focus:outline-none`}
            />
            <p
              className={`mt-1 text-right text-xs ${
                wordCount > MAX_WORD_COUNT
                  ? "font-bold text-red-600"
                  : "text-[color:var(--color-text-muted)]"
              }`}
            >
              {wordCount} / {MAX_WORD_COUNT} words
            </p>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-lg font-semibold text-[color:var(--color-text-primary)]">
              Optional Media (Image or Audio, Max 20MB)
            </label>
            <div className="flex items-center">
              <label
                htmlFor="media"
                className="cursor-pointer rounded-lg bg-[color:var(--color-accent)] px-4 py-2 text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
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
                  <p className="text-sm text-[color:var(--color-text-accent)]">Files ready:</p>
                  <ul className="text-sm text-[color:var(--color-text-accent)]">
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
                <p className="ml-4 text-sm text-[color:var(--color-text-muted)]">No file chosen</p>
              )}
            </div>
            {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full rounded-xl p-4 text-xl font-bold transition-colors ${
              isButtonDisabled
                ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
                : "cursor-pointer bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"
            }`}
          >
            {isSubmitting ? "Posting..." : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;
