import { forwardRef, useEffect, useState } from "react";
import { Persona } from "@/data/personas";
import { fetchPersonaPhoto } from "@/lib/persona-photos";

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

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  persona: Pick<Persona, "id" | "name"> & { wikiTitle?: string | null };
  size?: "sm" | "md" | "lg";
}

export const PersonaAvatar = forwardRef<HTMLDivElement, Props>(
  ({ persona, size = "md", className = "", ...rest }, ref) => {
    const gradient = COLORS[hashIdx(persona.id, COLORS.length)];
    const sizeCls =
      size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";

    const [photo, setPhoto] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      let cancelled = false;
      setPhoto(null);
      setLoaded(false);
      fetchPersonaPhoto(persona.id, persona.name).then((url) => {
        if (cancelled) return;
        setPhoto(url);
      });
      return () => {
        cancelled = true;
      };
    }, [persona.id, persona.name]);

    return (
      <div
        ref={ref}
        {...rest}
        className={`relative shrink-0 rounded-full overflow-hidden bg-gradient-to-br ${gradient} ${sizeCls} flex items-center justify-center font-display font-semibold text-white shadow-lg ${className}`}
        aria-hidden
      >
        <span className={photo && loaded ? "opacity-0" : "opacity-100"}>
          {initials(persona.name)}
        </span>
        {photo && (
          <img
            src={photo}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setPhoto(null)}
            style={{ objectPosition: "center 25%" }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
    );
  },
);
PersonaAvatar.displayName = "PersonaAvatar";
