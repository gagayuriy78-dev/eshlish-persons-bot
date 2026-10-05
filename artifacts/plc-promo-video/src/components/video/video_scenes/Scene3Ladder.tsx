import { AnimatePresence, motion } from 'framer-motion';
import { C, EASE_IN, EASE_IN_OUT, EASE_OUT, MaskLine, Pill, SceneRoot, useBeats, useStepper } from '../kit';

const LEVELS = [
  { code: 'A1', name: "Boshlang'ich" },
  { code: 'A2', name: 'Elementar' },
  { code: 'B1', name: "O'rta" },
  { code: 'B2', name: "O'rtadan yuqori" },
  { code: 'C1', name: 'Yuqori' },
  { code: 'C2', name: 'Mukammal' },
];
const TILE_H = 15; // vh
const tileTop = (i: number) => 76 - i * 24; // vh, world space
const tileLeft = (i: number) => (i % 2 === 0 ? 10 : 28); // vw

/** Peach field shared with Scene 4 so the wipe hands off seamlessly. */
export const PEACH_FIELD = 'linear-gradient(172deg, #ffe9db 0%, #fdbf9c 55%, #f89c80 100%)';

type Pose = { y: string; scale: number; d: number; ease: readonly number[] };
const POSES: Record<string, Pose> = {
  a1: { y: '0vh', scale: 1, d: 0, ease: EASE_OUT },
  b1: { y: '30vh', scale: 1, d: 1.2, ease: EASE_IN_OUT },
  c2: { y: '102vh', scale: 1, d: 1.4, ease: EASE_IN_OUT },
  wide: { y: '20.6vh', scale: 0.62, d: 0.9, ease: EASE_OUT },
};

