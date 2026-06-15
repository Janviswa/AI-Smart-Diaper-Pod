/**
 * CradleLogo — faithful SVG reconstruction of the Cradle brand mark.
 *
 * The logo shows a MOTHER cradling a CHILD:
 *
 *  ① MOTHER'S HEAD — largest dot, floats centred above the whole mark.
 *     Radius ~11, positioned at (60, 11). Same dark-blue as crescent.
 *     Opacity slightly less than crescent to give depth.
 *
 *  ② CRESCENT (mother's arms/body) — thick C-shape, open at upper-right.
 *     Built with evenodd: outer circle MINUS inner circle offset up+right.
 *     Outer: cx=56 cy=66 r=42
 *     Inner: cx=72 cy=52 r=29   ← offset +16 right, -14 up from outer
 *     The gap (missing arc) is at ~11 o'clock direction.
 *     At the gap: the crescent tapers — upper tip thin, lower tip thicker.
 *
 *  ③ BABY'S HEAD — medium filled circle inside the crescent hollow.
 *     Slightly left of centre: cx=50 cy=62 r=11. Same dark-blue.
 *
 *  ④ BABY'S BODY (wave) — wide light-blue filled shape below baby head.
 *     Like a "U" or cradle bowl. The shape has two gentle bumps at the
 *     sides (visible in the logo as the body spreads into the crescent).
 *     Drawn as a smooth closed path: wide at top, rounds down at bottom.
 *     Noticeably more transparent/lighter than the other elements.
 */

interface Props {
  size?:      number;
  color?:     string;   // defaults to currentColor; pass "white" for blue tiles
  className?: string;
}

export default function CradleLogo({ size = 32, color, className = "" }: Props) {
  const c = color ?? "currentColor";

  // ── Crescent: outer circle (56,66) r=42 ──────────────────────────────
  // Bezier k = 42 × 0.5523 = 23.20
  const A = {cx:56, cy:66, r:42, k:23.2};
  // Clockwise (standard SVG winding)
  const outer = [
    `M ${A.cx},${A.cy-A.r}`,
    `C ${A.cx+A.k},${A.cy-A.r} ${A.cx+A.r},${A.cy-A.k} ${A.cx+A.r},${A.cy}`,
    `C ${A.cx+A.r},${A.cy+A.k} ${A.cx+A.k},${A.cy+A.r} ${A.cx},${A.cy+A.r}`,
    `C ${A.cx-A.k},${A.cy+A.r} ${A.cx-A.r},${A.cy+A.k} ${A.cx-A.r},${A.cy}`,
    `C ${A.cx-A.r},${A.cy-A.k} ${A.cx-A.k},${A.cy-A.r} ${A.cx},${A.cy-A.r} Z`,
  ].join(" ");

  // ── Crescent: inner circle (72,52) r=29 — counter-clockwise for hole ─
  // Bezier k = 29 × 0.5523 = 16.02
  const B = {cx:72, cy:52, r:29, k:16.0};
  // Counter-clockwise: mirror the curve directions
  const inner = [
    `M ${B.cx},${B.cy-B.r}`,
    `C ${B.cx-B.k},${B.cy-B.r} ${B.cx-B.r},${B.cy-B.k} ${B.cx-B.r},${B.cy}`,
    `C ${B.cx-B.r},${B.cy+B.k} ${B.cx-B.k},${B.cy+B.r} ${B.cx},${B.cy+B.r}`,
    `C ${B.cx+B.k},${B.cy+B.r} ${B.cx+B.r},${B.cy+B.k} ${B.cx+B.r},${B.cy}`,
    `C ${B.cx+B.r},${B.cy-B.k} ${B.cx+B.k},${B.cy-B.r} ${B.cx},${B.cy-B.r} Z`,
  ].join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 112 122"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cradle"
    >
      {/* ① Crescent — mother's protective arms */}
      <path fillRule="evenodd" d={`${outer} ${inner}`} fill={c} opacity="0.90" />

      {/* ④ Baby body / wave — wide translucent bowl with shoulder bumps */}
      {/* The logo shows a wide shape: flat top, two gentle rounded bumps  */}
      {/* at sides, curves down to a smooth bowl bottom.                   */}
      <path
        d="M 29,70 C 29,64 36,64 40,68 C 43,71 47,73 56,73 C 65,73 69,71 72,68 C 76,64 83,64 83,70 C 83,82 72,92 56,92 C 40,92 29,82 29,70 Z"
        fill={c}
        opacity="0.36"
      />

      {/* ③ Baby head — inside the crescent hollow */}
      <circle cx="50" cy="61" r="11" fill={c} opacity="0.82" />

      {/* ① Mother head — above crescent, centred slightly right */}
      <circle cx="60" cy="10" r="11" fill={c} opacity="0.70" />
    </svg>
  );
}
