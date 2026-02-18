"use client";

import { useRef, useState } from "react";
import { User, Image, Type, Mail, BadgeCheck } from "lucide-react";
import type { AvatarColor, AvatarStyle } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, btnPrimary, btnSecondary, inputBase } from "@/components/ui";
import { Avatar, AVATAR_COLORS } from "@/components/Avatar";

const AVATAR_STYLES: { id: AvatarStyle; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "initials", label: "My initials", icon: Type },
  { id: "icon", label: "Person icon", icon: User },
];

export default function ProfilePage() {
  const { db, me, updateUser } = useMockDb();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const meUser = db.users.find((u) => u.id === me.id);
  const meRole = meUser ? db.roles.find((r) => r.id === meUser.roleId) : null;
  const [name, setName] = useState(meUser?.name ?? me.name);
  const [email, setEmail] = useState(meUser?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(meUser?.avatarUrl ?? "");
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(meUser?.avatarStyle ?? "initials");
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(meUser?.avatarColor ?? "grey");
  const [saved, setSaved] = useState(false);

  const previewUser = {
    ...meUser,
    name,
    initials: name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?",
    avatarUrl: avatarUrl || undefined,
    avatarStyle,
    avatarColor,
  };

  function handleSave() {
    if (!meUser) return;
    updateUser(me.id, {
      name: name.trim() || meUser.name,
      email: email.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      avatarStyle,
      avatarColor,
    });
    setSaved(true);
    toast("Profile updated", "success");
    setTimeout(() => setSaved(false), 2000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
      setAvatarStyle("initials");
      setAvatarColor("grey");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearPhoto() {
    setAvatarUrl("");
    setAvatarStyle("initials");
    setAvatarColor(meUser?.avatarColor ?? "grey");
  }

  if (!meUser) {
    return (
      <div className="space-y-8">
        <PageTitle subtitle="Your avatar and display preferences." />
        <div className={card + " p-10 text-center"}>
          <p className="text-[14px] text-[var(--text-muted)]">
            You’re not in the team list yet. Ask an owner to add you from the People page; then you can set your profile and avatar here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle subtitle="Your name, photo, and role. This info appears in People and on the Accountability Chart." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left card: Profile picture */}
        <div className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Profile picture</h2>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <Avatar user={previewUser} size="lg" />
                <span className="text-[12px] text-[var(--text-muted)]">Preview</span>
              </div>
              <div className="min-w-0 flex-1 space-y-5">
                <div>
                  <div className="text-[13px] font-medium text-[var(--text-secondary)]">Upload a photo</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      aria-label="Upload profile photo"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={btnSecondary + " inline-flex gap-2"}
                    >
                      <Image className="size-4" />
                      Choose image
                    </button>
                    {avatarUrl && (
                      <button type="button" onClick={clearPhoto} className={btnSecondary}>
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
                {!avatarUrl && (
                  <>
                    <div>
                      <div className="text-[13px] font-medium text-[var(--text-secondary)]">Style</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {AVATAR_STYLES.map((s) => {
                          const Icon = s.icon;
                          const active = avatarStyle === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setAvatarStyle(s.id)}
                              className={`inline-flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-[13px] font-medium transition ${
                                active
                                  ? "border-[var(--ring)] bg-[var(--muted-bg)] text-[var(--text-primary)]"
                                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]"
                              }`}
                            >
                              <Icon className="size-4" />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-[var(--text-secondary)]">Color</div>
                      <div className="mt-2 flex flex-nowrap gap-4">
                        {AVATAR_COLORS.map((c) => (
                          <div key={c} className="flex flex-col items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAvatarColor(c)}
                              title={c}
                              className={`size-9 rounded-full transition shrink-0 ${
                                avatarColor === c ? "ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--surface)]" : ""
                              }`}
                              style={{ background: `var(--avatar-${c}-gradient)` }}
                              aria-label={`Color ${c}`}
                              aria-pressed={avatarColor === c}
                            />
                            <span className="text-[11px] capitalize text-[var(--text-muted)]">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right card: About you */}
        <div className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">About you</h2>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label htmlFor="profile-name" className="block text-[13px] font-medium text-[var(--text-secondary)]">
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputBase + " mt-1.5"}
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)]">
                <Mail className="size-3.5" />
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com (optional)"
                className={inputBase + " mt-1.5"}
              />
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Used for sign-in and invites. Optional until you connect auth.
              </p>
            </div>
            {meRole && (
              <div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)]">
                  <BadgeCheck className="size-3.5" />
                  Role
                </div>
                <p className="mt-1.5 text-[14px] text-[var(--text-primary)]">{meRole.name}</p>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  Assigned in People. Your name and avatar appear on the Accountability Chart.
                </p>
              </div>
            )}
            <div className="pt-2">
              <button type="button" onClick={handleSave} className={btnPrimary}>
                {saved ? "Saved" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
