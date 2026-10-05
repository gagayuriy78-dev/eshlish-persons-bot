import { motion } from 'framer-motion';
import { C, EASE_IN_OUT, EASE_OUT, GLOSS, MaskLine, SceneRoot, VW_IN_VH, useBeats } from '../kit';
import { MINT_FIELD, NODE, NodeRing } from './Scene4Pro';

const ORBIT = 31; // vw
const FRIEND_SIZE = 18; // vw

/** Leaderboard geometry shared with Scene 6. */
export const ROWS = { top: 30, step: 8.6, height: 7.4, avatarX: 25.5, avatar: 9 };
export const rowCenterY = (i: number) => ROWS.top + i * ROWS.step + ROWS.height / 2;

const FRIENDS = [
  { name: 'Aziza', angle: -90, gloss: GLOSS.aqua, row: 3 },
  { name: 'Bekzod', angle: 30, gloss: GLOSS.peach, row: 4 },
  { name: 'Madina', angle: 150, gloss: GLOSS.mint, row: 5 },
];
const SIZ_ROW = 6;

const pos = (angle: number) => {
  const r = (angle * Math.PI) / 180;
  return { x: NODE.x + Math.cos(r) * ORBIT, y: NODE.y + Math.sin(r) * ORBIT * VW_IN_VH };
};

