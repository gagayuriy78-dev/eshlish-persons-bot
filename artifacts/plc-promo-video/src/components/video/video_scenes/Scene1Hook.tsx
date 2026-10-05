import { motion } from 'framer-motion';
import { C, EASE_IN_OUT, EASE_OUT, GLOSS, Letters, MaskLine, SceneRoot, useBeats } from '../kit';

/** Blob resting positions; Scene 7's loop handoff flies its blobs to these. */
export const HOOK_BLOBS = {
  aqua: { left: 5, top: 14, size: 40 },
  mint: { left: 58, top: 18, size: 31 },
  peach: { left: 37, top: 28, size: 23 },
};

/** Phone frame geometry shared with Scene 2. */
export const PHONE = { left: 10, top: 25, width: 80, height: 71, radius: 8 };

const pop = { type: 'spring' as const, stiffness: 320, damping: 15 };

export function Scene1Hook() {
  // 1 aqua, 2 eyebrow, 3 mint, 4 peach, 5 hero, 6 line1, 7 line2, 8 tag, 9 morph
  const b = useBeats([0, 150, 450, 900, 1350, 1700, 1950, 2400, 2900]);
  const morph = b >= 9;

  const textExit = morph
    ? { y: '-40%', opacity: 0, filter: 'blur(8px)' }
    : { y: '0%', opacity: 1, filter: 'blur(0px)' };

  const blob = (key: 'aqua' | 'mint', show: boolean, drift: number) => {
    const g = HOOK_BLOBS[key];
    return (
      <motion.div
        style={{
          position: 'absolute',
          left: `${g.left}vw`,
          top: `${g.top}vh`,
          width: `${g.size}vw`,
          height: `${g.size}vw`,
          borderRadius: '50%',
          background: GLOSS[key],
          boxShadow: 'inset 0 -2vw 4vw rgba(0,60,70,.18)',
        }}
        initial={{ scale: 0 }}
        animate={
          morph
            ? { scale: 0.85, y: `${-drift * 2}vh`, opacity: 0.55 }
            : { scale: show ? 1 : 0, y: show ? `${drift}vh` : '0vh' }
        }
        transition={
          morph
            ? { duration: 0.6, ease: EASE_IN_OUT }
            : { scale: pop, y: { duration: 2.6, ease: 'easeInOut' } }
        }
      />
    );
  };

  const pg = HOOK_BLOBS.peach;

  return (
    <SceneRoot className="field-aqua">
      {blob('aqua', b >= 1, -1.2)}
      {blob('mint', b >= 3, 1.4)}

      {/* Peach drop: grows into the phone frame of Scene 2. */}
      <motion.div
        style={{ position: 'absolute', overflow: 'hidden', zIndex: 3 }}
        initial={{
          left: `${pg.left}vw`,
          top: `${pg.top}vh`,
          width: `${pg.size}vw`,
          height: `${pg.size}vw`,
          borderRadius: `${pg.size / 2}vw`,
          scale: 0,
        }}
        animate={
          morph
            ? {
                left: `${PHONE.left}vw`,
                top: `${PHONE.top}vh`,
                width: `${PHONE.width}vw`,
                height: `${PHONE.height}vh`,
                borderRadius: `${PHONE.radius}vw`,
                scale: 1,
              }
            : { scale: b >= 4 ? 1 : 0 }
        }
        transition={morph ? { duration: 0.6, ease: EASE_IN_OUT } : { scale: pop }}
      >
        <div style={{ position: 'absolute', inset: 0, background: GLOSS.peach }} />
        <motion.div
          className="glass"
          style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: morph ? 1 : 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        />
      </motion.div>

      {/* Eyebrow */}
      <motion.div
        style={{
          position: 'absolute',
          top: '8vh',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '2.5vmin',
          fontWeight: 800,
          color: C.teal,
          textTransform: 'uppercase',
        }}
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={
          morph
            ? { opacity: 0, y: '-3vh', letterSpacing: '0.28em' }
            : { opacity: b >= 2 ? 1 : 0, letterSpacing: b >= 2 ? '0.28em' : '0.6em' }
        }
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        ISHLISH PERSONS · English Challenge
      </motion.div>

      {/* Hero word + supporting lines */}
      <motion.div
        style={{ position: 'absolute', top: '45vh', left: '-2vw', right: '-2vw', zIndex: 4 }}
        animate={textExit}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      >
        <div
          className="font-display"
          style={{ fontSize: '29vmin', lineHeight: 0.9, color: C.ink, textAlign: 'center' }}
        >
          <Letters text="INGLIZ" show={b >= 5} />
        </div>
        <div
          className="font-display"
          style={{ marginTop: '2vh', paddingLeft: '8vw', fontSize: '10.5vmin', lineHeight: 1.02, color: C.ink }}
        >
          <MaskLine show={b >= 6}>tilingizni</MaskLine>
          <MaskLine show={b >= 7} style={{ color: C.teal }}>
            sinab ko&apos;ring
          </MaskLine>
        </div>
      </motion.div>

      {/* Tag */}
      <motion.div
        style={{ position: 'absolute', top: '82vh', left: '8vw', zIndex: 4 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={morph ? { opacity: 0, y: '3vh' } : { scale: b >= 8 ? 1 : 0, opacity: b >= 8 ? 1 : 0 }}
        transition={morph ? { duration: 0.35 } : pop}
      >
        <span
          className="glass glass-shadow"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2.4vw',
            padding: '2vw 4.4vw',
            borderRadius: 99,
            fontSize: '3.6vmin',
            fontWeight: 700,
            color: C.ink,
          }}
        >
          <span style={{ width: '3vw', height: '3vw', borderRadius: '50%', background: C.teal }} />
          Telegram Mini App
        </span>
      </motion.div>
    </SceneRoot>
  );
}
