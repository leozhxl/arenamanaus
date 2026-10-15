export function WaveDivider({ color = '#1F2623', flip = false }: { color?: string; flip?: boolean }) {
  return (
    <div className={flip ? 'rotate-180' : ''}>
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="w-full h-[40px] md:h-[60px] block"
        aria-hidden="true"
      >
        <path
          d="M0,30 C180,55 360,5 540,25 C720,45 900,10 1080,20 C1260,30 1380,25 1440,22 L1440,60 L0,60 Z"
          fill={color}
        />
        <path
          d="M0,35 C180,60 360,10 540,30 C720,50 900,15 1080,25 C1260,35 1380,30 1440,27 L1440,60 L0,60 Z"
          fill={color}
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

export function CourtLineDivider() {
  return <div className="court-line w-full max-w-4xl mx-auto my-8" aria-hidden="true" />;
}
