export type Face = "calm" | "smug" | "worry" | "think" | "laugh" | "sour" | "cheer" | "groan";

const INK = "#1a120c";

export function PigScene({ face }: { face: Face }) {
  const happy = face === "smug" || face === "laugh" || face === "cheer";
  const sad = face === "sour" || face === "groan";
  const wide = face === "worry";
  const look = face === "think" ? -7 : face === "worry" ? 3 : 0;
  return (
    <svg className={`pig-scene face-${face}`} viewBox="0 0 800 400" preserveAspectRatio="xMidYMin slice" role="img" aria-label="Пан Глек за картковим лотком">
      <rect width="800" height="250" fill="#4c93d6" />
      <ellipse cx="140" cy="54" rx="70" ry="22" fill="#d7ecff" />
      <ellipse cx="620" cy="78" rx="90" ry="24" fill="#d7ecff" />
      <g className="pig">
        <ellipse cx="400" cy="268" rx="168" ry="78" fill="#f3b4b0" stroke={INK} strokeWidth="5" />
        <path d="M250 250 q-30 40 10 70" fill="none" stroke="#4d7a3a" strokeWidth="16" strokeLinecap="round" />
        <path d="M550 250 q30 40 -10 70" fill="none" stroke="#4d7a3a" strokeWidth="16" strokeLinecap="round" />
        <ellipse cx="292" cy="118" rx="38" ry="52" fill="#f3b4b0" stroke={INK} strokeWidth="5" transform="rotate(-18 292 118)" />
        <ellipse cx="508" cy="118" rx="38" ry="52" fill="#f3b4b0" stroke={INK} strokeWidth="5" transform="rotate(18 508 118)" />
        <ellipse cx="292" cy="118" rx="18" ry="28" fill="#f7c7c4" transform="rotate(-18 292 118)" />
        <ellipse cx="508" cy="118" rx="18" ry="28" fill="#f7c7c4" transform="rotate(18 508 118)" />
        <ellipse cx="400" cy="176" rx="124" ry="104" fill="#f6c2be" stroke={INK} strokeWidth="5" />
        <path d="M292 248 h216 v36 h-216 z" fill="#fff6e4" stroke={INK} strokeWidth="4" />
        <path d="M308 256 h184 v52 h-184 z" fill="#4d7a3a" stroke={INK} strokeWidth="4" />
        <circle cx="400" cy="282" r="6" fill="#e2a322" stroke={INK} strokeWidth="3" />
        {happy ? (
          <g fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round">
            <path d="M328 156 q24 -30 46 0" />
            <path d="M426 156 q24 -30 46 0" />
          </g>
        ) : (
          <g>
            <ellipse cx={352 + look} cy="158" rx={wide ? 20 : 16} ry={wide ? 22 : sad ? 11 : 16} fill="#fff" stroke={INK} strokeWidth="4" />
            <ellipse cx={448 + look} cy="158" rx={wide ? 20 : 16} ry={wide ? 22 : sad ? 11 : 16} fill="#fff" stroke={INK} strokeWidth="4" />
            <circle cx={356 + look} cy={sad ? 164 : 160} r={wide ? 7 : 6} fill={INK} />
            <circle cx={452 + look} cy={sad ? 164 : 160} r={wide ? 7 : 6} fill={INK} />
            <ellipse className="lid" cx="352" cy="148" rx="18" ry="16" fill="#f6c2be" />
            <ellipse className="lid" cx="448" cy="148" rx="18" ry="16" fill="#f6c2be" />
          </g>
        )}
        <path
          d={face === "think" ? "M324 132 q20 -16 36 0" : face === "worry" ? "M318 140 q22 12 40 -2" : "M324 138 q18 -10 34 2"}
          fill="none"
          stroke={INK}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="400" cy="196" rx="50" ry="36" fill="#f28b9a" stroke={INK} strokeWidth="5" />
        <ellipse cx="384" cy="194" rx="7" ry="9" fill="#c4566c" />
        <ellipse cx="416" cy="194" rx="7" ry="9" fill="#c4566c" />
        {face === "laugh" || face === "cheer" ? (
          <g>
            <ellipse cx="400" cy="236" rx="28" ry="18" fill="#5c2430" stroke={INK} strokeWidth="4" />
            <ellipse cx="400" cy="242" rx="16" ry="8" fill="#e26b7a" />
            <rect x="392" y="220" width="8" height="10" rx="2" fill="#fff" stroke={INK} strokeWidth="2" />
          </g>
        ) : (
          <path
            d={
              sad
                ? "M372 236 q28 18 56 0"
                : face === "worry"
                  ? "M374 232 q10 8 18 0 q10 8 20 0"
                  : face === "think"
                    ? "M378 234 h44"
                    : "M370 228 q30 22 60 0"
            }
            fill="none"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
          />
        )}
        {happy && face !== "laugh" && face !== "cheer" ? (
          <rect x="418" y="226" width="7" height="9" rx="2" fill="#fff" stroke={INK} strokeWidth="2" />
        ) : null}
        {wide || face === "groan" ? (
          <g className="sweat" fill="#d7ecff" stroke={INK} strokeWidth="3">
            <ellipse cx="268" cy="150" rx="8" ry="12" />
            <ellipse cx="536" cy="168" rx="7" ry="11" />
          </g>
        ) : null}
      </g>
      <g className="tray">
        <rect x="168" y="286" width="464" height="52" rx="8" fill="#a86432" stroke={INK} strokeWidth="5" />
        <rect x="184" y="298" width="432" height="22" rx="4" fill="#c9834a" stroke={INK} strokeWidth="3" />
      </g>
      <rect y="338" width="800" height="92" fill="#e7c07a" />
      <path d="M0 338 h800" stroke="#c9974e" strokeWidth="6" />
    </svg>
  );
}

export function Paw({ ready, flinch }: { ready: boolean; flinch: boolean }) {
  return (
    <svg className={`paw${ready ? " ready" : ""}${flinch ? " flinch" : ""}`} viewBox="0 0 180 200" aria-hidden="true">
      <path d="M118 200 v-70 q8 -30 -20 -38" fill="none" stroke="#fff6e4" strokeWidth="28" strokeLinecap="round" />
      <path d="M118 200 v-70 q8 -30 -20 -38" fill="none" stroke="#1a120c" strokeWidth="34" strokeLinecap="round" />
      <path d="M118 200 v-70 q8 -30 -20 -38" fill="none" stroke="#d4652f" strokeWidth="24" strokeLinecap="round" />
      <ellipse cx="78" cy="92" rx="46" ry="36" fill="#d4652f" stroke="#1a120c" strokeWidth="5" />
      <ellipse cx="40" cy="62" rx="16" ry="20" fill="#d4652f" stroke="#1a120c" strokeWidth="4" transform="rotate(-24 40 62)" />
      <ellipse cx="70" cy="46" rx="16" ry="20" fill="#d4652f" stroke="#1a120c" strokeWidth="4" />
      <ellipse cx="102" cy="50" rx="16" ry="20" fill="#d4652f" stroke="#1a120c" strokeWidth="4" transform="rotate(18 102 50)" />
      <ellipse cx="128" cy="70" rx="14" ry="18" fill="#d4652f" stroke="#1a120c" strokeWidth="4" transform="rotate(36 128 70)" />
      <ellipse cx="78" cy="100" rx="16" ry="12" fill="#f3b4b0" />
    </svg>
  );
}

export function Horseshoe() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path
        d="M22 20 h10 v28 a18 18 0 0 0 36 0 V20 h10 v30 a28 28 0 0 1 -56 0 z"
        fill="#e2a322"
        stroke="#1a120c"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
