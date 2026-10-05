import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

type Tone = "ok" | "info" | "warn";
interface Item { id: number; text: string; tone: Tone }
let listeners: ((i: Item) => void)[] = [];
let seq = 0;

export function toast(text: string, tone: Tone = "info") {
  const item = { id: ++seq, text, tone };
  listeners.forEach((l) => l(item));
}

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const l = (i: Item) => {
      setItems((s) => [...s.slice(-2), i]);
      window.setTimeout(() => setItems((s) => s.filter((x) => x.id !== i.id)), 2600);
    };
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-safe">
      <AnimatePresence>
        {items.map((i) => {
          const Icon = i.tone === "ok" ? CheckCircle2 : i.tone === "warn" ? AlertTriangle : Info;
          return (
            <motion.div key={i.id} data-testid="toast" initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
              className="solid-card flex max-w-sm items-center gap-2.5 px-4 py-3 text-sm font-semibold">
              <Icon className={i.tone === "ok" ? "size-5 text-teal" : i.tone === "warn" ? "size-5 text-coral" : "size-5 text-sky"} />
              {i.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
