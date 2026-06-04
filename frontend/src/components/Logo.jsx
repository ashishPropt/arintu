/**
 * Arintu wordmark logo — matches the official brand asset.
 *
 * Sizes:
 *   sm  — compact inline use (footer, breadcrumbs)
 *   md  — default: wordmark + tagline (sidebar, header)
 *   lg  — large centred use (login / register pages)
 *
 * showTagline (default true for md/lg, false for sm) controls the
 * "ENRICH YOUR SKILLS" subtitle.  The old `showText` prop is still
 * accepted as an alias so existing callers don't break.
 */
export default function Logo({ size = 'md', showText, showTagline }) {
  // Back-compat: old callers pass showText={false} on auth pages —
  // treat that as "show just the wordmark, no tagline"
  const resolvedTagline =
    showTagline !== undefined
      ? showTagline
      : showText !== undefined
        ? showText
        : size !== 'sm';   // default: tagline on md / lg, not on sm

  const nameStyle = {
    sm: { fontSize: '1.15rem',  letterSpacing: '-0.01em' },
    md: { fontSize: '1.45rem',  letterSpacing: '-0.01em' },
    lg: { fontSize: '2.4rem',   letterSpacing: '-0.01em' },
  }[size] || { fontSize: '1.45rem' };

  const tagStyle = {
    sm: { fontSize: '0.52rem', letterSpacing: '0.18em' },
    md: { fontSize: '0.60rem', letterSpacing: '0.22em' },
    lg: { fontSize: '0.75rem', letterSpacing: '0.24em' },
  }[size] || { fontSize: '0.60rem' };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
      {/* Wordmark */}
      <span
        style={{
          fontFamily: "'Nunito', 'Inter', system-ui, sans-serif",
          fontWeight: 900,
          color: '#1DB87D',
          lineHeight: 1,
          ...nameStyle,
        }}
      >
        ARINTU
      </span>

      {/* Tagline */}
      {resolvedTagline && (
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 600,
            color: '#1a1a1a',
            marginTop: size === 'lg' ? '0.35rem' : '0.2rem',
            lineHeight: 1,
            ...tagStyle,
          }}
        >
          ENRICH YOUR SKILLS
        </span>
      )}
    </div>
  );
}
