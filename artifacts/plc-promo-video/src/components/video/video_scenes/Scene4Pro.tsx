import { AnimatePresence, motion } from 'framer-motion';
import { C, EASE_IN_OUT, EASE_OUT, HeartShape, SceneRoot, formatSpaces, useBeats, useStepper } from '../kit';
import { PEACH_FIELD } from './Scene3Ladder';

/** Mint field shared with Scene 5; the radial wipe paints it from the surviving heart. */
export const MINT_FIELD = 'linear-gradient(172deg, #ecfcf5 0%, #c3f0dd 55%, #92dfc2 100%)';
/** Centre node of Scene 5 (vw, vh) and its diameter (vw). */
export const NODE = { x: 50, y: 58, size: 26 };

const PRIZE = 1_000_000;
// Ease-out roll of the prize counter over 1.4s.
const counterSteps: Array<[number, number]> = Array.from({ length: 29 }, (_, i) => {
  const t = (i + 1) / 29;
  return [200 + i * 50, Math.round(PRIZE * (1 - Math.pow(1 - t, 3)) / 1000) * 1000];
});
// Timer: Q1 ticks 12 -> 9, Q2 drains 12 -> 0 fast.
const timerSteps: Array<[number, number]> = [
  [1900, 11],
  [2250, 10],
  [2600, 9],
  [3600, 12],
  ...Array.from({ length: 12 }, (_, i) => [3600 + (i + 1) * 108, 11 - i] as [number, number]),
];

