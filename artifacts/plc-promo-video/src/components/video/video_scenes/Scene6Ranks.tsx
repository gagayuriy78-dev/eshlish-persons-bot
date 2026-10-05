import { motion } from 'framer-motion';
import { C, EASE_IN_OUT, EASE_OUT, GLOSS, MaskLine, SceneRoot, formatSpaces, useBeats, useStepper } from '../kit';
import { ROWS } from './Scene5Friends';

/** Ring centre/diameter of the finale; the #1 row compresses into it. */
export const RING = { x: 50, y: 36, puck: 20 };

type Player = { id: string; name: string; score: number; gloss: string };
const PLAYERS: Player[] = [
  { id: 'dil', name: 'Dilnoza', score: 2480, gloss: GLOSS.mint },
  { id: 'jav', name: 'Javohir', score: 2310, gloss: GLOSS.aqua },
  { id: 'sar', name: 'Sardor', score: 2150, gloss: GLOSS.peach },
  { id: 'azi', name: 'Aziza', score: 1990, gloss: GLOSS.aqua },
  { id: 'bek', name: 'Bekzod', score: 1870, gloss: GLOSS.peach },
  { id: 'mad', name: 'Madina', score: 1760, gloss: GLOSS.mint },
  { id: 'siz', name: 'Siz', score: 1640, gloss: GLOSS.peach },
];
const BASE = PLAYERS.map((p) => p.id);
const without = BASE.filter((id) => id !== 'siz');
const orderAt = (idx: number) => [...without.slice(0, idx), 'siz', ...without.slice(idx)];

export function Scene6Ranks() {
  const order = useStepper<string[]>(
    [
      [1000, orderAt(3)],
      [1600, orderAt(1)],
      [2200, orderAt(0)],
    ],
    BASE,
  );
  const sizScore = useStepper<number>(
    [
      [900, 1760],
      [1000, 2005],
      [1500, 2200],
      [1600, 2340],
      [2100, 2440],
      [2200, 2520],
    ],
    1640,
  );
  // 1 eyebrow, 2 headline, 3 badge flash, 4 handoff, 5 puck
  const b = useBeats([50, 200, 2700, 3350, 3400]);
  const handoff = b >= 4;

  return (
    <SceneRoot
      className="field-aqua"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Headline zone 7-27vh */}
      <motion.div
        style={{ position: 'absolute', top: '7vh', left: '8vw', right: '8vw' }}
        animate={handoff ? { y: '-5vh', opacity: 0 } : {}}
        transition={{ duration: 0.35 }}
      >
        <MaskLine
          show={b >= 1}
          style={{ fontSize: '2.6vmin', fontWeight: 800, letterSpacing: '0.24em', color: C.teal, textTransform: 'uppercase' }}
        >
          Reyting · Haftalik
        </MaskLine>
        <div className="font-display" style={{ color: C.ink, display: 'flex', alignItems: 'baseline', gap: '3vw', flexWrap: 'wrap' }}>
          <MaskLine show={b >= 2} style={{ fontSize: '17vmin', lineHeight: 1 }}>
            Birinchi
          </MaskLine>
          <MaskLine show={b >= 2} delay={0.12} style={{ fontSize: '9vmin', lineHeight: 1, color: C.teal }}>
            bo&apos;ling
          </MaskLine>
        </div>
      </motion.div>

      {PLAYERS.map((p, baseIdx) => {
        const idx = order.indexOf(p.id);
        const me = p.id === 'siz';
        const score = me ? sizScore : p.score;
        return (
          <motion.div
            key={p.id}
            style={{
              position: 'absolute',
              left: '7vw',
              top: `${ROWS.top}vh`,
              width: '86vw',
              height: `${ROWS.height}vh`,
              borderRadius: '3.6vw',
              display: 'flex',
              alignItems: 'center',
              padding: '0 4vw 0 3vw',
              zIndex: me ? 3 : 1,
              color: me ? '#fff' : C.ink,
              background: me
                ? `linear-gradient(160deg, #a5d7b2, ${C.tealDeep})`
                : 'linear-gradient(160deg, rgba(255,255,255,.96), rgba(240,252,252,.88))',
              border: '0.3vmin solid rgba(255,255,255,.95)',
              boxShadow: me ? '0 3vw 6vw -3vw rgba(19,125,136,.7)' : '0 2vw 4vw -3vw rgba(26,110,130,.35)',
            }}
            initial={{ y: `${baseIdx * ROWS.step}vh`, clipPath: 'inset(0% 70% 0% 0% round 3.6vw)' }}
            animate={
              handoff && !me
                ? { y: `${idx * ROWS.step}vh`, opacity: 0, scaleY: 0.3, clipPath: 'inset(0% 0% 0% 0% round 3.6vw)' }
                : handoff && me
                  ? { opacity: 0, y: `${idx * ROWS.step}vh` }
                  : {
                      y: `${idx * ROWS.step}vh`,
                      clipPath: 'inset(0% 0% 0% 0% round 3.6vw)',
                      scale: me && b >= 3 ? [1, 1.04, 1] : 1,
                    }
            }
            transition={{
              y: { type: 'spring', stiffness: 260, damping: 24 },
              clipPath: { duration: 0.55, ease: EASE_OUT, delay: 0.1 + baseIdx * 0.05 },
              opacity: { duration: me ? 0.05 : 0.3, delay: me ? 0.05 : (6 - idx) * 0.03 },
              scaleY: { duration: 0.3 },
              scale: { duration: 0.4 },
            }}
          >
            <motion.span
              className="font-display"
              style={{ width: '8vw', height: '8vw', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '4.8vmin' }}
              animate={{ background: me && b >= 3 ? C.peach : 'rgba(0,0,0,0)', color: me && b >= 3 ? '#5a2312' : me ? '#fff' : C.ink }}
              transition={{ duration: 0.25 }}
            >
              {idx + 1}
            </motion.span>
            <span
              className="font-display"
              style={{
                marginLeft: '3vw',
                width: `${ROWS.avatar}vw`,
                height: `${ROWS.avatar}vw`,
                borderRadius: '50%',
                background: p.gloss,
                border: '0.4vw solid #fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '4vmin',
                color: '#fff',
                flex: 'none',
              }}
            >
              {p.name[0]}
            </span>
            <span style={{ marginLeft: '3.4vw', fontSize: '4.6vmin', fontWeight: 800 }}>{p.name}</span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: '1.4vw' }}>
              <span className="font-display" style={{ fontSize: '5vmin', fontVariantNumeric: 'tabular-nums' }}>
                {formatSpaces(score)}
              </span>
              <span style={{ fontSize: '2.8vmin', fontWeight: 700, opacity: 0.75 }}>ball</span>
            </span>
          </motion.div>
        );
      })}

      {/* Puck: the #1 row compressing into the finale ring */}
      {b >= 5 && (
        <motion.div
          style={{
            position: 'absolute',
            background: `linear-gradient(160deg, #a5d7b2, ${C.tealDeep})`,
            zIndex: 4,
          }}
          initial={{
            left: '7vw',
            top: `${ROWS.top}vh`,
            width: '86vw',
            height: `${ROWS.height}vh`,
            borderRadius: '3.6vw',
          }}
          animate={{
            left: `${RING.x - RING.puck / 2}vw`,
            top: `${RING.y - (RING.puck * (9 / 16)) / 2}vh`,
            width: `${RING.puck}vw`,
            height: `${RING.puck}vw`,
            borderRadius: `${RING.puck / 2}vw`,
          }}
          transition={{ duration: 0.5, ease: EASE_IN_OUT }}
        />
      )}
    </SceneRoot>
  );
}
