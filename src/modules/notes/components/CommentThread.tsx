"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { NoteComment } from "../types";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export interface CommentSubmitPayload {
  content: string;
  isPrivate: boolean;
  participantUserId?: string | null;
  replyToCommentId?: string | null;
}

export interface CommentUpdatePayload {
  content: string;
}

interface CommentThreadProps {
  comments: NoteComment[];
  viewerId: string | null;
  viewerDisplayName: string | null;
  noteAuthorId: string;
  noteCommentsLocked: boolean;
  publicCommentCount: number;
  createActionPending: boolean;
  lockActionPending: boolean;
  isEditPending?: (commentId: string) => boolean;
  isDeletePending?: (commentId: string) => boolean;
  onSubmitComment?: (payload: CommentSubmitPayload) => Promise<void> | void;
  onToggleCommentsLock?: (locked: boolean) => Promise<void> | void;
  onEditComment?: (commentId: string, payload: CommentUpdatePayload) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
}

interface ThreadNode {
  comment: NoteComment;
  safeContent: string;
  children: ThreadNode[];
}

interface SelectedTarget {
  commentId: string | null;
  userId: string;
  label: string;
}

const CommentThread = ({
  comments,
  viewerId,
  viewerDisplayName,
  noteAuthorId,
  noteCommentsLocked,
  publicCommentCount,
  createActionPending,
  lockActionPending,
  isEditPending,
  isDeletePending,
  onSubmitComment,
  onToggleCommentsLock,
  onEditComment,
  onDeleteComment,
}: CommentThreadProps) => {
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const viewerIsOwner = viewerId === noteAuthorId;
  const canComment = !noteCommentsLocked;

  const { roots, lookup } = useMemo(() => {
    const map = new Map<string, ThreadNode>();
    const rootNodes: ThreadNode[] = [];

    for (const comment of comments) {
      map.set(comment.id, {
        comment,
        safeContent: sanitizeHtml(
          comment.isVisibleToViewer
            ? comment.content ?? ""
            : "Encrypted inbox message between participants.",
        ),
        children: [],
      });
    }

    for (const node of map.values()) {
      const parentId = node.comment.replyToCommentId;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    const sortNodes = (nodes: ThreadNode[]) => {
      nodes.sort(
        (a, b) =>
          new Date(a.comment.createdAt).getTime() - new Date(b.comment.createdAt).getTime(),
      );
      nodes.forEach((node) => sortNodes(node.children));
    };

    sortNodes(rootNodes);

    return { roots: rootNodes, lookup: map };
  }, [comments]);

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  };

  const handlePrivateToggle = (checked: boolean) => {
    setIsPrivate(checked);
    setError(null);
  };

  const handleClearTarget = () => {
    setSelectedTarget(null);
    setIsPrivate(false);
  };

  const handleSelectReply = (comment: NoteComment) => {
    const label = comment.authorName ? `@${comment.authorName}` : "Anonymous";
    const isSame =
      selectedTarget?.commentId === comment.id &&
      selectedTarget?.userId === comment.authorId &&
      !isPrivate;

    if (isSame) {
      handleClearTarget();
      return;
    }

    setSelectedTarget({ commentId: comment.id, userId: comment.authorId, label });
    setIsPrivate(false);
    setError(null);
  };

  const handleSelectMyThought = (comment: NoteComment) => {
    const targetUserId = viewerIsOwner ? comment.authorId : noteAuthorId;
    const label = viewerIsOwner
      ? comment.authorName
        ? `@${comment.authorName}`
        : "Anonymous"
      : "note owner";

    const isSame =
      selectedTarget?.commentId === comment.id &&
      selectedTarget?.userId === targetUserId &&
      isPrivate;

    if (isSame) {
      handleClearTarget();
      return;
    }

    setSelectedTarget({ commentId: comment.id, userId: targetUserId, label });
    setIsPrivate(true);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onSubmitComment) {
      return;
    }

    if (!viewerId) {
      setError("Sign in or continue as guest to share your thoughts.");
      return;
    }

    if (!canComment) {
      setError("Thoughts are currently locked for this note.");
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      setError("Please share a thought before posting.");
      return;
    }

    const replyToCommentId = selectedTarget?.commentId ?? null;
    let participantUserId: string | null = null;

    if (isPrivate) {
      if (!selectedTarget) {
        const targetId = viewerIsOwner ? null : noteAuthorId;
        if (!targetId) {
          setError("Choose who should receive this encrypted message.");
          return;
        }
        participantUserId = targetId;
      } else {
        participantUserId = selectedTarget.userId;
      }
    }

    try {
      setError(null);
      await onSubmitComment({
        content: trimmed,
        isPrivate,
        participantUserId,
        replyToCommentId,
      });
      setContent("");
      setIsPrivate(false);
      setSelectedTarget(null);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit your thought.",
      );
    }
  };

  const startEditing = (commentId: string, currentContent: string | null) => {
    if (!currentContent) {
      setEditingId(null);
      setEditingContent("");
      return;
    }
    setEditingId(commentId);
    setEditingContent(currentContent);
    setError(null);
  };

  const handleEditSubmit = async (commentId: string) => {
    if (!onEditComment) {
      return;
    }

    const trimmed = editingContent.trim();
    if (!trimmed) {
      setError("Edited thought cannot be empty.");
      return;
    }

    try {
      await onEditComment(commentId, { content: trimmed });
      setEditingId(null);
      setEditingContent("");
    } catch (editError) {
      setError(
        editError instanceof Error
          ? editError.message
          : "Unable to update your thought.",
      );
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!onDeleteComment) {
      return;
    }

    try {
      await onDeleteComment(commentId);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete your thought.",
      );
    }
  };

  const renderComposer = () => (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[color:var(--color-text-primary)]">
          Share your thoughts
        </label>
        {viewerDisplayName && (
          <span className="text-xs text-[color:var(--color-text-muted)]">
            Posting as {viewerDisplayName}
          </span>
        )}
      </div>
      <textarea
        value={content}
        onChange={handleContentChange}
        disabled={createActionPending}
        rows={3}
        className="w-full resize-none rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-sm text-[color:var(--color-text-primary)] focus:border-[color:var(--color-text-accent)] focus:outline-none"
        placeholder={
          isPrivate
            ? "Write your encrypted thought..."
            : "Write your thought..."
        }
      />

      {viewerIsOwner ? (
        <div className="rounded-xl border border-dashed border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] p-3 text-xs text-[color:var(--color-text-muted)]">
          {selectedTarget ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {isPrivate
                  ? `My Thought encrypted for ${selectedTarget.label}.`
                  : `Replying to ${selectedTarget.label}.`}
              </span>
              <button
                type="button"
                className="text-[color:var(--color-text-accent)] hover:underline"
                onClick={handleClearTarget}
              >
                Clear
              </button>
            </div>
          ) : (
            <p>Select Reply for a public response or My Thought for an encrypted inbox conversation.</p>
          )}
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => handlePrivateToggle(event.target.checked)}
              disabled={!selectedTarget || createActionPending}
              className="h-4 w-4 rounded border-[color:var(--color-panel-border)]"
            />
            <span>Encrypt this thought for the selected participant only.</span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-xs text-[color:var(--color-text-muted)]">
          {selectedTarget && (
            <span>
              {isPrivate
                ? "Sharing an encrypted My Thought with the note owner."
                : `Replying to ${selectedTarget.label}.`}
            </span>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => handlePrivateToggle(event.target.checked)}
              disabled={createActionPending}
              className="h-4 w-4 rounded border-[color:var(--color-panel-border)]"
            />
            <span>Share as “My Thought” (encrypted for the note owner)</span>
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={createActionPending}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
            createActionPending
              ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
              : "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"
          }`}
        >
          {createActionPending ? "Posting..." : "Post thought"}
        </button>
      </div>
    </form>
  );

  const renderComment = (node: ThreadNode, depth: number) => {
    const { comment, safeContent } = node;
    const isEditing = comment.id === editingId;
    const editPending = isEditPending?.(comment.id) ?? false;
    const deletePending = isDeletePending?.(comment.id) ?? false;
    const parentLabel = comment.replyToCommentId
      ? lookup.get(comment.replyToCommentId)?.comment.authorName
      : null;
    const isReply = depth > 0;
    const isReplySelected = !isPrivate && selectedTarget?.commentId === comment.id;
    const isMyThoughtSelected = isPrivate && selectedTarget?.commentId === comment.id;

    return (
      <li key={comment.id} className="relative space-y-2">
        {isReply && (
          <span
            className="absolute left-2 top-0 h-full w-0.5 bg-[color:var(--color-card-border)]"
            aria-hidden="true"
          />
        )}
        <div
          className={`rounded-xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-4 ${
            isReply ? "ml-6" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                {comment.authorName ? `@${comment.authorName}` : "Anonymous"}
              </span>
              {parentLabel && (
                <span className="text-xs text-[color:var(--color-text-muted)]">
                  Replying to @{parentLabel}
                </span>
              )}
              {comment.isPrivate && (
                <span className="rounded-full bg-[color:var(--color-chip-bg)] px-2 py-0.5 text-[0.65rem] font-semibold text-[color:var(--color-chip-text)]">
                  Inbox
                </span>
              )}
              {!comment.isVisibleToViewer && (
                <span className="rounded-full bg-[color:var(--color-button-muted-bg)] px-2 py-0.5 text-[0.65rem] font-semibold text-[color:var(--color-text-muted)]">
                  Encrypted
                </span>
              )}
            </div>
            <span className="text-xs text-[color:var(--color-text-muted)]">
              {new Date(comment.createdAt).toLocaleString()}
              {comment.updatedAt !== comment.createdAt && " · edited"}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={editingContent}
                onChange={(event) => setEditingContent(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-sm text-[color:var(--color-text-primary)] focus:border-[color:var(--color-text-accent)] focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditingContent("");
                  }}
                  className="rounded-full border border-[color:var(--color-panel-border)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text-muted)] hover:border-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleEditSubmit(comment.id)}
                  disabled={editPending}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    editPending
                      ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
                      : "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"
                  }`}
                >
                  {editPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`mt-2 text-sm ${
                comment.isVisibleToViewer
                  ? "text-[color:var(--color-text-body)]"
                  : "italic text-[color:var(--color-text-muted)]"
              }`}
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(comment.isEditableByViewer || comment.authorId === viewerId) && !isEditing && (
              <button
                type="button"
                onClick={() => startEditing(comment.id, comment.content)}
                className={`inline-flex items-center gap-1 text-xs text-[color:var(--color-text-accent)] hover:underline ${
                  editPending ? "opacity-70" : ""
                }`}
                disabled={editPending}
              >
                <span aria-hidden="true">✏️</span>
                <span>{editPending ? "Saving..." : "Edit"}</span>
              </button>
            )}

            {(comment.isEditableByViewer || comment.authorId === viewerId) && (
              <button
                type="button"
                onClick={() => void handleDelete(comment.id)}
                className={`inline-flex items-center gap-1 text-xs text-red-500 hover:underline ${
                  deletePending ? "opacity-70" : ""
                }`}
                disabled={deletePending}
              >
                <span aria-hidden="true">🗑️</span>
                <span>{deletePending ? "Removing..." : "Delete"}</span>
              </button>
            )}

            {comment.isVisibleToViewer && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelectReply(comment)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    isReplySelected
                      ? "border-transparent bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)]"
                      : "border-[color:var(--color-panel-border)] text-[color:var(--color-text-accent)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-primary)]"
                  }`}
                >
                  <span aria-hidden="true">💬</span>
                  <span>{isReplySelected ? "Replying" : "Reply"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMyThought(comment)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    isMyThoughtSelected
                      ? "border-transparent bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)]"
                      : "border-[color:var(--color-panel-border)] text-[color:var(--color-text-accent)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-primary)]"
                  }`}
                >
                  <span aria-hidden="true">🔐</span>
                  <span>My Thought</span>
                </button>
              </>
            )}
          </div>
        </div>

        {node.children.length > 0 && (
          <ul className="space-y-2">
            {node.children.map((child) => renderComment(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            Thoughts
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-muted)]">
            <span aria-hidden="true">💬</span>
            <span>{publicCommentCount}</span>
          </span>
        </div>
        {viewerIsOwner && onToggleCommentsLock && (
          <button
            type="button"
            onClick={() => onToggleCommentsLock(!noteCommentsLocked)}
            disabled={lockActionPending}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              noteCommentsLocked
                ? "border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-accent)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-primary)]"
                : "border-transparent bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"
            } ${lockActionPending ? "cursor-not-allowed opacity-70" : ""}`}
          >
            <span aria-hidden="true">{noteCommentsLocked ? "🔓" : "🔒"}</span>
            <span>{noteCommentsLocked ? "Unlock thoughts" : "Lock thoughts"}</span>
          </button>
        )}
      </div>

      {roots.length === 0 ? (
        <p className="rounded-xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-4 text-sm text-[color:var(--color-text-muted)]">
          No thoughts here yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {roots.map((node) => renderComment(node, 0))}
        </ul>
      )}

      {canComment ? renderComposer() : (
        <p className="rounded-xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] p-4 text-sm text-[color:var(--color-text-muted)]">
          Thoughts are locked by the note owner.
        </p>
      )}
    </div>
  );
};

export default CommentThread;
