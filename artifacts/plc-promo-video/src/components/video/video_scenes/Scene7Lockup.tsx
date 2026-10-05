import { motion } from 'framer-motion';
import { C, EASE_IN_OUT, EASE_OUT, GLOSS, MaskLine, SceneRoot, VW_IN_VH, useBeats } from '../kit';
import { HOOK_BLOBS } from './Scene1Hook';
import { RING } from './Scene6Ranks';

const RING_D = 64; // vw
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function Scene7Lockup() {
  // 1 ring, 2 wordmark, 3 subline, 4 CTA, 5 support, 6 loop handoff
  const b = useBeats([100, 350, 650, 1200, 1600, 3300]);
  const out = b >= 6;
  const fade = out ? { opacity: 0, y: '-2vh', filter: 'blur(6px)' } : {};

  return (
    <SceneRoot
      style={{ background: `radial-gradient(70% 45% at 50% 36%, #1c4a5c 0%, ${C.night} 70%)` }}
      initial={{ clipPath: 'circle(7% at 50% 36%)' }}
      animate={{ clipPath: 'circle(150% at 50% 36%)' }}
      transition={{ duration: 0.8, ease: EASE_IN_OUT }}
    >
      {/* Slow push on the whole lockup */}
      <motion.div
        style={{ position: 'absolute', inset: 0, transformOrigin: `50% ${RING.y}%` }}
        initial={{ scale: 1 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 3.3, ease: 'linear', delay: 0.4 }}
      >
        {/* Ring with six level ticks */}
        <motion.div
          style={{
            position: 'absolute',
            left: `${RING.x - RING_D / 2}vw`,
            top: `${RING.y - (RING_D * VW_IN_VH) / 2}vh`,
            width: `${RING_D}vw`,
            height: `${RING_D}vw`,
          }}
          animate={out ? { scale: 0.3, opacity: 0, rotate: 40 } : { scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: EASE_IN_OUT }}
        >
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={C.aqua} />
                <stop offset="0.6" stopColor={C.mint} />
                <stop offset="1" stopColor={C.peach} />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
            <motion.circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: b >= 1 ? 1 : 0 }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
            />
            {LEVELS.map((lv, i) => {
              const a = ((-90 + i * 60) * Math.PI) / 180;
              const cx = 100 + Math.cos(a) * 88;
              const cy = 100 + Math.sin(a) * 88;
              const tx = 100 + Math.cos(a) * 66;
              const ty = 100 + Math.sin(a) * 66;
              return (
                <motion.g
                  key={lv}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={b >= 1 ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                >
                  <circle cx={cx} cy={cy} r="7" fill={C.night} stroke={i === 5 ? C.peach : C.aqua} strokeWidth="3" />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,.7)"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 11 }}
                  >
                    {lv}
                  </text>
                </motion.g>
              );
            })}
          </svg>
          <motion.div
            className="font-display"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              fontSize: '15vmin',
              color: '#fff',
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
          >
            PLC
          </motion.div>
        </motion.div>

        {/* Wordmark + CTA */}
        <motion.div
          style={{ position: 'absolute', top: '58vh', left: '6vw', right: '6vw', textAlign: 'center' }}
          animate={fade}
          transition={{ duration: 0.45 }}
        >
          <MaskLine show={b >= 2} style={{ fontSize: '9.5vmin', lineHeight: 1 }}>
            <span className="font-display" style={{ color: '#fff' }}>
              ISHLISH PERSONS
            </span>
          </MaskLine>
          <MaskLine show={b >= 3} style={{ marginTop: '0.8vh', fontSize: '6.6vmin', lineHeight: 1.1 }}>
            <span className="font-display" style={{ color: C.aqua }}>
              English Challenge
            </span>
          </MaskLine>
          <motion.div
            style={{
              marginTop: '4vh',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2.4vw',
              fontSize: '4.8vmin',
              fontWeight: 800,
              color: C.mint,
              borderBottom: `0.5vmin solid ${C.mint}`,
              paddingBottom: '0.8vh',
            }}
            initial={{ y: '2vh', opacity: 0 }}
            animate={{ y: b >= 4 ? '0vh' : '2vh', opacity: b >= 4 ? 1 : 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            <span style={{ width: '2.6vw', height: '2.6vw', borderRadius: '50%', background: C.aqua }} />
            Telegram&apos;da hoziroq boshlang
          </motion.div>
          <motion.div
            style={{ marginTop: '2.4vh', fontSize: '3.4vmin', fontWeight: 600, color: 'rgba(255,255,255,.62)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: b >= 5 ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            Yordam: 91 711 99 66
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Loop handoff: field brightens, ring breaks into the opening's three drops */}
      <motion.div
        className="field-aqua"
        style={{ position: 'absolute', inset: 0, zIndex: 3 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: out ? 1 : 0 }}
        transition={{ duration: 0.55, ease: EASE_IN_OUT, delay: 0.1 }}
      />
      {(['aqua', 'mint', 'peach'] as const).map((k, i) => {
        const g = HOOK_BLOBS[k];
        const startD = 10;
        return (
          <motion.div
            key={k}
            style={{
              position: 'absolute',
              left: `${RING.x - startD / 2}vw`,
              top: `${RING.y - (startD * VW_IN_VH) / 2}vh`,
              width: `${startD}vw`,
              height: `${startD}vw`,
              borderRadius: '50%',
              background: GLOSS[k],
              zIndex: 4,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              out
                ? {
                    x: ['0vw', `${g.left + g.size / 2 - RING.x}vw`, `${g.left + g.size / 2 - RING.x}vw`],
                    y: ['0vh', `${g.top + (g.size * VW_IN_VH) / 2 - RING.y}vh`, `${g.top + (g.size * VW_IN_VH) / 2 - RING.y}vh`],
                    scale: [0.4, (g.size / startD) * 0.9, 0],
                    opacity: [1, 1, 1],
                  }
                : {}
            }
            transition={{ duration: 0.7, ease: EASE_IN_OUT, delay: i * 0.04, times: [0, 0.75, 1] }}
          />
        );
      })}
    </SceneRoot>
  );
}
