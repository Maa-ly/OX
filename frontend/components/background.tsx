'use client';

export function AnimatedGridBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
    </div>
  );
}

export function GradientOrbs() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <div 
        className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        style={{
          animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />
      <div 
        className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-blue-600/20 blur-3xl"
        style={{
          animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          animationDelay: '1s',
        }}
      />
      <div 
        className="absolute left-0 bottom-0 h-[300px] w-[300px] rounded-full bg-cyan-400/10 blur-3xl"
        style={{
          animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          animationDelay: '2s',
        }}
      />
    </div>
  );
}

export function DotPattern() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}

