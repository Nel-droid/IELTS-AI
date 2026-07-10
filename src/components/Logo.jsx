export function Logo({ size = 32, className = 'logo-mark' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* C arc */}
      <path
        className="lm-c"
        d="M22 8.5A10 10 0 1 0 22 23.5"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Reading bar */}
      <rect className="lm-r" x="18" y="11" width="10" height="3" rx="1.5" />
      {/* Listening bar */}
      <rect className="lm-l" x="18" y="16" width="7" height="3" rx="1.5" />
      {/* Writing bar */}
      <rect className="lm-w" x="18" y="21" width="8" height="3" rx="1.5" />
    </svg>
  )
}
