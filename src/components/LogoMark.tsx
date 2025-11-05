import React from 'react';

type Props = {
  size?: number; // px
};

export default function LogoMark({ size = 28 }: Props) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
  };

  return (
    <div
      className="flex items-center justify-center rounded-lg shadow-sm"
      style={style}
      aria-label="Logo Control Money"
      title="Control Money"
    >
      {/* Fondo con gradiente según tema */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        className="rounded-lg"
      >
        <defs>
          <linearGradient id="cmLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="cmDark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width="28"
          height="28"
          rx="6"
          fill="url(#cmLight)"
          className="dark:hidden"
        />
        <rect
          x="0"
          y="0"
          width="28"
          height="28"
          rx="6"
          fill="url(#cmDark)"
          className="hidden dark:block"
        />
        <text
          x="14"
          y="18"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="#ffffff"
          style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif' }}
        >
          CM
        </text>
      </svg>
    </div>
  );
}