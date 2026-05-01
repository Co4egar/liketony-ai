import { Persona } from "@/data/personas";

const COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-amber-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-purple-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-lime-500 to-emerald-500",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function hashIdx(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

interface Props {
  persona: Pick<Persona, "id" | "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PersonaAvatar({ persona, size = "md", className = "" }: Props) {
  const gradient = COLORS[hashIdx(persona.id, COLORS.length)];
  const sizeCls =
    size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br ${gradient} ${sizeCls} flex items-center justify-center font-display font-semibold text-white shadow-lg ${className}`}
      aria-hidden
    >
      {initials(persona.name)}
    </div>
  );
}
