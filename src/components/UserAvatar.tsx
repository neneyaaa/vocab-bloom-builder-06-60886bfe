import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-3xl",
};

export const UserAvatar = ({ username, avatarUrl, size = "md", className }: UserAvatarProps) => {
  const initial = (username ?? "?").trim().slice(0, 1).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username ?? "avatar"}
        className={cn(
          "rounded-full object-cover border-2 border-border/40",
          SIZES[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-display font-bold text-primary shrink-0",
        SIZES[size],
        className
      )}
    >
      {initial}
    </div>
  );
};
