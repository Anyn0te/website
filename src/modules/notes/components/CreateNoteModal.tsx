"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createNote } from "../services/noteService";
import { NoteCustomization, MediaEdit } from "../types";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
  token: string | null;
  userId: string;
  username: string | null;
  displayUsername: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_WORD_COUNT = 1000;
const EXIT_DURATION = 220;

const countWords = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

interface ColorPickerGroupProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  presets: Array<{ name: string; value: string }>;
}

const ColorPickerGroup: React.FC<ColorPickerGroupProps> = ({ label, value, onChange, presets }) => (
  <div className="w-full text-left p-4 rounded-xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-card-bg)]">
    <label className="block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-3">
      {label}
    </label>
    <div className="flex items-center gap-3">
      {presets.map((preset) => (
        <button
          key={preset.name}
          type="button"
          title={preset.name}
          onClick={() => onChange(preset.value === value ? null : preset.value)}
          className={`w-8 h-8 rounded-full transition-all ${value === preset.value ? 'ring-2 ring-offset-2 ring-[color:var(--color-text-accent)] ring-offset-[color:var(--color-card-bg)]' : 'ring-1 ring-inset ring-black/10'}`}
          style={{ backgroundColor: preset.value }}
        />
      ))}
      <label
        className="w-10 h-10 rounded-full ml-auto relative cursor-pointer"
        title="Custom color"
      >
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0"
        />
      </label>
    </div>
  </div>
);

const cardBackgroundPresets = [
  { name: "Default", value: "var(--color-modal-bg)" },
  { name: "Off-White", value: "#fcfcfc" },
  { name: "Light Pink", value: "#fff0f5" },
  { name: "Light Blue", value: "#f0f8ff" },
];

const cardColorPresets = [
  { name: "Default", value: "var(--color-app-bg)" },
  { name: "Darker", value: "rgba(0,0,0,0.05)" },
  { name: "Lighter", value: "rgba(255,255,255,0.5)" },
];

const textColorPresets = [
  { name: "Default", value: "var(--color-text-body)" },
  { name: "Primary", value: "var(--color-text-primary)" },
  { name: "Accent", value: "var(--color-text-accent)" },
];