export function Scene5Friends() {
  // 1 headline, 2 subline, 3-5 friends, 6 burst, 7 footnote, 8 reflow
  const b = useBeats([100, 350, 900, 1400, 1900, 2450, 2800, 3800]);
  const count = Math.min(3, Math.max(0, b - 2));
  const burst = b >= 6;
  const reflow = b >= 8;

  return (
    <SceneRoot style={{ background: MINT_FIELD }}>
      {/* Headline zone 7-30vh */}
      <motion.div
        style={{ position: 'absolute', top: '7vh', left: '8vw', right: '8vw', color: '#0f3b33' }}
        animate={reflow ? { y: '-5vh', opacity: 0 } : {}}
        transition={{ duration: 0.4 }}
      >
        <MaskLine show={b >= 1}>
          <span className="font-display" style={{ fontSize: '24vmin', lineHeight: 0.95 }}>
            3 <span style={{ fontSize: '15vmin' }}>do&apos;st</span>
          </span>
        </MaskLine>
        <MaskLine show={b >= 2} style={{ fontSize: '6.6vmin', lineHeight: 1.1 }}>
          <span className="font-display">= 1 qo&apos;shimcha imkoniyat</span>
        </MaskLine>
      </motion.div>

      {/* Connection lines */}
      {FRIENDS.map((f, i) => (
        <motion.div
          key={`l-${f.name}`}
          style={{
            position: 'absolute',
            left: `${NODE.x}vw`,
            top: `${NODE.y}vh`,
            width: `${ORBIT}vw`,
            height: '0.9vw',
            marginTop: '-0.45vw',
            borderRadius: 99,
            transformOrigin: '0% 50%',
            rotate: f.angle,
            background: `repeating-linear-gradient(90deg, ${C.teal} 0 2.4vw, transparent 2.4vw 3.6vw)`,
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: reflow ? 0 : b >= 3 + i ? 1 : 0, opacity: reflow ? 0 : 1 }}
          transition={{ duration: reflow ? 0.25 : 0.4, ease: EASE_OUT }}
        />
      ))}

      {/* Burst spokes */}
      {Array.from({ length: 10 }, (_, i) => (
        <motion.div
          key={`s-${i}`}
          style={{
            position: 'absolute',
            left: `${NODE.x}vw`,
            top: `${NODE.y}vh`,
            width: '8vw',
            height: '1.2vw',
            marginTop: '-0.6vw',
            borderRadius: 99,
            background: C.coral,
            transformOrigin: '0% 50%',
            rotate: i * 36 + 18,
          }}
          initial={{ x: '0vw', scaleX: 0, opacity: 0 }}
          animate={burst ? { x: ['14vw', '22vw'], scaleX: [0, 1, 0], opacity: [0, 1, 0] } : {}}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
      ))}

      {/* Friend nodes */}
      {FRIENDS.map((f, i) => {
        const p = pos(f.angle);
        const shown = b >= 3 + i;
        return (
          <motion.div
            key={f.name}
            style={{
              position: 'absolute',
              left: `${p.x - FRIEND_SIZE / 2}vw`,
              top: `${p.y}vh`,
              marginTop: `${(-FRIEND_SIZE * VW_IN_VH) / 2}vh`,
              width: `${FRIEND_SIZE}vw`,
              height: `${FRIEND_SIZE}vw`,
            }}
            initial={{ scale: 0 }}
            animate={
              reflow
                ? { scale: ROWS.avatar / FRIEND_SIZE, x: `${ROWS.avatarX - p.x}vw`, y: `${rowCenterY(f.row) - p.y}vh` }
                : { scale: shown ? 1 : 0 }
            }
            transition={reflow ? { duration: 0.65, ease: EASE_IN_OUT, delay: i * 0.04 } : { type: 'spring', stiffness: 340, damping: 16 }}
          >
            <div
              className="font-display"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: f.gloss,
                border: '0.8vw solid #fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '8vmin',
                color: '#fff',
              }}
            >
              {f.name[0]}
            </div>
            <motion.div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '0.8vh',
                fontSize: '3.6vmin',
                fontWeight: 800,
                color: '#0f3b33',
                whiteSpace: 'nowrap',
              }}
              animate={{ opacity: reflow ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {f.name}
            </motion.div>
          </motion.div>
        );
      })}

      {/* Centre node: "Siz" */}
      <motion.div
        style={{
          position: 'absolute',
          left: `${NODE.x - NODE.size / 2}vw`,
          top: `${NODE.y}vh`,
          marginTop: `${(-NODE.size * VW_IN_VH) / 2}vh`,
          width: `${NODE.size}vw`,
          height: `${NODE.size}vw`,
          zIndex: 2,
        }}
        animate={
          reflow
            ? { scale: ROWS.avatar / NODE.size, x: `${ROWS.avatarX - NODE.x}vw`, y: `${rowCenterY(SIZ_ROW) - NODE.y}vh` }
            : burst
              ? { scale: [1, 1.18, 1] }
              : { scale: 1 }
        }
        transition={{ duration: reflow ? 0.65 : 0.45, ease: EASE_IN_OUT }}
      >
        <NodeRing filled={burst} label={reflow ? 'S' : 'Siz'} />
      </motion.div>

      {/* Counter pill → +1 chance, bottom zone 78-92vh */}
      <motion.div
        style={{ position: 'absolute', top: '79vh', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
        initial={{ opacity: 0, y: '2vh' }}
        animate={reflow ? { opacity: 0, y: '3vh' } : { opacity: b >= 3 ? 1 : 0, y: b >= 3 ? '0vh' : '2vh' }}
        transition={{ duration: 0.35 }}
      >
        <motion.div
          className="glass"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3vw',
            padding: '1.8vw 4.4vw',
            borderRadius: 99,
            boxShadow: '0 2vw 5vw -3vw rgba(20,110,90,.5)',
          }}
          animate={burst ? { scale: [1, 1.12, 1], background: C.coral } : {}}
          transition={{ duration: 0.45 }}
        >
          {burst ? (
            <span className="font-display" style={{ fontSize: '6vmin', color: '#fff' }}>
              +1 imkoniyat
            </span>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1.2vw' }}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    style={{ width: '7vw', height: '1.6vw', borderRadius: 99 }}
                    animate={{ background: count > i ? C.teal : 'rgba(18,52,69,.14)' }}
                    transition={{ duration: 0.25 }}
                  />
                ))}
              </div>
              <span style={{ fontSize: '4.4vmin', fontWeight: 800, color: '#0f3b33' }}>{count}/3 do&apos;st</span>
            </>
          )}
        </motion.div>
      </motion.div>

      <motion.div
        style={{
          position: 'absolute',
          top: '88.5vh',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '3.6vmin',
          fontWeight: 700,
          color: '#1d5a4c',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: reflow ? 0 : b >= 7 ? 1 : 0, y: b >= 7 ? '0vh' : '1.5vh' }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        Har bir do&apos;st uchun +50 ball
      </motion.div>
    </SceneRoot>
  );
}
