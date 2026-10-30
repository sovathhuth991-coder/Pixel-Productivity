import React, { useMemo } from "react";

// ---------------------------------------------------------------------------
// CSS_SCENES metadata
// ---------------------------------------------------------------------------

export const CSS_SCENES: { id: string; name: string; preview: string }[] = [
  { id: "cozy-rain", name: "Cozy Rain", preview: "Gentle rain over a warm city glow" },
  { id: "starfield", name: "Starfield", preview: "Deep space with twinkling stars and nebula" },
  { id: "aurora", name: "Aurora", preview: "Northern lights dancing across the sky" },
  { id: "sunset", name: "Sunset", preview: "Warm sunset with drifting clouds" },
  { id: "forest", name: "Forest", preview: "Enchanted forest with fireflies and mist" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random from seed (mulberry32) */
function seededRandom(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Scene: Cozy Rain
// ---------------------------------------------------------------------------

const CozyRain: React.FC = () => {
  const drops = useMemo(() => {
    const result: { left: number; delay: number; duration: number; opacity: number; height: number }[] = [];
    for (let i = 0; i < 50; i++) {
      const r = seededRandom(i * 7 + 3);
      const r2 = seededRandom(i * 13 + 17);
      const r3 = seededRandom(i * 19 + 29);
      result.push({
        left: r * 100,
        delay: r2 * 3,
        duration: 0.6 + r3 * 0.6,
        opacity: 0.15 + r * 0.25,
        height: 18 + r2 * 22,
      });
    }
    return result;
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes css-scene-rain-fall {
          0%   { transform: translateY(-10vh); }
          100% { transform: translateY(110vh); }
        }
        @keyframes css-scene-rain-glow {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.55; }
        }
        @keyframes css-scene-lamp {
          0%, 100% { opacity: 0.35; }
          45%      { opacity: 0.52; }
          50%      { opacity: 0.30; }
          55%      { opacity: 0.50; }
        }
      `}</style>

      {/* City-light warm glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: "55%",
          height: "45%",
          background: "radial-gradient(ellipse at center, rgba(255,180,100,0.25) 0%, transparent 70%)",
          animation: "css-scene-rain-glow 6s ease-in-out infinite",
          willChange: "opacity",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-8%",
          right: "5%",
          width: "35%",
          height: "30%",
          background: "radial-gradient(ellipse at center, rgba(255,140,80,0.15) 0%, transparent 70%)",
          animation: "css-scene-rain-glow 8s ease-in-out infinite 2s",
          willChange: "opacity",
        }}
      />

      {/* Rain drops */}
      {drops.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${d.left}%`,
            top: 0,
            width: "1px",
            height: `${d.height}px`,
            background: `linear-gradient(180deg, transparent, rgba(174,194,224,${d.opacity}))`,
            animation: `css-scene-rain-fall ${d.duration}s linear ${d.delay}s infinite`,
            willChange: "transform",
          }}
        />
      ))}

      {/* Window: the solid box-shadow masks the rain outside the glass, so
          the drops read as weather outside a cozy room rather than on the
          wall behind the clock. */}
      <div
        style={{
          position: "absolute",
          left: "7%",
          top: "6%",
          width: "60%",
          height: "58%",
          border: "12px solid #2a1c17",
          boxShadow: "0 0 0 100vmax #0b111c, 0 0 80px rgba(255,170,90,0.10)",
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(8,20,38,0.55) 0%, rgba(20,44,66,0.35) 100%)",
        }}
      >
        {/* Moon / sunset orb */}
        <div
          style={{
            position: "absolute",
            right: "14%",
            top: "12%",
            width: "58px",
            height: "58px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 35%, #ffd9a0 0%, #ff9c5a 55%, #d96a3a 100%)",
            boxShadow: "0 0 50px 16px rgba(255,160,90,0.22)",
          }}
        />
        {/* Mountain layers */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "55%",
            background: "#0b1a24",
            clipPath:
              "polygon(0 100%,0 62%,12% 42%,24% 58%,38% 30%,52% 54%,66% 38%,82% 60%,100% 44%,100% 100%)",
            opacity: 0.95,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "36%",
            background: "#0e2430",
            clipPath:
              "polygon(0 100%,0 55%,18% 68%,32% 44%,48% 66%,64% 46%,80% 70%,100% 52%,100% 100%)",
          }}
        />
        {/* City lights at the base */}
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={`window-light-${i}`}
            style={{
              position: "absolute",
              bottom: `${3 + (i % 4) * 3}%`,
              left: `${4 + i * 6}%`,
              width: "3px",
              height: "3px",
              background: i % 3 === 0 ? "#ffcf8a" : "#7fb7c9",
              opacity: 0.7,
            }}
          />
        ))}
        {/* Vertical mullion only — a horizontal bar would cut through the clock */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "6px",
            background: "#241713",
          }}
        />
        {/* Glass sheen */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.05) 0%, transparent 35%)",
          }}
        />
      </div>

      {/* Sill */}
      <div
        style={{
          position: "absolute",
          left: "6%",
          top: "64%",
          width: "62%",
          height: "10px",
          background: "#2c1b16",
          boxShadow: "0 4px 0 #160d0a",
        }}
      />

      {/* Hanging lamp */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "48%",
          width: "2px",
          height: "16%",
          background: "#1b1210",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "44%",
          width: "8%",
          height: "4%",
          background: "linear-gradient(180deg, #2b1a14, #41261b)",
          clipPath: "polygon(15% 0,85% 0,100% 100%,0 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "19%",
          left: "45%",
          width: "7%",
          height: "7%",
          background:
            "radial-gradient(ellipse at center, rgba(255,170,90,0.35), transparent 70%)",
          animation: "css-scene-lamp 5s ease-in-out infinite",
          willChange: "opacity",
        }}
      />

      {/* Wood floor */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "24%",
          background: "linear-gradient(180deg, #2a1a12 0%, #120b09 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "24%",
          background:
            "repeating-linear-gradient(90deg, rgba(255,180,120,0.05) 0 2px, transparent 2px 90px)",
        }}
      />

      {/* Desk + warm monitor glow */}
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          left: "3%",
          width: "30%",
          height: "3%",
          background: "#2a1a12",
          boxShadow: "0 -3px 0 #3a2418",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "21%",
          left: "7%",
          width: "15%",
          height: "13%",
          background: "#0b0d12",
          border: "3px solid #1b1210",
          boxShadow: "0 0 24px rgba(255,170,90,0.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "8%",
            background: "linear-gradient(180deg, #e8a15a, #7a3f2a)",
            opacity: 0.55,
          }}
        />
      </div>

      {/* Low couch on the right */}
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          right: "17%",
          width: "27%",
          height: "8%",
          background: "#1d3b3a",
          border: "3px solid #122624",
          boxShadow: "0 6px 0 rgba(0,0,0,0.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "24%",
          right: "17%",
          width: "27%",
          height: "8%",
          background: "#244a46",
          border: "3px solid #122624",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "27%",
          right: "19%",
          width: "9%",
          height: "4%",
          background: "#2f5f57",
          border: "2px solid #122624",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "27%",
          right: "30%",
          width: "9%",
          height: "4%",
          background: "#2f5f57",
          border: "2px solid #122624",
        }}
      />

      {/* Pot plant */}
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          right: "6%",
          width: "9%",
          height: "9%",
          background: "#2a1712",
          clipPath: "polygon(10% 0,90% 0,100% 100%,0 100%)",
        }}
      />
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`plant-${i}`}
          style={{
            position: "absolute",
            bottom: `${26 + (i % 3) * 4}%`,
            right: `${7 + (i % 4) * 2}%`,
            width: "5%",
            height: "3%",
            background: i % 2 === 0 ? "#2f6b4f" : "#1f4d3a",
            borderRadius: "50% 0 50% 0",
            transform: `rotate(${-25 + i * 8}deg)`,
          }}
        />
      ))}

      {/* Warm vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 42%, transparent 25%, rgba(0,0,0,0.32) 100%)",
        }}
      />

      {/* Ambient warm/cool wash from the lamp and window */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 18% 72%, rgba(255,150,80,0.10) 0%, transparent 55%), radial-gradient(ellipse at 82% 70%, rgba(100,200,180,0.06) 0%, transparent 50%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene: Starfield
// ---------------------------------------------------------------------------

const Starfield: React.FC = () => {
  const stars = useMemo(() => {
    const result: {
      x: number;
      y: number;
      size: number;
      delay: number;
      duration: number;
      brightness: number;
    }[] = [];
    for (let i = 0; i < 120; i++) {
      const r1 = seededRandom(i * 11 + 1);
      const r2 = seededRandom(i * 23 + 5);
      const r3 = seededRandom(i * 37 + 9);
      const r4 = seededRandom(i * 43 + 13);
      result.push({
        x: r1 * 100,
        y: r2 * 100,
        size: 1 + r3 * 2,
        delay: r4 * 5,
        duration: 2 + r1 * 4,
        brightness: 0.4 + r2 * 0.6,
      });
    }
    return result;
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(160deg, #020010 0%, #0a0a2e 40%, #0d0d1a 100%)",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes css-scene-star-twinkle {
          0%, 100% { opacity: var(--star-bright); transform: scale(1); }
          50%      { opacity: 0.15; transform: scale(0.6); }
        }
        @keyframes css-scene-star-pulse {
          0%, 100% { box-shadow: 0 0 2px 0px rgba(255,255,255,0.4); }
          50%      { box-shadow: 0 0 6px 2px rgba(200,210,255,0.6); }
        }
        @keyframes css-scene-nebula-drift {
          0%, 100% { opacity: 0.18; transform: scale(1) rotate(0deg); }
          50%      { opacity: 0.28; transform: scale(1.08) rotate(3deg); }
        }
      `}</style>

      {/* Nebula glow */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          right: "-10%",
          width: "60%",
          height: "50%",
          background:
            "radial-gradient(ellipse at 40% 50%, rgba(120,40,160,0.3) 0%, rgba(180,60,120,0.15) 40%, transparent 70%)",
          animation: "css-scene-nebula-drift 15s ease-in-out infinite",
          filter: "blur(40px)",
          willChange: "transform, opacity",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "5%",
          width: "40%",
          height: "35%",
          background:
            "radial-gradient(ellipse at center, rgba(60,80,180,0.2) 0%, transparent 70%)",
          animation: "css-scene-nebula-drift 20s ease-in-out infinite 5s",
          filter: "blur(50px)",
          willChange: "transform, opacity",
        }}
      />

      {/* Stars */}
      {stars.map((s, i) => (
        <div
          key={i}
          style={
            {
              position: "absolute",
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              borderRadius: "50%",
              backgroundColor: `rgba(255,255,255,${s.brightness})`,
              "--star-bright": s.brightness,
              animation: `css-scene-star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite${
                s.size > 2 ? `, css-scene-star-pulse ${s.duration * 1.5}s ease-in-out ${s.delay}s infinite` : ""
              }`,
              willChange: "opacity, transform",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene: Aurora
// ---------------------------------------------------------------------------

const Aurora: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, #020012 0%, #05051a 30%, #0a0f1e 70%, #111a28 100%)",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes css-scene-aurora-wave1 {
          0%   { transform: translateX(-5%) skewX(-5deg) scaleY(1); opacity: 0.45; }
          25%  { transform: translateX(3%) skewX(2deg) scaleY(1.15); opacity: 0.55; }
          50%  { transform: translateX(8%) skewX(5deg) scaleY(0.9); opacity: 0.4; }
          75%  { transform: translateX(2%) skewX(-2deg) scaleY(1.1); opacity: 0.5; }
          100% { transform: translateX(-5%) skewX(-5deg) scaleY(1); opacity: 0.45; }
        }
        @keyframes css-scene-aurora-wave2 {
          0%   { transform: translateX(5%) skewX(3deg) scaleY(1); opacity: 0.35; }
          33%  { transform: translateX(-4%) skewX(-4deg) scaleY(1.2); opacity: 0.5; }
          66%  { transform: translateX(6%) skewX(6deg) scaleY(0.85); opacity: 0.3; }
          100% { transform: translateX(5%) skewX(3deg) scaleY(1); opacity: 0.35; }
        }
        @keyframes css-scene-aurora-wave3 {
          0%   { transform: translateX(0%) skewX(0deg) scaleY(1); opacity: 0.25; }
          50%  { transform: translateX(-6%) skewX(-6deg) scaleY(1.3); opacity: 0.4; }
          100% { transform: translateX(0%) skewX(0deg) scaleY(1); opacity: 0.25; }
        }
        @keyframes css-scene-aurora-shimmer {
          0%, 100% { filter: blur(30px) brightness(1); }
          50%      { filter: blur(40px) brightness(1.2); }
        }
        @keyframes css-scene-star-twinkle-a {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 0.2; }
        }
      `}</style>

      {/* Background stars for the aurora sky */}
      {Array.from({ length: 40 }, (_, i) => {
        const r1 = seededRandom(i * 7 + 100);
        const r2 = seededRandom(i * 13 + 200);
        const r3 = seededRandom(i * 19 + 300);
        return (
          <div
            key={`astar-${i}`}
            style={{
              position: "absolute",
              left: `${r1 * 100}%`,
              top: `${r2 * 100}%`,
              width: `${1 + r3}px`,
              height: `${1 + r3}px`,
              borderRadius: "50%",
              backgroundColor: `rgba(255,255,255,${0.3 + r3 * 0.3})`,
              animation: `css-scene-star-twinkle-a ${2 + r1 * 4}s ease-in-out ${r2 * 5}s infinite`,
            }}
          />
        );
      })}

      {/* Aurora band 1 — green/teal */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "-10%",
          width: "120%",
          height: "35%",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,255,140,0.25) 20%, rgba(0,200,180,0.35) 40%, rgba(0,255,200,0.2) 60%, rgba(80,255,160,0.3) 80%, transparent 100%)",
          filter: "blur(30px)",
          animation: "css-scene-aurora-wave1 12s ease-in-out infinite, css-scene-aurora-shimmer 8s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Aurora band 2 — teal/purple */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "-5%",
          width: "110%",
          height: "28%",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,180,200,0.2) 25%, rgba(100,60,220,0.25) 50%, rgba(0,200,160,0.2) 75%, transparent 100%)",
          filter: "blur(35px)",
          animation: "css-scene-aurora-wave2 16s ease-in-out infinite 2s, css-scene-aurora-shimmer 10s ease-in-out infinite 3s",
          willChange: "transform, opacity",
        }}
      />

      {/* Aurora band 3 — green/bright */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "-8%",
          width: "116%",
          height: "25%",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(60,255,180,0.15) 30%, rgba(0,200,120,0.25) 50%, rgba(120,80,240,0.15) 70%, transparent 100%)",
          filter: "blur(25px)",
          animation: "css-scene-aurora-wave3 20s ease-in-out infinite 4s, css-scene-aurora-shimmer 12s ease-in-out infinite 1s",
          willChange: "transform, opacity",
        }}
      />

      {/* Horizon glow */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "20%",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(10,20,40,0.6) 60%, rgba(15,25,45,0.9) 100%)",
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene: Sunset
// ---------------------------------------------------------------------------

