/**
 * The maker's AA monogram, used to sign the header credit.
 *
 * Inlined rather than loaded as an <img> so it inherits `currentColor` and
 * follows the surrounding text rather than carrying its own colour.
 *
 * Traced from the original brand sheet. The two A's are deliberately NOT the
 * same shape - the left one's inner leg runs the full height while the right
 * one's is a short stub, and the feet finish differently. Do not "symmetrise"
 * them. The first three subpaths are the left A (leg + foot, inner leg,
 * detached crossbar); the last two are the right A.
 */
const PATHS = [
  "M22.43 15.193L3 48.807L16.265 48.807L18.09 45.649L8.473 45.649L22.43 21.503Z",
  "M22.43 15.193L22.43 21.503L38.213 48.807L41.86 48.807Z",
  "M18.689 48.807L22.335 48.807L28.91 37.432L26.177 35.852Z",
  "M41.57 15.193L33.604 28.974L36.338 30.554L41.57 21.503Z",
  "M41.57 15.193L41.57 21.503L55.527 45.649L44.849 45.649L46.674 48.807L61 48.807Z",
];

export function AuthorMark({
  className,
  title,
}: {
  readonly className?: string;
  /** Give it a title only where it is not already beside the author's name. */
  readonly title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className ?? ""}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS.map((d) => (
        <path key={d} fill="currentColor" d={d} />
      ))}
    </svg>
  );
}
