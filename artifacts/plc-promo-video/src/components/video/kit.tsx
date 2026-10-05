import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';
import type { CSSProperties, ReactNode } from 'react';

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const EASE_IN = [0.55, 0, 1, 0.45] as const;

export const C = {
  aqua: '#76bf91',
  teal: '#3b7954',
  tealDeep: '#285d3e',
  mint: '#a5d7b2',
  sky: '#cde8d3',
  peach: '#fdb48c',
  coral: '#f2705f',
  ink: '#173324',
  inkSoft: '#55705d',
  bg: '#f5faf6',
  night: '#153726',
  green: '#34875b',
};

/** Glossy drop gradients used for blobs, nodes and hearts. */
export const GLOSS = {
  aqua: `radial-gradient(circle at 32% 26%, rgba(255,255,255,.95) 0 9%, rgba(255,255,255,0) 30%), linear-gradient(150deg, #c5e8cb, ${C.teal})`,
  mint: `radial-gradient(circle at 32% 26%, rgba(255,255,255,.95) 0 9%, rgba(255,255,255,0) 30%), linear-gradient(150deg, #d9f0dc, #66ad79)`,
  peach: `radial-gradient(circle at 32% 26%, rgba(255,255,255,.95) 0 9%, rgba(255,255,255,0) 30%), linear-gradient(150deg, #ffd9c2, ${C.coral})`,
};

/** Text revealed by sliding up out of an overflow mask. */
export function MaskLine({
  show,
  children,
  delay = 0,
  duration = 0.6,
  from = '105%',
  style,
}: {
  show: boolean;
  children: ReactNode;
  delay?: number;
  duration?: number;
  from?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'block',
        overflow: 'hidden',
        paddingBottom: '0.08em',
        marginBottom: '-0.08em',
        ...style,
      }}
    >
      <motion.span
        style={{ display: 'block' }}
        initial={{ y: from }}
        animate={{ y: show ? '0%' : from }}
        transition={{ duration, delay, ease: EASE_OUT }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Hero word: letters rise from a mask with a stagger. */
export function Letters({
  text,
  show,
  stagger = 0.04,
  style,
}: {
  text: string;
  show: boolean;
  stagger?: number;
  style?: CSSProperties;
}) {
  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden', paddingBottom: '0.06em', ...style }}>
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          initial={{ y: '110%', rotate: 8 }}
          animate={show ? { y: '0%', rotate: 0 } : { y: '110%', rotate: 8 }}
          transition={{ duration: 0.55, delay: i * stagger, ease: EASE_OUT }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function Pill({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      className="glass"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '1.6vw',
        padding: '1.4vw 3.4vw',
        borderRadius: '99px',
        fontSize: '3.4vmin',
        fontWeight: 700,
        color: C.ink,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function HeartShape({
  size,
  fill,
  style,
}: {
  size: string;
  fill: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 100 92" style={{ width: size, height: 'auto', display: 'block', ...style }}>
      <defs>
        <linearGradient id={`hg-${fill}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe1d0" />
          <stop offset="1" stopColor={fill} />
        </linearGradient>
      </defs>
      <path
        d="M50 90 C20 68 2 50 2 28 C2 13 14 2 28 2 C38 2 46 8 50 16 C54 8 62 2 72 2 C86 2 98 13 98 28 C98 50 80 68 50 90 Z"
        fill={`url(#hg-${fill})`}
        stroke="rgba(255,255,255,.9)"
        strokeWidth="3"
      />
      <ellipse cx="28" cy="24" rx="10" ry="6" fill="rgba(255,255,255,.75)" transform="rotate(-30 28 24)" />
    </svg>
  );
}

export function formatSpaces(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Returns how many of the given beat times (ms from scene start) have fired. */
export function useBeats(times: number[]) {
  const [beat, setBeat] = useState(0);
  useSceneTimer(times.map((time, i) => ({ time, callback: () => setBeat((b) => Math.max(b, i + 1)) })));
  return beat;
}

/** Steps a number through a list of values at given times. */
export function useStepper<T>(steps: Array<[number, T]>, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useSceneTimer(steps.map(([time, v]) => ({ time, callback: () => setValue(v) })));
  return value;
}

/** 1vw expressed in vh for the 9:16 frame. */
export const VW_IN_VH = 9 / 16;

/**
 * Full-frame scene container. The incoming scene stacks above the outgoing
 * one; the outgoing scene lingers briefly underneath so its handoff carrier
 * is never replaced by an empty frame.
 */
export function SceneRoot({
  children,
  className,
  style,
  initial,
  animate,
  transition,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  initial?: Record<string, string | number>;
  animate?: Record<string, string | number>;
  transition?: Record<string, unknown>;
}) {
  return (
    <motion.div
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 2, ...style }}
      initial={initial ?? false}
      animate={animate}
      transition={transition}
      exit={{ zIndex: 1, opacity: 0, transition: { duration: 0.01, delay: 0.8 } }}
    >
      {children}
    </motion.div>
  );
}
