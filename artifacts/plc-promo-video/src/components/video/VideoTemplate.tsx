import {
  VideoCanvas,
  VideoPausedContext,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';

import { Scene1Hook } from './video_scenes/Scene1Hook';
import { Scene2Signup } from './video_scenes/Scene2Signup';
import { Scene3Ladder } from './video_scenes/Scene3Ladder';
import { Scene4Pro } from './video_scenes/Scene4Pro';
import { Scene5Friends } from './video_scenes/Scene5Friends';
import { Scene6Ranks } from './video_scenes/Scene6Ranks';
import { Scene7Lockup } from './video_scenes/Scene7Lockup';

export const SCENE_DURATIONS = {
  hook: 3500,
  signup: 4500,
  ladder: 6000,
  pro: 6500,
  friends: 4500,
  ranks: 4000,
  lockup: 4000,
};

const SCENES: Record<string, ComponentType> = {
  hook: Scene1Hook,
  signup: Scene2Signup,
  ladder: Scene3Ladder,
  pro: Scene4Pro,
  friends: Scene5Friends,
  ranks: Scene6Ranks,
  lockup: Scene7Lockup,
};

const SCENE_ORDER = Object.keys(SCENE_DURATIONS);
// Global camera: a tiny push and tilt per scene keeps every cut alive.
const CAMERA_TILT = [0, -0.6, 0.5, -0.5, 0.6, -0.4, 0];

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '9:16';

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const baseKey = currentSceneKey.replace(/_r[12]$/, '');
  const Scene = SCENES[baseKey];
  const sceneIndex = Math.max(0, SCENE_ORDER.indexOf(baseKey));

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: 'var(--color-bg-light)' }}>
        <motion.div
          style={{ position: 'absolute', inset: 0 }}
          animate={{ rotate: CAMERA_TILT[sceneIndex] ?? 0, scale: 1.035 + sceneIndex * 0.002 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="sync">
            {Scene && <Scene key={currentSceneKey} />}
          </AnimatePresence>
        </motion.div>
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
