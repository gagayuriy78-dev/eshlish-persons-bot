import { AnimatePresence, motion } from 'framer-motion';
import { Check, MapPin, Phone } from 'lucide-react';
import { C, EASE_IN, EASE_OUT, GLOSS, MaskLine, SceneRoot, useBeats, useStepper } from '../kit';
import { PHONE } from './Scene1Hook';

const NUMBER = '+998 90 123 45 67';
const REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand',
  'Buxoro',
  'Andijon',
  "Farg'ona",
  'Namangan',
  'Qashqadaryo',
  'Surxondaryo',
  'Xorazm',
  'Navoiy',
  'Jizzax',
];
const SELECTED = 'Samarqand';

const typeSteps: Array<[number, number]> = NUMBER.split('').map((_, i) => [400 + i * 64, i + 1]);

export function Scene2Signup() {
  // 1 headline, 2 subline, 3 verified, 4 step 2, 5 chips, 6 select, 7 button pulse, 8 push
  const b = useBeats([100, 300, 1600, 1900, 2000, 3200, 3500, 3850]);
  const typed = useStepper(typeSteps, 0);
  const push = b >= 8;
  const step = b >= 4 ? 2 : 1;

  return (
    <SceneRoot className="field-aqua">
      {/* Headline zone: top 7-21vh */}
      <div
        className="font-display"
        style={{ position: 'absolute', top: '7vh', left: '8vw', right: '8vw', color: C.ink }}
      >
        <motion.div
          animate={push ? { y: '-6vh', opacity: 0, filter: 'blur(6px)' } : {}}
          transition={{ duration: 0.4, ease: EASE_IN }}
        >
          <MaskLine show={b >= 1} style={{ fontSize: '12vmin', lineHeight: 0.95 }}>
            2 qadamda
          </MaskLine>
        </motion.div>
        <motion.div
          animate={push ? { y: '-4vh', opacity: 0, filter: 'blur(6px)' } : {}}
          transition={{ duration: 0.4, ease: EASE_IN, delay: 0.05 }}
        >
          <MaskLine show={b >= 2} style={{ fontSize: '7.4vmin', lineHeight: 1.1, color: C.teal }}>
            ro&apos;yxatdan o&apos;ting
          </MaskLine>
        </motion.div>
      </div>

      {/* Shadow lives on its own layer so the pushed plane carries no filter cost. */}
      <motion.div
        style={{
          position: 'absolute',
          left: `${PHONE.left + 4}vw`,
          top: `${PHONE.top + 3}vh`,
          width: `${PHONE.width - 8}vw`,
          height: `${PHONE.height - 4}vh`,
          borderRadius: `${PHONE.radius}vw`,
          boxShadow: '0 4vw 10vw -2vw rgba(26,110,130,.45)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: push ? 0 : 1 }}
        transition={{ duration: push ? 0.15 : 0.5 }}
      />

      {/* Phone */}
      <motion.div
        className="glass"
        style={{
          position: 'absolute',
          left: `${PHONE.left}vw`,
          top: `${PHONE.top}vh`,
          width: `${PHONE.width}vw`,
          height: `${PHONE.height}vh`,
          borderRadius: `${PHONE.radius}vw`,
          overflow: 'hidden',
          transformOrigin: '50% 40%',
        }}
        animate={
          push
            ? { scale: [1, 3.2], y: ['0vh', '-6vh'], opacity: [1, 1, 0], filter: ['blur(0px)', 'blur(2px)', 'blur(14px)'] }
            : {}
        }
        transition={{ duration: 0.65, ease: EASE_IN, times: [0, 0.55, 1] }}
      >
        {/* Status notch + header */}
        <div
          style={{
            position: 'absolute',
            top: '1.6vh',
            left: '50%',
            width: '22vw',
            height: '1.3vh',
            marginLeft: '-11vw',
            borderRadius: 99,
            background: 'rgba(18,52,69,.14)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4.6vh',
            left: '6vw',
            right: '6vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
            <span style={{ width: '6vw', height: '6vw', borderRadius: '50%', background: GLOSS.aqua }} />
            <span className="font-display" style={{ fontSize: '4vmin', color: C.ink }}>
              ISHLISH PERSONS
            </span>
          </div>
          <span
            style={{
              fontSize: '3vmin',
              fontWeight: 700,
              color: C.teal,
              background: 'rgba(118,191,145,.18)',
              padding: '1vw 3vw',
              borderRadius: 99,
            }}
          >
            {step}/2-qadam
          </span>
        </div>
        {/* Progress */}
        <div style={{ position: 'absolute', top: '10vh', left: '6vw', right: '6vw', display: 'flex', gap: '2vw' }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ flex: 1, height: '0.8vh', borderRadius: 99, background: 'rgba(18,52,69,.1)', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: `linear-gradient(90deg, ${C.aqua}, ${C.teal})`, transformOrigin: 'left' }}
                initial={{ scaleX: s === 1 ? 0.15 : 0 }}
                animate={{ scaleX: s === 1 ? (b >= 3 ? 1 : 0.5) : b >= 6 ? 1 : b >= 4 ? 0.3 : 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {step === 1 ? (
            <motion.div
              key="phone"
              style={{ position: 'absolute', top: '14vh', left: '6vw', right: '6vw' }}
              exit={{ y: '-6vh', opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_IN }}
            >
              <div
                style={{
                  width: '15vw',
                  height: '15vw',
                  borderRadius: '50%',
                  background: GLOSS.aqua,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Phone color="#fff" strokeWidth={2.4} style={{ width: '6.4vw', height: '6.4vw' }} />
              </div>
              <div className="font-display" style={{ marginTop: '2.4vh', fontSize: '6.6vmin', lineHeight: 1.05, color: C.ink }}>
                Telefon raqamingizni tasdiqlang
              </div>
              <div style={{ marginTop: '1.6vh', fontSize: '3.3vmin', lineHeight: 1.4, color: C.inkSoft }}>
                Natijalar va sovrinlar sizga tegishli bo&apos;lishi uchun raqamingizni Telegram orqali ulashing.
              </div>
              <div style={{ marginTop: '3vh', fontSize: '3vmin', fontWeight: 700, color: C.inkSoft }}>Telefon raqami</div>
              <div
                style={{
                  marginTop: '1vh',
                  height: '8vh',
                  borderRadius: '4vw',
                  background: '#fff',
                  border: `0.4vmin solid ${b >= 3 ? C.green : 'rgba(59,121,84,.45)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4vw',
                  fontSize: '5.6vmin',
                  fontWeight: 800,
                  color: C.ink,
                  letterSpacing: '0.02em',
                }}
              >
                {NUMBER.slice(0, typed)}
                {b < 3 && (
                  <motion.span
                    style={{ width: '0.6vw', height: '4.4vh', background: C.teal, marginLeft: '0.6vw' }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                )}
              </div>
              <motion.div
                style={{
                  marginTop: '2vh',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2vw',
                  padding: '1.6vw 4vw',
                  borderRadius: 99,
                  background: C.green,
                  color: '#fff',
                  fontSize: '3.6vmin',
                  fontWeight: 800,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: b >= 3 ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              >
                <Check strokeWidth={3} style={{ width: '4.4vw', height: '4.4vw' }} />
                Tasdiqlandi
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="region"
              style={{ position: 'absolute', top: '14vh', left: '6vw', right: '6vw' }}
              initial={{ y: '8vh', opacity: 0 }}
              animate={{ y: '0vh', opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.15 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '3vw' }}>
                <div
                  style={{ width: '11vw', height: '11vw', borderRadius: '50%', background: GLOSS.mint, display: 'grid', placeItems: 'center' }}
                >
                  <MapPin color="#fff" strokeWidth={2.4} style={{ width: '5vw', height: '5vw' }} />
                </div>
                <div className="font-display" style={{ fontSize: '6.6vmin', lineHeight: 1.05, color: C.ink }}>
                  Hududingizni tanlang
                </div>
              </div>
              <div
                style={{
                  marginTop: '2.6vh',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.2vh 2.4vw',
                }}
              >
                {REGIONS.map((r, i) => {
                  const selected = r === SELECTED && b >= 6;
                  return (
                    <motion.div
                      key={r}
                      style={{
                        height: '4.6vh',
                        borderRadius: '3vw',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 3vw',
                        fontSize: '3.3vmin',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: selected ? '#fff' : C.ink,
                        background: selected ? `linear-gradient(160deg, #a5d7b2, ${C.teal})` : '#fff',
                        border: `0.3vmin solid ${selected ? C.teal : 'rgba(18,52,69,.1)'}`,
                      }}
                      initial={{ opacity: 0, y: '2vh', scale: 0.9 }}
                      animate={{ opacity: b >= 5 ? 1 : 0, y: b >= 5 ? '0vh' : '2vh', scale: selected ? 1.06 : b >= 5 ? 1 : 0.9 }}
                      transition={{ duration: 0.35, delay: b >= 6 ? 0 : i * 0.06, ease: EASE_OUT }}
                    >
                      {r}
                    </motion.div>
                  );
                })}
              </div>
              <motion.div
                className="font-display"
                style={{
                  marginTop: '3vh',
                  height: '7.4vh',
                  borderRadius: '4.4vw',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '5vmin',
                  color: '#fff',
                  background: `linear-gradient(160deg, #a5d7b2, ${C.tealDeep})`,
                }}
                initial={{ opacity: 0.35 }}
                animate={b >= 7 ? { opacity: 1, scale: [1, 1.05, 1] } : { opacity: 0.35 }}
                transition={{ duration: 0.4 }}
              >
                Davom etish
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </SceneRoot>
  );
}
