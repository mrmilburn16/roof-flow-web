"use client";

import { useRef, useState } from "react";
import { User, Image, Type } from "lucide-react";
import type { AvatarColor, AvatarStyle } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, btnPrimary, btnSecondary } from "@/components/ui";
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
  const [avatarUrl, setAvatarUrl] = useState(meUser?.avatarUrl ?? "");
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(meUser?.avatarStyle ?? "initials");
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(meUser?.avatarColor ?? "grey");
  const [saved, setSaved] = useState(false);

  const previewUser = {
    ...meUser,
    name: meUser?.name ?? me.name,
    initials: meUser?.initials ?? (me.name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"),
    avatarUrl: avatarUrl || undefined,
    avatarStyle,
    avatarColor,
  };

  function handleSave() {
    if (!meUser) return;
    updateUser(me.id, {
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
        <PageTitle title="Profile" subtitle="Your avatar and display preferences." />
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
      <PageTitle
        title="Profile"
        subtitle="Choose a profile picture: upload a photo, or pick initials or a person icon with one of five colors."
      />

      <div className={card}>
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Profile picture</h2>
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-3">
              <Avatar user={previewUser} size="lg" />
              <span className="text-[13px] text-[var(--text-muted)]">Preview</span>
            </div>

            <div className="min-w-0 flex-1 space-y-6">
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAvatarColor(c)}
                          title={c}
                          className={`size-9 rounded-full transition ${
                            avatarColor === c ? "ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--surface)]" : ""
                          }`}
                          style={{ backgroundColor: `var(--avatar-${c}-bg)` }}
                          aria-label={`Color ${c}`}
                          aria-pressed={avatarColor === c}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
                      Grey · Blue · Green · Amber · Violet
                    </p>
                  </div>
                </>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className={btnPrimary}
                >
                  {saved ? "Saved" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
