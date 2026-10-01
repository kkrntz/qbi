import type { Player, Skill } from "@/lib/types";
import { initials } from "@/lib/format";

const SKILL_STYLE: Record<Skill, string> = {
  beginner: "bg-inset text-muted",
  intermediate: "bg-accent-soft text-accent",
  advanced: "bg-ball text-ball-ink",
};

const SKILL_SHORT: Record<Skill, string> = {
  beginner: "bgnr",
  intermediate: "intr",
  advanced: "adv",
};

export function SkillChip({ skill }: { skill: Skill }) {
  return (
    <span className={`chip ${SKILL_STYLE[skill]}`} title={skill}>
      {SKILL_SHORT[skill]}
    </span>
  );
}

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
