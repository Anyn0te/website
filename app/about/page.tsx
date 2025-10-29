"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useUserProfile } from "@/modules/users/hooks/useUserProfile";

const BottomNav = dynamic(() => import("@/components/navigation/BottomNav"), {
  ssr: false,
  loading: () => null,
});

const CreateNoteModal = dynamic(
  () => import("@/modules/notes/components/CreateNoteModal"),
  {
    ssr: false,
    loading: () => null,
  },
);

const contributors = [
  {
    username: "mrun1corn",
    avatarUrl: "https://avatars.githubusercontent.com/u/48880125?v=4",
    githubUrl: "https://github.com/mrun1corn", 
    role: "Core Developer & Backend",
    quotePlaceholder: "Always try to learn new things!"
  },
  {
    username: "tillua467",
    avatarUrl: "https://avatars.githubusercontent.com/u/128046674?v=4",
    githubUrl: "https://github.com/tillua467", 
    role: "Project Manager & Frontend",
    quotePlaceholder: "Still nothing interesting here....."
  },
];

export default function AboutPage() {
  const { token } = useAuth();
  const { userId, profile } = useUserProfile();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);
  
  return (
    <div className="min-h-screen bg-[color:var(--color-app-bg)] p-6 pb-[220px] md:pb-32 transition-colors">
      <header className="mx-auto mb-8 max-w-5xl rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 text-center shadow-[0_12px_24px_var(--color-glow)] animate-fade-up">
        <h1 className="text-3xl font-bold tracking-wide text-[color:var(--color-text-primary)]">
          Anyn0te
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          An anonymous note sharing platform, a place to not be shy to share
        </p>
      </header>

      <main className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-8 text-center shadow-[0_8px_20px_var(--color-glow)] animate-fade-up">
          <h2 className="text-2xl font-bold uppercase text-[color:var(--color-text-accent)] mb-4">
            Our Shared Quote
          </h2>
          <blockquote className="text-xl italic text-[color:var(--color-text-body)]">
            &ldquo;Just as a note finds its meaning in being shared, so does our purpose in connecting through anonymity.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm font-semibold text-[color:var(--color-text-muted)]">
            - The Anyn0te Team
          </p>
        </section>

        <section className="animate-fade-up">
          <h2 className="text-2xl font-bold uppercase text-[color:var(--color-text-primary)] mb-6 text-center">
            The Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {contributors.map((contributor, index) => (
              <Link 
                key={contributor.username}
                href={contributor.githubUrl}
                target="_blank" 
                rel="noopener noreferrer" 
                className="block rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-6 text-center shadow-[0_8px_20px_var(--color-glow)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_28px_var(--color-glow)] hover:bg-[color:var(--color-card-hover-bg)] cursor-pointer animate-fade-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex flex-col items-center">
                  <Image
                    src={contributor.avatarUrl}
                    alt={`${contributor.username}'s GitHub avatar`}
                    width={100}
                    height={100}
                    className="rounded-full border-4 border-[color:var(--color-accent)] mb-4"
                  />
                  
                  <h3 className="text-xl font-bold text-[color:var(--color-text-primary)]">
                    @{contributor.username}
                  </h3>
                  <p className="text-sm font-semibold text-[color:var(--color-text-accent)] mb-4">
                    {contributor.role}
                  </p>
                  
                  <div className="w-full mt-4 p-4 rounded-lg border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)]">
                    <p className="text-sm italic text-[color:var(--color-text-body)]">
                      &quot;{contributor.quotePlaceholder}&quot;
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      
      <BottomNav
        onOpenCreateModal={handleOpenCreateModal}
        viewerId={userId}
        token={token ?? null}
      />
      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        token={token}
        userId={userId ?? ""}
        username={profile?.username ?? null}
        displayUsername={profile?.displayUsername ?? false}
      />
    </div>
  );
}
