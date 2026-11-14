import React from 'react';

const SIZE_CLASSES = {
  xs: 'h-6 w-6 rounded-md',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl'
};

/**
 * Renders the official-style app icon logo for Ola, Uber, or Rapido.
 */
export function ProviderLogo({ provider, size = 'md', className = '' }) {
  const key = String(provider || '').trim().toLowerCase();
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (key.includes('ola')) {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`shrink-0 shadow-xs ${sizeClass} ${className}`}
        role="img"
        aria-label="Ola logo"
      >
        <rect width="64" height="64" rx="14" fill="#050505" />
        {/* Outer white concentric ring */}
        <circle cx="32" cy="24" r="15.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
        <circle cx="32" cy="24" r="13.2" fill="none" stroke="#FFFFFF" strokeWidth="0.9" strokeDasharray="24 5 18 4" />
        {/* Neon lime-yellow center circle */}
        <circle cx="32" cy="24" r="7.5" fill="#D4E51A" />
        {/* OLA wordmark */}
        <g fill="#FFFFFF">
          <circle cx="20.5" cy="50.5" r="4.8" fill="none" stroke="#FFFFFF" strokeWidth="2.6" />
          <path d="M29.2 44.8h2.6v9.1h5.1v2.2h-7.7z" />
          <path d="M43.2 44.8l5.2 11.3h-2.9l-2.3-5.4-2.3 5.4h-2.9z" />
        </g>
      </svg>
    );
  }

  if (key.includes('uber')) {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`shrink-0 shadow-xs ${sizeClass} ${className}`}
        role="img"
        aria-label="Uber logo"
      >
        <rect width="64" height="64" rx="14" fill="#000000" />
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize="21"
          letterSpacing="-0.6"
        >
          Uber
        </text>
      </svg>
    );
  }

  if (key.includes('rapido')) {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`shrink-0 shadow-xs ${sizeClass} ${className}`}
        role="img"
        aria-label="Rapido logo"
      >
        <rect width="64" height="64" rx="14" fill="#F5C518" />
        <text
          x="32"
          y="38"
          textAnchor="middle"
          fill="#0A0A0A"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="16.5"
          letterSpacing="-0.4"
        >
          rapido
        </text>
      </svg>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-[#022C22] text-xs font-extrabold text-[#10B981] shadow-xs ${sizeClass} ${className}`}
    >
      RR
    </div>
  );
}