export function Scene3Ladder() {
  const pose = useStepper<keyof typeof POSES>(
    [
      [300, 'b1'],
      [2200, 'c2'],
      [4000, 'wide'],
    ],
    'a1',
  );
  const lit = useStepper<number>(
    [
      [300, 1],
      [900, 2],
      [1400, 3],
      [2600, 4],
      [3100, 5],
      [3600, 6],
    ],
    0,
  );
  // 1 eyebrow, 2 headline, 3 callout1, 4 callout2, 5 callouts out, 6 cert, 7 seal, 8 flip
  const b = useBeats([100, 250, 1600, 2800, 4000, 4200, 4800, 5350]);
  const flip = b >= 8;
  const p = POSES[pose];

  return (
    <SceneRoot
      className="field-aqua"
      initial={{ scale: 1.5, filter: 'blur(12px)', opacity: 0.3 }}
      animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
    >
      <div className="dots" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />

      {/* Camera over the ladder world */}
      <motion.div
        style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%' }}
        animate={{ y: p.y, scale: p.scale }}
        transition={{ duration: p.d, ease: p.ease as [number, number, number, number] }}
      >
        {LEVELS.map((lv, i) => {
          const on = lit > i;
          return (
            <div key={lv.code}>
              {/* rail segment to the next tile */}
              {i < LEVELS.length - 1 && (
                <motion.div
                  style={{
                    position: 'absolute',
                    left: '49.5vw',
                    top: `${tileTop(i + 1) + TILE_H}vh`,
                    width: '1vw',
                    height: `${24 - TILE_H}vh`,
                    borderRadius: 99,
                    transformOrigin: 'bottom',
                    background: `linear-gradient(0deg, ${C.aqua}, ${C.mint})`,
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: lit > i + 1 ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                />
              )}
              <motion.div
                className="glass"
                style={{
                  position: 'absolute',
                  left: `${tileLeft(i)}vw`,
                  top: `${tileTop(i)}vh`,
                  width: '62vw',
                  height: `${TILE_H}vh`,
                  borderRadius: '6vw',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4vw',
                  padding: '0 6vw',
                  boxShadow: '0 3vw 7vw -4vw rgba(26,110,130,.45)',
                }}
                animate={{
                  background: on
                    ? `linear-gradient(160deg, #a5d7b2, ${C.teal})`
                    : 'linear-gradient(160deg, rgba(255,255,255,.95), rgba(240,252,252,.85))',
                  scale: on && lit === i + 1 ? 1.06 : 1,
                }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <span
                  className="font-display"
                  style={{ fontSize: '15vmin', lineHeight: 1, color: on ? '#fff' : C.ink }}
                >
                  {lv.code}
                </span>
                <span
                  style={{
                    fontSize: '4vmin',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: on ? 'rgba(255,255,255,.92)' : C.inkSoft,
                  }}
                >
                  {lv.name}
                </span>
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* HUD — stays readable over the moving world */}
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: '27vh',
          background: 'linear-gradient(180deg, #f3fbfb 0%, #f3fbfb 62%, rgba(243,251,251,0) 100%)',
        }}
      />
      <div style={{ position: 'absolute', top: '7vh', left: '8vw', right: '8vw' }}>
        <MaskLine
          show={b >= 1}
          style={{ fontSize: '2.6vmin', fontWeight: 800, letterSpacing: '0.24em', color: C.teal, textTransform: 'uppercase' }}
        >
          Basic test
        </MaskLine>
        <MaskLine show={b >= 2} style={{ marginTop: '1vh', fontSize: '10.5vmin', lineHeight: 1 }}>
          <span className="font-display" style={{ color: C.ink }}>
            A1 dan C2 gacha
          </span>
        </MaskLine>
      </div>

      {/* Callouts — one at a time, bottom zone */}
      <div style={{ position: 'absolute', top: '86vh', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence>
          {b >= 3 && b < 4 && (
            <motion.div
              key="c1"
              style={{ position: 'absolute' }}
              initial={{ y: '3vh', opacity: 0, scale: 0.9 }}
              animate={{ y: '0vh', opacity: 1, scale: 1 }}
              exit={{ y: '-2vh', opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <Pill style={{ fontSize: '4.2vmin', boxShadow: '0 2vw 5vw -3vw rgba(26,110,130,.5)' }}>20 ta savol</Pill>
            </motion.div>
          )}
          {b >= 4 && b < 5 && (
            <motion.div
              key="c2"
              style={{ position: 'absolute' }}
              initial={{ y: '3vh', opacity: 0, scale: 0.9 }}
              animate={{ y: '0vh', opacity: 1, scale: 1 }}
              exit={{ y: '-2vh', opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <Pill style={{ fontSize: '4.2vmin', boxShadow: '0 2vw 5vw -3vw rgba(26,110,130,.5)' }}>
                <b style={{ color: C.teal }}>70%</b> — daraja tasdiqlanadi
              </Pill>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Peach wipe toward the PRO shot */}
      <motion.div
        style={{ position: 'absolute', inset: 0, background: PEACH_FIELD, zIndex: 5 }}
        initial={{ clipPath: 'polygon(0% 0%, -10% 0%, -50% 100%, 0% 100%)' }}
        animate={{
          clipPath: flip
            ? 'polygon(0% 0%, 150% 0%, 110% 100%, 0% 100%)'
            : 'polygon(0% 0%, -10% 0%, -50% 100%, 0% 100%)',
        }}
        transition={{ duration: 0.55, ease: EASE_IN_OUT, delay: 0.05 }}
      />

      {/* Certificate rising from depth */}
      <div style={{ position: 'absolute', inset: 0, perspective: '180vw', zIndex: 6, pointerEvents: 'none' }}>
        <motion.div
          style={{
            position: 'absolute',
            left: '10vw',
            top: '31vh',
            width: '80vw',
            height: '46vh',
            borderRadius: '5vw',
            background: '#fffdf8',
            border: `0.8vmin solid ${C.teal}`,
            boxShadow: '0 5vw 12vw -4vw rgba(18,52,69,.45)',
            overflow: 'hidden',
          }}
          initial={{ opacity: 0, y: '30vh', scale: 0.6, rotateX: 25, rotateY: 0 }}
          animate={
            flip
              ? { opacity: 1, y: '0vh', scale: 1, rotateX: 0, rotateY: 90 }
              : b >= 6
                ? { opacity: 1, y: '0vh', scale: 1, rotateX: 0, rotateY: 0, rotate: -2 }
                : { opacity: 0, y: '30vh', scale: 0.6, rotateX: 25 }
          }
          transition={flip ? { duration: 0.35, ease: EASE_IN } : { duration: 0.8, ease: EASE_OUT }}
        >
          <div className="dots" style={{ position: 'absolute', inset: 0, opacity: 0.7 }} />
          <div
            style={{
              position: 'absolute',
              inset: '1.6vw',
              borderRadius: '3.6vw',
              border: `0.3vmin solid rgba(26,154,166,.5)`,
            }}
          />
          <div style={{ position: 'absolute', top: '4.2vh', left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '2.6vmin', fontWeight: 800, letterSpacing: '0.3em', color: C.inkSoft }}>PERSONS LC</div>
            <div className="font-display" style={{ marginTop: '0.6vh', fontSize: '9vmin', color: C.teal, letterSpacing: '0.04em' }}>
              SERTIFIKAT
            </div>
            <div style={{ fontSize: '3.3vmin', fontWeight: 600, color: C.inkSoft }}>Ingliz tili darajasi</div>
            <div className="font-display" style={{ marginTop: '0.4vh', fontSize: '24vmin', lineHeight: 1, color: C.ink }}>
              B2
            </div>
            <div style={{ fontSize: '4.4vmin', fontWeight: 700, color: C.ink }}>O&apos;rtadan yuqori</div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: '7vw',
              bottom: '4.4vh',
              fontSize: '3.6vmin',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: C.ink,
            }}
          >
            PLC-B2-7K4Q
          </div>
          <motion.div
            className="font-display"
            style={{
              position: 'absolute',
              right: '6vw',
              bottom: '2.6vh',
              width: '17vw',
              height: '17vw',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: '4.4vmin',
              color: '#fff',
              background: `radial-gradient(circle at 35% 30%, #ffd2b8, ${C.coral})`,
              border: '0.6vmin dashed rgba(255,255,255,.8)',
            }}
            initial={{ scale: 2.4, opacity: 0, rotate: -30 }}
            animate={b >= 7 ? { scale: 1, opacity: 1, rotate: -10 } : { scale: 2.4, opacity: 0, rotate: -30 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          >
            PLC
          </motion.div>
        </motion.div>
      </div>
    </SceneRoot>
  );
}
