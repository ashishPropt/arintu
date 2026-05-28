export default function Logo({ size = 'md', showText = true }) {
  const sizes = { sm: 28, md: 36, lg: 48 };
  const px = sizes[size] || 36;
  const textClass = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-2.5">
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="url(#lg1)" opacity="0.12"/>
        <path d="M24 6 L40 38 H8 Z" fill="url(#lg1)" opacity="0.15"/>
        <path d="M24 10 L38 36" stroke="url(#lg1)" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M24 10 L10 36" stroke="url(#lg1)" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M15.5 28 H32.5" stroke="url(#lg2)" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="24" cy="10" r="2.5" fill="url(#lg2)"/>
        <defs>
          <linearGradient id="lg1" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3355ff"/>
            <stop offset="100%" stopColor="#c84dd0"/>
          </linearGradient>
          <linearGradient id="lg2" x1="8" y1="28" x2="40" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5680ff"/>
            <stop offset="100%" stopColor="#e07ae4"/>
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent ${textClass}`}>
          Arintu
        </span>
      )}
    </div>
  );
}