const fontOptions = [
  { name: "Default (Excalifont)", value: "var(--font-excalifont), cursive" },
  { name: "Serif", value: "Georgia, serif" },
  { name: "Monospace", value: "monospace" },
  { name: "Sans Serif", value: "Arial, sans-serif" },
];

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const CreateNoteModal = ({
  isOpen,
  onClose,
  onCreated,
  token,
  userId,
  username,
  displayUsername,
}: CreateNoteModalProps) => {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customization, setCustomization] = useState<NoteCustomization>({
    cardBackground: null,
    cardColor: null,
    textColor: null,
    font: null,
    mediaWidth: null,
    mediaEdits: {},
  });

  const [editingMediaIndex, setEditingMediaIndex] = useState<number | null>(null);
  const [tempEdit, setTempEdit] = useState<MediaEdit>({});
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number>(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [activeTrimHandle, setActiveTrimHandle] = useState<'start' | 'end' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const trimmerRef = useRef<HTMLDivElement>(null);

  const wordCount = useMemo(() => countWords(content), [content]);
  const canPost = Boolean(userId);

  const hasTitle = title.trim().length > 0;
  const hasContent = content.trim().length > 0;
  const hasMedia = mediaFiles.length > 0;
  const isContentMissing = !hasTitle && !hasContent && !hasMedia;

  const activeEditingFile = editingMediaIndex !== null ? mediaFiles[editingMediaIndex] : null;
  const activeObjectUrl = useMemo(() => {
    if (!activeEditingFile) return null;
    return URL.createObjectURL(activeEditingFile);
  }, [activeEditingFile]);

  const isButtonDisabled =
    isSubmitting ||
    !canPost ||
    !!error ||
    isContentMissing ||
    wordCount > MAX_WORD_COUNT;

  const submitLabel =
    displayUsername && username && token
      ? `Post as ${username}`
      : "Post Anonymously";

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setMediaFiles([]);
    setError(null);
    setIsSubmitting(false);
    setIsCustomizing(false);
    setCustomization({
      cardBackground: null,
      cardColor: null,
      textColor: null,
      font: null,
      mediaWidth: null,
      mediaEdits: {},
    });
    setEditingMediaIndex(null);
  }, []);

  const handleOpenMediaEditor = () => {
    if (mediaFiles.length === 0) return;
    setEditingMediaIndex(0);
    const currentEdit = customization.mediaEdits?.["0"] || {};
    setTempEdit(currentEdit);
    setNaturalAspectRatio(1);
    setIsAudioPlaying(false); 
  };

  const handleSaveMediaEdit = () => {
    if (editingMediaIndex === null) return;
    setCustomization((prev) => ({
      ...prev,
      mediaEdits: {
        ...prev.mediaEdits,
        [editingMediaIndex.toString()]: tempEdit,
      },
    }));
    setEditingMediaIndex(null);
  };

  const handleAudioLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const duration = e.currentTarget.duration;
    setAudioDuration(duration);
    if (tempEdit.endTime === undefined || tempEdit.endTime === 0) {
      setTempEdit(prev => ({ ...prev, endTime: duration }));
    }
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const current = e.currentTarget.currentTime;
    setAudioCurrentTime(current);
    const end = tempEdit.endTime || audioDuration;
    const start = tempEdit.startTime || 0;
    if (current >= end) {
      if (isAudioPlaying) {
        e.currentTarget.currentTime = start;
      } else if (current > end + 0.1) {
         e.currentTarget.currentTime = end; 
      }
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      if (audioRef.current.currentTime >= (tempEdit.endTime || audioDuration) || 
          audioRef.current.currentTime < (tempEdit.startTime || 0)) {
        audioRef.current.currentTime = tempEdit.startTime || 0;
      }
      audioRef.current.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  };

  const calculateTrim = useCallback((clientX: number) => {
    if (!trimmerRef.current || !activeTrimHandle) return;

    const rect = trimmerRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = offsetX / rect.width;
    const timeValue = percentage * audioDuration;

    setTempEdit(prev => {
      const currentStart = prev.startTime || 0;
      const currentEnd = prev.endTime || audioDuration;
      
      if (activeTrimHandle === 'start') {
        const newStart = Math.min(timeValue, currentEnd - 1);
        if (audioRef.current && Math.abs(audioRef.current.currentTime - newStart) > 0.5) {
           audioRef.current.currentTime = newStart;
        }
        return { ...prev, startTime: newStart };
      } else {
        const newEnd = Math.max(timeValue, currentStart + 1);
        if (audioRef.current && Math.abs(audioRef.current.currentTime - (newEnd - 2)) > 1) {
            if (!isAudioPlaying) {
                audioRef.current.currentTime = Math.max(currentStart, newEnd - 2);
            }
        }
        return { ...prev, endTime: newEnd };
      }
    });
  }, [activeTrimHandle, audioDuration, isAudioPlaying]);

  const handleTrimStart = (e: React.MouseEvent | React.TouchEvent, handle: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setActiveTrimHandle(handle);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const ratio = naturalWidth / naturalHeight;
    setNaturalAspectRatio(ratio);
    if (!tempEdit.orientation) {
      setTempEdit(prev => ({ ...prev, orientation: ratio >= 1 ? 'landscape' : 'portrait' }));
    }
  };

  const handleToggleOrientation = () => {
    setTempEdit(prev => {
      const current = prev.orientation || (naturalAspectRatio >= 1 ? 'landscape' : 'portrait');
      return { ...prev, orientation: current === 'landscape' ? 'portrait' : 'landscape' };
    });
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startPanRef.current = { x: tempEdit.panX || 0, y: tempEdit.panY || 0 };
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setTempEdit(prev => ({ ...prev, panX: startPanRef.current.x + dx, panY: startPanRef.current.y + dy }));
  };

  const handleImageMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    startPanRef.current = { x: tempEdit.panX || 0, y: tempEdit.panY || 0 };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    setTempEdit(prev => ({
      ...prev,
      panX: startPanRef.current.x + dx,
      panY: startPanRef.current.y + dy
    }));
  };

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveTrimHandle(null);
  }, []);

  const [renderModal, setRenderModal] = useState(isOpen);
  const [transitionState, setTransitionState] = useState<"closed" | "opening" | "open" | "closing">(
    isOpen ? "open" : "closed",
  );

  useEffect(() => {
    if (isOpen) {
      setRenderModal(true);
      setTransitionState("opening");
      const raf = window.requestAnimationFrame(() => setTransitionState("open"));
      return () => window.cancelAnimationFrame(raf);
    } else {
      setTransitionState("closing");
      const timeout = window.setTimeout(() => {
        setRenderModal(false);
        setTransitionState("closed");
      }, EXIT_DURATION);
      return () => window.clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    if (transitionState !== "open" && transitionState !== "opening") return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { resetForm(); onClose(); }
    };
    document.addEventListener("keydown", handleEscape);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("modal-open");
    };
  }, [transitionState, onClose, resetForm]);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
         if (activeTrimHandle) {
            const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
            calculateTrim(clientX);
         } else {
            if ('touches' in e) return; 
            const me = e as MouseEvent;
            const dx = me.clientX - dragStartRef.current.x;
            const dy = me.clientY - dragStartRef.current.y;
            setTempEdit(prev => ({ ...prev, panX: startPanRef.current.x + dx, panY: startPanRef.current.y + dy }));
         }
      };

      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalMove);
      
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('touchend', handleGlobalMouseUp);
        window.removeEventListener('touchmove', handleGlobalMove);
      }
    }
  }, [isDragging, activeTrimHandle, audioDuration, handleGlobalMouseUp, calculateTrim]);

  if (!renderModal) return null;

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
    if (error) setError(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (files.length === 0) return;
    const nextFiles: File[] = [...mediaFiles];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { setError(`File size exceeds 20MB limit.`); return; }
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      if (isImage) {
        const idx = nextFiles.findIndex(f => f.type.startsWith("image/"));
        if (idx >= 0) nextFiles.splice(idx, 1);
      }
      if (isAudio) {
        const idx = nextFiles.findIndex(f => f.type.startsWith("audio/"));
        if (idx >= 0) nextFiles.splice(idx, 1);
      }
      nextFiles.push(file);
    }
    setMediaFiles(nextFiles);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isButtonDisabled) return;
    setIsSubmitting(true);
    try {
      await createNote({ title, content, mediaFiles, token, userId, customization });
      resetForm(); onClose(); await onCreated?.(); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to submit note."); } 
    finally { setIsSubmitting(false); }
  };

  const previewCardStyle: React.CSSProperties = { backgroundColor: customization.cardBackground || "var(--color-card-bg)" };
  const previewBodyStyle: React.CSSProperties = { backgroundColor: customization.cardColor || "var(--color-button-muted-bg)", padding: '0.75rem', borderRadius: '0.75rem' };
  const previewTextStyle: React.CSSProperties = { color: customization.textColor || "var(--color-text-body)", fontFamily: customization.font || "var(--font-excalifont), cursive" };
  const previewTitleStyle: React.CSSProperties = { ...previewTextStyle, color: customization.textColor || "var(--color-text-primary)" };

  const renderMediaEditor = () => {
    if (editingMediaIndex === null || !activeObjectUrl) return null;
    const file = mediaFiles[editingMediaIndex];
    if (!file) return null;

    const isImage = file.type.startsWith("image/");
    
    const currentOrientation = tempEdit.orientation || (naturalAspectRatio >= 1 ? 'landscape' : 'portrait');
    const isLandscape = currentOrientation === 'landscape';
    const frameAspectRatio = isLandscape ? 4/3 : 3/4;

    const startVal = tempEdit.startTime || 0;
    const endVal = tempEdit.endTime || audioDuration;
    const startPct = audioDuration > 0 ? (startVal / audioDuration) * 100 : 0;
    const endPct = audioDuration > 0 ? (endVal / audioDuration) * 100 : 100;
    const currentPct = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;

    return (
      <div className="absolute inset-0 z-[60] flex flex-col bg-[color:var(--color-modal-bg)] rounded-3xl p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[color:var(--color-text-primary)]">Adjust Media</h3>
          <button onClick={() => setEditingMediaIndex(null)} className="text-2xl text-[color:var(--color-text-primary)]">&times;</button>
        </div>
        
        <div className="flex-grow flex flex-col items-center justify-center overflow-hidden bg-black/95 rounded-xl relative select-none">
          {isImage ? (
            <>
              <div className="absolute top-4 left-4 z-10 flex gap-2"><div className="text-xs bg-black/50 text-white px-2 py-1 rounded backdrop-blur-md">Click & Drag to Pan</div></div>
              <button type="button" onClick={handleToggleOrientation} className="absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95" title="Rotate Frame"><i className={`bi bi-phone text-lg transition-transform duration-300 ${isLandscape ? 'rotate-90' : ''}`} /></button>
              <div className="relative overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing bg-black border border-white/10" style={{ aspectRatio: frameAspectRatio, height: '100%', maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} onMouseDown={handleImageMouseDown} onMouseMove={handleImageMouseMove} onMouseUp={handleGlobalMouseUp} onMouseLeave={handleGlobalMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleGlobalMouseUp}>
                <Image src={activeObjectUrl} alt="Preview" draggable={false} onLoad={handleImageLoad} className="w-full h-full object-contain transition-transform duration-75 origin-center select-none" style={{ transform: `scale(${tempEdit.zoom || 1}) translate(${tempEdit.panX || 0}px, ${tempEdit.panY || 0}px)` }} unoptimized fill />
              </div>
            </>
          ) : (
            <div className="w-full flex flex-col items-center p-8">
              <div className="text-6xl mb-4 animate-bounce">🎵</div>
              <p className="mb-6 font-semibold text-white text-lg">{file.name}</p>
              <audio 
                ref={audioRef} 
                src={activeObjectUrl} 
                onLoadedMetadata={handleAudioLoadedMetadata}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={() => setIsAudioPlaying(false)}
                className="hidden" 
              />
              <button onClick={toggleAudioPlay} className="h-16 w-16 rounded-full bg-[color:var(--color-accent)] text-white flex items-center justify-center text-2xl shadow-lg hover:scale-105 transition-transform">
                <i className={`bi bi-${isAudioPlaying ? 'pause-fill' : 'play-fill'}`} />
              </button>
              <div className="mt-4 text-white/70 font-mono text-sm">
                {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {isImage ? (
            <div>
              <label className="text-xs font-bold uppercase text-[color:var(--color-text-muted)]">Zoom: {tempEdit.zoom || 1}x</label>
              <input type="range" min="0.5" max="10" step="0.1" value={tempEdit.zoom || 1} onChange={(e) => setTempEdit(p => ({ ...p, zoom: parseFloat(e.target.value) }))} className="w-full mt-2 accent-[color:var(--color-accent)]" />
            </div>
          ) : (
            <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold uppercase text-[color:var(--color-text-muted)]">
                  <span>Start: {formatTime(startVal)}</span>
                  <span>End: {formatTime(endVal)}</span>
               </div>
               
               <div 
                  ref={trimmerRef}
                  className="relative w-full h-14 bg-[color:var(--color-input-bg)] rounded-xl overflow-hidden cursor-pointer touch-none select-none border border-[color:var(--color-divider)]"
               >
                  <div className="absolute inset-0 flex items-center justify-center gap-[2px] opacity-20 pointer-events-none">
                     {Array.from({length: 40}).map((_, i) => (
                        <div key={i} className="w-1 bg-[color:var(--color-text-primary)] rounded-full" style={{ height: `${20 + Math.random() * 60}%` }} />
                     ))}
                  </div>

                  <div className="absolute top-0 bottom-0 left-0 bg-black/60 z-10 pointer-events-none" style={{ width: `${startPct}%` }} />
                  <div className="absolute top-0 bottom-0 right-0 bg-black/60 z-10 pointer-events-none" style={{ width: `${100 - endPct}%` }} />

                  <div className="absolute top-0 bottom-0 border-y-2 border-[color:var(--color-accent)] z-10 pointer-events-none" style={{ left: `${startPct}%`, right: `${100 - endPct}%` }} />

                  {isAudioPlaying && (<div className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_10px_white] pointer-events-none" style={{ left: `${currentPct}%` }} />)}

                  <div 
                    className="absolute top-0 bottom-0 w-6 bg-[color:var(--color-accent)] z-30 flex items-center justify-center cursor-ew-resize hover:brightness-110 active:scale-110 transition-transform rounded-l-sm"
                    style={{ left: `calc(${startPct}% - 12px)` }}
                    onMouseDown={(e) => handleTrimStart(e, 'start')}
                    onTouchStart={(e) => handleTrimStart(e, 'start')}
                  >
                     <i className="bi bi-grip-vertical text-white text-xs" />
                  </div>

                  <div 
                    className="absolute top-0 bottom-0 w-6 bg-[color:var(--color-accent)] z-30 flex items-center justify-center cursor-ew-resize hover:brightness-110 active:scale-110 transition-transform rounded-r-sm"
                    style={{ left: `calc(${endPct}% - 12px)` }}
                    onMouseDown={(e) => handleTrimStart(e, 'end')}
                    onTouchStart={(e) => handleTrimStart(e, 'end')}
                  >
                     <i className="bi bi-grip-vertical text-white text-xs" />
                  </div>
               </div>
               
               <p className="text-center text-xs text-[color:var(--color-text-muted)] mt-2">
                  Drag the handles to trim the audio.
               </p>
            </div>
          )}
        </div>

        <button onClick={handleSaveMediaEdit} className="mt-6 w-full bg-[color:var(--color-accent)] text-white p-3 rounded-xl font-bold hover:bg-[color:var(--color-accent-hover)] transition-colors">Save Adjustments</button>
      </div>
    );
  };

  return (
    <div className="modal-layer fixed inset-0 z-50 flex items-center justify-center p-4" data-state={transitionState}>
      <div className="modal-backdrop absolute inset-0 h-full w-full bg-black/60" data-state={transitionState} onClick={() => { resetForm(); onClose(); }} />
      <div className="modal-surface relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-modal-bg)] p-6 shadow-[0_16px_32px_var(--color-glow)] transition-colors" data-state={transitionState} onClick={(event) => event.stopPropagation()}>
        <button onClick={() => { resetForm(); onClose(); }} className="absolute right-4 top-4 text-3xl font-bold text-[color:var(--color-text-accent)] transition-colors hover:text-[color:var(--color-text-primary)]" aria-label="Close Note">&times;</button>
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-widest text-[color:var(--color-text-primary)]">{isCustomizing ? "Customize Note" : "Create Note"}</h1>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text-muted)]">{displayUsername && username && token ? `Posting as ${username}` : "Posting anonymously"}</p>
        </header>

        {isCustomizing ? (
          <div className="space-y-6 relative">
            {editingMediaIndex !== null && renderMediaEditor()}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-dashed border-[color:var(--color-divider)] rounded-xl space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-muted)]">Preview</p>
                <div className="p-5 rounded-3xl border border-[color:var(--color-card-border)] shadow-sm" style={previewCardStyle}>
                  <div className="flex items-center justify-between text-[color:var(--color-text-muted)] mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-accent)]">{displayUsername && username ? `@${username}` : "Anonymous"}</span>
                    <span className="rounded-full bg-[color:var(--color-chip-bg)] px-2 py-0.5 text-[0.7rem] font-semibold text-[color:var(--color-chip-text)]">You</span>
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-wide mb-3" style={previewTitleStyle}>{title || "Untitled Note"}</h3>
                  <div style={previewBodyStyle}><p className="text-sm leading-relaxed" style={previewTextStyle}>{content || "Your note content will appear here..."}</p></div>
                </div>
              </div>
              <div className="space-y-4">
                <ColorPickerGroup label="Card Background" value={customization.cardBackground} onChange={(val) => setCustomization(p => ({ ...p, cardBackground: val }))} presets={cardBackgroundPresets} />
                <ColorPickerGroup label="Card Body Color" value={customization.cardColor} onChange={(val) => setCustomization(p => ({ ...p, cardColor: val }))} presets={cardColorPresets} />
                <ColorPickerGroup label="Text Color" value={customization.textColor} onChange={(val) => setCustomization(p => ({ ...p, textColor: val }))} presets={textColorPresets} />
                <div className="w-full text-left p-4 rounded-xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-card-bg)]">
                  <label htmlFor="font-select" className="block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-2">Text Font</label>
                  <select id="font-select" value={customization.font || ""} onChange={(e) => setCustomization(p => ({ ...p, font: e.target.value || null }))} className="w-full border-none bg-transparent p-0 text-base text-[color:var(--color-text-primary)] focus:outline-none focus:ring-0 cursor-pointer">
                    {fontOptions.map(opt => (<option key={opt.name} value={opt.value} style={{ fontFamily: opt.value, color: 'var(--color-text-primary)', backgroundColor: 'var(--color-modal-bg)' }}>{opt.name}</option>))}
                  </select>
                </div>
                <button type="button" className={`w-full text-left p-4 rounded-xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-card-bg)] transition-colors ${mediaFiles.length > 0 ? 'hover:border-[color:var(--color-text-accent)]' : 'opacity-50 cursor-not-allowed'}`} disabled={mediaFiles.length === 0} onClick={handleOpenMediaEditor}>
                  <span className="font-bold text-[color:var(--color-text-primary)]">Adjust Media (Crop/Trim)</span>
                  <span className="block text-xs text-[color:var(--color-text-muted)] mt-1">{mediaFiles.length > 0 ? `Edit ${mediaFiles[0].name}` : "Upload media to enable"}</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <button type="button" onClick={() => setCustomization({ cardBackground: null, cardColor: null, textColor: null, font: null, mediaWidth: null, mediaEdits: {} })} className="w-full rounded-xl p-3 text-base font-bold transition-colors border border-[color:var(--color-divider)] text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-button-muted-bg)]">Reset to default</button>
              <button type="button" onClick={() => setIsCustomizing(false)} className="w-full rounded-xl p-3 text-base font-bold transition-colors bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col"><label htmlFor="title" className="mb-2 text-lg font-semibold text-[color:var(--color-text-primary)]">Title (Optional, Max 100 characters)</label><input id="title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Do a thought need a title?..." maxLength={100} className="rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 font-sans text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-text-accent)] focus:outline-none" /></div>
            <div className="flex flex-col"><label htmlFor="content" className="mb-2 text-lg font-semibold text-[color:var(--color-text-primary)]">Note</label><textarea id="content" value={content} onChange={handleContentChange} placeholder="Hmmm....title wasn't enough let's me explain more!" rows={8} className={`rounded-xl border-2 ${wordCount > MAX_WORD_COUNT ? "border-red-500" : "border-[color:var(--color-divider)]"} bg-[color:var(--color-input-bg)] p-3 font-sans text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-text-accent)] focus:outline-none`} /><p className={`mt-1 text-right text-xs ${wordCount > MAX_WORD_COUNT ? "font-bold text-red-600" : "text-[color:var(--color-text-muted)]"}`}>{wordCount} / {MAX_WORD_COUNT} words</p></div>
            <div className="flex flex-col"><label className="mb-2 text-lg font-semibold text-[color:var(--color-text-primary)]">Optional Media (Up to 1 image and 1 audio, max 20MB each)</label><div className="flex items-center"><label htmlFor="media" className="cursor-pointer rounded-lg bg-[color:var(--color-accent)] px-4 py-2 text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)]">Choose File</label><input id="media" type="file" accept="image/*,audio/*" onChange={handleFileChange} className="hidden" />{mediaFiles.length > 0 && !error && (<div className="ml-4"><p className="text-sm text-[color:var(--color-text-accent)]">Files ready:</p><ul className="text-sm text-[color:var(--color-text-accent)]">{mediaFiles.map((file, index) => (<li key={index}><strong>{file.name}</strong>{file.type.startsWith("image/") ? " (Image" : " (Audio"}{`, ${(file.size / 1024 / 1024).toFixed(2)} MB)`}</li>))}</ul></div>)}{mediaFiles.length === 0 && (<p className="ml-4 text-sm text-[color:var(--color-text-muted)]">No file chosen</p>)}</div>{error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}</div>
            <div className="flex items-center gap-3"><button type="submit" disabled={isButtonDisabled} className={`flex-grow rounded-xl p-4 text-xl font-bold transition-colors ${isButtonDisabled ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]" : "cursor-pointer bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"}`}>{isSubmitting ? "Posting..." : submitLabel}</button><button type="button" onClick={() => setIsCustomizing(true)} className="flex-shrink-0 h-14 w-14 rounded-full border border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-xl text-[color:var(--color-text-accent)] transition-colors hover:border-[color:var(--color-text-accent)] hover:bg-[color:var(--color-panel-hover-bg)]" aria-label="Customize note"><i className="bi bi-pencil" /></button></div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateNoteModal;