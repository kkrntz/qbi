import type { Player } from "@/lib/types";
import { initials } from "@/lib/format";

export function Avatar({ player }: { player: Player }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
        bg-inset text-xs font-bold text-muted"
      aria-hidden
    >
      {initials(player.name) || "?"}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 py-6 text-center text-sm text-muted">{children}</p>
  );
}
