"use client";

import { User } from "lucide-react";
import type { AvatarColor, User as UserType } from "@/lib/domain";

const AVATAR_COLORS: AvatarColor[] = ["grey", "blue", "green", "amber", "violet"];

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-[14px]",
  lg: "size-14 text-lg",
} as const;

type AvatarProps = {
  user: Pick<UserType, "initials" | "name" | "avatarUrl" | "avatarStyle" | "avatarColor">;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function Avatar({ user, size = "md", className = "" }: AvatarProps) {
  const color: AvatarColor = user.avatarColor ?? "grey";
  const style = user.avatarStyle ?? "initials";
  const sizeCls = sizeClasses[size];

  if (user.avatarUrl?.trim()) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ? `${user.name} avatar` : "Avatar"}
        className={`rounded-full object-cover ${sizeCls} ${className}`}
      />
    );
  }

  const bgGradient = `var(--avatar-${color}-gradient, var(--avatar-${color}-bg))`;
  const textVar = `var(--avatar-${color}-text)`;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeCls} ${className}`}
      style={{ background: bgGradient, color: textVar }}
      aria-hidden
    >
      {style === "icon" ? (
        <User className="size-[55%]" strokeWidth={2} />
      ) : (
        <span className="leading-none">{user.initials || "?"}</span>
      )}
    </div>
  );
}

export { AVATAR_COLORS };