const QUESTIONS = [
  { n: 7, text: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'] },
  { n: 8, text: 'If I ___ you, I would study more.', options: ['am', 'was', 'were', 'be'] },
];

const HEART_ROW_Y = 84; // vh centre
const HEART_W = 15; // vw

export function Scene4Pro() {
  const prize = useStepper(counterSteps, 0);
  const secs = useStepper(timerSteps, 12);
  // 1 eyebrow, 2 card content, 3 correct, 4 Q2, 5 timeout, 6 crack, 7 caption, 8 pulse, 9 handoff, 10 ring
  const b = useBeats([100, 550, 2900, 3600, 4900, 4950, 5050, 5300, 5800, 6150]);
  const q = b >= 4 ? QUESTIONS[1] : QUESTIONS[0];
  const handoff = b >= 9;
  const urgent = b >= 4 && secs <= 4;
  const R = 42;
  const circ = 2 * Math.PI * R;

  const hand = handoff ? { opacity: 0, y: '-3vh', filter: 'blur(6px)' } : {};

  return (
    <SceneRoot style={{ background: PEACH_FIELD }}>
      {/* Eyebrow + prize: top zone 7-26vh */}
      <motion.div
        style={{ position: 'absolute', top: '7vh', left: '7vw', right: '7vw', textAlign: 'center' }}
        animate={hand}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          style={{ fontSize: '2.6vmin', fontWeight: 800, letterSpacing: '0.26em', color: '#8a3a22' }}
          initial={{ opacity: 0, letterSpacing: '0.5em' }}
          animate={{ opacity: b >= 1 ? 1 : 0, letterSpacing: '0.26em' }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          PRO SURVIVOR CHALLENGE
        </motion.div>
        <div
          className="font-display"
          style={{ marginTop: '1vh', fontSize: '17vmin', lineHeight: 1, color: '#3b1a12', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatSpaces(prize)}
        </div>
        <div style={{ marginTop: '0.6vh', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '3vw' }}>
          <span className="font-display" style={{ fontSize: '7vmin', color: '#3b1a12' }}>
            so&apos;m
          </span>
          <span
            style={{
              fontSize: '3.3vmin',
              fontWeight: 800,
              color: '#fff',
              background: C.coral,
              padding: '1vw 3vw',
              borderRadius: 99,
            }}
          >
            Bosh sovrin
          </span>
        </div>
      </motion.div>

      {/* Question card: centre zone 30-73vh, flips in from the certificate */}
      <div style={{ position: 'absolute', inset: 0, perspective: '180vw' }}>
        <motion.div
          className="glass"
          style={{
            position: 'absolute',
            left: '7vw',
            top: '28.5vh',
            width: '86vw',
            height: '46vh',
            borderRadius: '6vw',
            boxShadow: '0 5vw 10vw -5vw rgba(120,40,20,.45)',
            padding: '2.4vh 6vw',
          }}
          initial={{ rotateY: -90, rotate: -2 }}
          animate={handoff ? { rotateY: 0, rotate: 0, opacity: 0, y: '-3vh' } : { rotateY: 0, rotate: 0 }}
          transition={{ duration: handoff ? 0.4 : 0.5, ease: EASE_OUT }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{ fontSize: '3.4vmin', fontWeight: 800, color: C.coral, background: 'rgba(242,112,95,.12)', padding: '1vw 3vw', borderRadius: 99 }}
            >
              Savol {q.n}/20
            </span>
            <div style={{ position: 'relative', width: '14vw', height: '14vw' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(18,52,69,.1)" strokeWidth="9" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  animate={{ strokeDashoffset: circ * (1 - secs / 12), stroke: urgent ? C.coral : C.teal }}
                  transition={{ duration: 0.12, ease: 'linear' }}
                />
              </svg>
              <span
                className="font-display"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '5vmin',
                  color: urgent ? C.coral : C.ink,
                }}
              >
                {secs}
              </span>
            </div>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={q.n}
              initial={{ x: '30vw', opacity: 0 }}
              animate={{ x: '0vw', opacity: b >= 2 ? 1 : 0 }}
              exit={{ x: '-30vw', opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <div style={{ marginTop: '1.2vh', fontSize: '3vmin', fontWeight: 600, color: C.inkSoft }}>Choose the correct option:</div>
              <div className="font-display" style={{ marginTop: '0.6vh', fontSize: '5.6vmin', lineHeight: 1.12, color: C.ink, minHeight: '7.6vh' }}>
                {q.text}
              </div>
              <div style={{ marginTop: '1.2vh', display: 'grid', gap: '0.9vh' }}>
                {q.options.map((opt, i) => {
                  const correct = q.n === 7 && i === 1 && b >= 3;
                  const dim = q.n === 8 && b >= 5;
                  return (
                    <motion.div
                      key={opt}
                      style={{
                        height: '5vh',
                        borderRadius: '3.4vw',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3vw',
                        padding: '0 3vw',
                        fontSize: '4.2vmin',
                        fontWeight: 700,
                        border: '0.3vmin solid rgba(18,52,69,.1)',
                      }}
                      animate={{
                        background: correct ? C.green : '#ffffff',
                        color: correct ? '#ffffff' : C.ink,
                        opacity: dim ? 0.4 : 1,
                        scale: correct ? 1.03 : 1,
                      }}
                      transition={{ duration: 0.25 }}
                    >
                      <span
                        style={{
                          width: '7vw',
                          height: '7vw',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '3.3vmin',
                          fontWeight: 800,
                          background: correct ? 'rgba(255,255,255,.25)' : 'rgba(26,154,166,.12)',
                          color: correct ? '#fff' : C.teal,
                        }}
                      >
                        {'ABCD'[i]}
                      </span>
                      {opt}
                      {correct && <span style={{ marginLeft: 'auto', fontSize: '3.3vmin', fontWeight: 800 }}>To&apos;g&apos;ri</span>}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Hearts row */}
      <motion.div
        style={{
          position: 'absolute',
          top: `${HEART_ROW_Y - 7.6}vh`,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '2.6vmin',
          fontWeight: 800,
          letterSpacing: '0.2em',
          color: '#8a3a22',
        }}
        animate={hand}
      >
        YURAKLAR
      </motion.div>

      {/* Heart 2 — cracks on timeout */}
      {[0, 1].map((half) => (
        <motion.div
          key={half}
          style={{
            position: 'absolute',
            left: `${60 - HEART_W / 2}vw`,
            top: `${HEART_ROW_Y}vh`,
            marginTop: `${-HEART_W * 0.46 * (9 / 16)}vh`,
            clipPath: half === 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)',
            transformOrigin: '50% 100%',
          }}
          animate={
            b >= 6
              ? { rotate: half === 0 ? -28 : 28, x: half === 0 ? '-3vw' : '3vw', y: '7vh', opacity: 0 }
              : { rotate: 0, x: '0vw', y: '0vh', opacity: 1 }
          }
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <HeartShape size={`${HEART_W}vw`} fill={C.coral} />
        </motion.div>
      ))}

      {/* Heart 1 — survives, then carries the cut */}
      <motion.div
        style={{
          position: 'absolute',
          left: `${40 - HEART_W / 2}vw`,
          top: `${HEART_ROW_Y}vh`,
          marginTop: `${-HEART_W * 0.46 * (9 / 16)}vh`,
          zIndex: 6,
        }}
        animate={
          b >= 10
            ? { x: '10vw', y: `${NODE.y - HEART_ROW_Y}vh`, scale: 0, opacity: 0 }
            : handoff
              ? { x: '10vw', y: `${NODE.y - HEART_ROW_Y}vh`, scale: 1.7 }
              : b >= 8
                ? { scale: [1, 1.18, 1] }
                : { scale: 1 }
        }
        transition={{ duration: b >= 10 ? 0.3 : handoff ? 0.5 : 0.4, ease: EASE_IN_OUT }}
      >
        <HeartShape size={`${HEART_W}vw`} fill={C.coral} />
      </motion.div>

      {/* Caption */}
      <motion.div
        style={{ position: 'absolute', top: '91vh', left: 0, right: 0, textAlign: 'center' }}
        initial={{ opacity: 0, y: '2vh' }}
        animate={handoff ? { opacity: 0 } : { opacity: b >= 7 ? 1 : 0, y: b >= 7 ? '0vh' : '2vh' }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        <span className="font-display" style={{ fontSize: '5.4vmin', color: '#3b1a12' }}>
          Vaqt tugadi = <span style={{ color: '#b52e1c' }}>−1 yurak</span>
        </span>
      </motion.div>

      {/* Mint radial wipe from the surviving heart */}
      <motion.div
        style={{ position: 'absolute', inset: 0, background: MINT_FIELD, zIndex: 5 }}
        initial={{ clipPath: `circle(0% at 40% ${HEART_ROW_Y}%)` }}
        animate={{ clipPath: handoff ? `circle(150% at 50% ${NODE.y}%)` : `circle(0% at 40% ${HEART_ROW_Y}%)` }}
        transition={{ duration: 0.65, ease: EASE_IN_OUT }}
      />

      {/* Ring that Scene 5 opens on */}
      <motion.div
        style={{
          position: 'absolute',
          left: `${NODE.x - NODE.size / 2}vw`,
          top: `${NODE.y}vh`,
          marginTop: `${-NODE.size * (9 / 16) / 2}vh`,
          width: `${NODE.size}vw`,
          height: `${NODE.size}vw`,
          zIndex: 7,
        }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={b >= 10 ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <NodeRing />
      </motion.div>
    </SceneRoot>
  );
}

/** The "Siz" node; shared visually by Scenes 4 and 5. */
export function NodeRing({ filled = false, label = 'Siz' }: { filled?: boolean; label?: string }) {
  return (
    <div
      className="font-display"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        fontSize: '6.4vmin',
        color: filled ? '#fff' : C.teal,
        background: filled
          ? `radial-gradient(circle at 32% 26%, rgba(255,255,255,.9) 0 8%, rgba(255,255,255,0) 30%), linear-gradient(150deg, #ffd9c2, ${C.coral})`
          : 'linear-gradient(160deg, #ffffff, #effcfa)',
        border: `1.2vw solid ${filled ? '#fff' : C.teal}`,
        boxShadow: '0 3vw 7vw -3vw rgba(20,110,90,.5)',
        transition: 'background .3s, color .3s, border-color .3s',
      }}
    >
      {label}
    </div>
  );
}