const Sunset: React.FC = () => {
  const clouds = useMemo(() => {
    const result: { top: number; width: number; height: number; delay: number; duration: number; opacity: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const r1 = seededRandom(i * 17 + 41);
      const r2 = seededRandom(i * 29 + 53);
      const r3 = seededRandom(i * 37 + 67);
      result.push({
        top: 10 + r1 * 40,
        width: 120 + r2 * 200,
        height: 30 + r3 * 40,
        delay: r1 * 20,
        duration: 40 + r2 * 40,
        opacity: 0.15 + r3 * 0.2,
      });
    }
    return result;
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, #1a0533 0%, #4a1942 15%, #b7472a 35%, #e8873c 50%, #f4a742 60%, #e8873c 70%, #6b2d5b 85%, #1a1a3e 100%)",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes css-scene-cloud-drift {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(120vw); }
        }
        @keyframes css-scene-sun-pulse {
          0%, 100% { box-shadow: 0 0 60px 20px rgba(255,160,50,0.5), 0 0 120px 60px rgba(255,120,30,0.25); }
          50%      { box-shadow: 0 0 80px 30px rgba(255,180,60,0.6), 0 0 160px 80px rgba(255,140,40,0.3); }
        }
        @keyframes css-scene-sun-glow-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%      { transform: scale(1.1); opacity: 0.45; }
        }
      `}</style>

      {/* Sun */}
      <div
        style={{
          position: "absolute",
          bottom: "32%",
          left: "50%",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,220,120,1) 0%, rgba(255,180,60,0.9) 50%, rgba(255,120,30,0.6) 100%)",
          transform: "translateX(-50%)",
          animation: "css-scene-sun-pulse 6s ease-in-out infinite",
          willChange: "box-shadow",
        }}
      />
      {/* Sun glow ring */}
      <div
        style={{
          position: "absolute",
          bottom: "28%",
          left: "50%",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,200,80,0.2) 0%, transparent 70%)",
          transform: "translateX(-50%)",
          animation: "css-scene-sun-glow-ring 8s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Horizon haze */}
      <div
        style={{
          position: "absolute",
          bottom: "30%",
          left: 0,
          width: "100%",
          height: "15%",
          background:
            "linear-gradient(180deg, transparent, rgba(255,180,80,0.15), transparent)",
          filter: "blur(10px)",
        }}
      />

      {/* Clouds */}
      {clouds.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${c.top}%`,
            left: 0,
            width: `${c.width}px`,
            height: `${c.height}px`,
            borderRadius: "50%",
            background: `rgba(255,200,160,${c.opacity})`,
            filter: "blur(15px)",
            animation: `css-scene-cloud-drift ${c.duration}s linear ${c.delay}s infinite`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene: Forest
// ---------------------------------------------------------------------------

const Forest: React.FC = () => {
  const fireflies = useMemo(() => {
    const result: {
      x: number;
      y: number;
      delay: number;
      driftDuration: number;
      pulseDuration: number;
      size: number;
    }[] = [];
    for (let i = 0; i < 30; i++) {
      const r1 = seededRandom(i * 11 + 71);
      const r2 = seededRandom(i * 23 + 83);
      const r3 = seededRandom(i * 31 + 97);
      const r4 = seededRandom(i * 41 + 113);
      result.push({
        x: r1 * 100,
        y: 15 + r2 * 70,
        delay: r3 * 8,
        driftDuration: 8 + r4 * 12,
        pulseDuration: 2 + r1 * 3,
        size: 2 + r2 * 3,
      });
    }
    return result;
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, #071a0e 0%, #0d2818 30%, #0f3321 55%, #0a2a18 75%, #061a0d 100%)",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes css-scene-firefly-drift {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(15px, -20px); }
          50%  { transform: translate(-10px, -8px); }
          75%  { transform: translate(8px, 12px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes css-scene-firefly-pulse {
          0%, 100% { opacity: 0; box-shadow: 0 0 4px 1px rgba(255,230,100,0.3); }
          15%      { opacity: 1; box-shadow: 0 0 10px 4px rgba(255,230,100,0.6); }
          30%      { opacity: 0.5; box-shadow: 0 0 6px 2px rgba(255,230,100,0.4); }
          45%      { opacity: 0.9; box-shadow: 0 0 12px 5px rgba(255,230,100,0.7); }
          60%      { opacity: 0; box-shadow: 0 0 4px 1px rgba(255,230,100,0.2); }
        }
        @keyframes css-scene-mist-drift {
          0%   { transform: translateX(-5%) scaleX(1); opacity: 0.25; }
          50%  { transform: translateX(5%) scaleX(1.1); opacity: 0.4; }
          100% { transform: translateX(-5%) scaleX(1); opacity: 0.25; }
        }
        @keyframes css-scene-mist-drift2 {
          0%   { transform: translateX(3%); opacity: 0.2; }
          50%  { transform: translateX(-4%); opacity: 0.35; }
          100% { transform: translateX(3%); opacity: 0.2; }
        }
        @keyframes css-scene-forest-canopy {
          0%, 100% { opacity: 0.12; }
          50%      { opacity: 0.2; }
        }
      `}</style>

      {/* Tree canopy shadows (dark overlays at top) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "40%",
          background:
            "radial-gradient(ellipse 80% 100% at 30% 0%, rgba(0,0,0,0.4) 0%, transparent 70%)",
          animation: "css-scene-forest-canopy 10s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "100%",
          height: "35%",
          background:
            "radial-gradient(ellipse 60% 100% at 75% 0%, rgba(0,0,0,0.35) 0%, transparent 65%)",
          animation: "css-scene-forest-canopy 14s ease-in-out infinite 3s",
        }}
      />

      {/* Subtle moonlight filtering through */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "40%",
          width: "20%",
          height: "60%",
          background:
            "linear-gradient(180deg, rgba(180,220,180,0.06) 0%, rgba(180,220,180,0.02) 50%, transparent 100%)",
          filter: "blur(20px)",
          transform: "skewX(-5deg)",
        }}
      />

      {/* Fireflies */}
      {fireflies.map((f, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            borderRadius: "50%",
            backgroundColor: "rgba(255,230,100,0.9)",
            animation: `css-scene-firefly-drift ${f.driftDuration}s ease-in-out ${f.delay}s infinite, css-scene-firefly-pulse ${f.pulseDuration}s ease-in-out ${f.delay}s infinite`,
            willChange: "transform, opacity",
          }}
        />
      ))}

      {/* Mist layer 1 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "-5%",
          width: "110%",
          height: "30%",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(160,200,170,0.08) 40%, rgba(140,180,150,0.18) 100%)",
          filter: "blur(20px)",
          animation: "css-scene-mist-drift 18s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Mist layer 2 */}
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: "-3%",
          width: "106%",
          height: "20%",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(180,210,180,0.06) 50%, rgba(160,200,170,0.14) 100%)",
          filter: "blur(25px)",
          animation: "css-scene-mist-drift2 22s ease-in-out infinite 4s",
          willChange: "transform, opacity",
        }}
      />

      {/* Ground darkening */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "10%",
          background:
            "linear-gradient(180deg, transparent, rgba(4,12,6,0.7))",
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene dispatcher
// ---------------------------------------------------------------------------

const SCENE_MAP: Record<string, React.FC> = {
  "cozy-rain": CozyRain,
  starfield: Starfield,
  aurora: Aurora,
  sunset: Sunset,
  forest: Forest,
};

interface CssSceneProps {
  sceneName: string;
}

/**
 * Renders a fullscreen CSS-only animated background scene.
 * The whole layer is pointer-events: none so it never interferes with UI.
 */
export const CssScene: React.FC<CssSceneProps> = ({ sceneName }) => {
  const SceneComponent = SCENE_MAP[sceneName];
  if (!SceneComponent) return null;
  return <SceneComponent />;
};

export default CssScene;
