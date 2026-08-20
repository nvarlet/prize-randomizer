import { useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Participant } from "./template";
import { playTick, playLand } from "./sounds";
import styles from "./SpinWheel.module.css";

interface Props {
  participants: Participant[];
  spinKey: number;
  isFullscreen: boolean;
  onComplete: (winner: Participant) => void;
}

/** Rows visible through the window. Mirrored by --visible in the stylesheet. */
const VISIBLE_SLOTS = 7;
const CENTER_SLOT = Math.floor(VISIBLE_SLOTS / 2);

/* The draw behaves like a physical wheel: it winds up from rest, holds a fast
   blurred cruise, then spends a long time ratcheting down onto the winner.
   Distance is solved from the timings below rather than set separately, so the
   reel always comes to rest centred on a name instead of between two. */

/** Winding up, so the draw opens with slow deliberate clicks. */
const LAUNCH_MS = 1200;
/** The long deceleration. This is where the tension lives. */
const SETTLE_MS = 7000;
/** Press to winner. Long enough that the room actually builds. */
const SPIN_MS = 18000;
/** Time one name takes to pass at cruising speed. */
const NAME_MS = 22;

const SPAN_MS = SPIN_MS - LAUNCH_MS / 2 - (2 * SETTLE_MS) / 3;
const TRAVEL = Math.round(SPAN_MS / NAME_MS);
const SPEED = TRAVEL / SPAN_MS;
const LANDING_INDEX = TRAVEL + CENTER_SLOT;
const TOTAL_SLOTS = LANDING_INDEX + VISIBLE_SLOTS;

const CRUISE_PER_FRAME = SPEED * (1000 / 60);
/** Clicks run finer than the names, because the settle crawls under one name
 *  at the end and would otherwise fall silent as it seats. */
const TICK_STEPS_PER_SLOT = 3;
/** Smear per name travelled in a frame, in em so it scales when projected. */
const BLUR_PER_SLOT = 0.36;
const MAX_BLUR = 0.3;

/** Wind up, cruise, then ease down to rest exactly on the winner. */
function reelPos(t: number): number {
  if (t >= SPIN_MS) return TRAVEL;

  const launched = (SPEED * LAUNCH_MS) / 2;
  if (t < LAUNCH_MS) {
    const x = t / LAUNCH_MS;
    return launched * x * x;
  }

  const cruiseEnd = SPIN_MS - SETTLE_MS;
  const cruised = launched + SPEED * (Math.min(t, cruiseEnd) - LAUNCH_MS);
  if (t < cruiseEnd) return cruised;

  // Velocity decays as (1 - y)², so the last names tick past one at a time.
  const y = (t - cruiseEnd) / SETTLE_MS;
  return cruised + (SPEED * SETTLE_MS * (1 - Math.pow(1 - y, 3))) / 3;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildInfiniteList(participants: Participant[], totalSlots: number): Participant[] {
  const result: Participant[] = [];
  while (result.length < totalSlots) {
    result.push(...shuffle(participants));
  }
  return result.slice(0, totalSlots);
}

export default function SpinWheel({ participants, spinKey, isFullscreen, onComplete }: Props) {
  const [displayList, setDisplayList] = useState<Participant[]>([]);
  const [settled, setSettled] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const idleList = useMemo(
    () => (participants.length === 0 ? [] : buildInfiniteList(participants, VISIBLE_SLOTS)),
    [participants]
  );

  /* The reel is driven straight onto the element. Asking React to reconcile
     three hundred rows every frame is what would cost a projector laptop its
     frame rate, and the position is the only thing changing. */
  const paint = useCallback((slots: number, blur: number) => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.setProperty("--shift", `${((slots / TOTAL_SLOTS) * 100).toFixed(4)}%`);
    el.style.setProperty("--blur", `${blur.toFixed(3)}em`);
  }, []);

  useLayoutEffect(() => {
    if (spinKey === 0) return;

    const pool = participantsRef.current;
    if (pool.length === 0) return;

    const selected = pool[Math.floor(Math.random() * pool.length)];
    const list = buildInfiniteList(pool, TOTAL_SLOTS);
    list[LANDING_INDEX] = selected;

    setSettled(false);
    setDisplayList(list);
    // Rewound before the browser paints, so a new draw can't flash up at the
    // offset the previous one finished on.
    paint(0, 0);

    const start = performance.now();
    let previous = 0;
    let lastStep = 0;

    function frame(now: number) {
      const t = now - start;
      const slots = reelPos(t);
      const perFrame = slots - previous;
      previous = slots;

      if (t < SPIN_MS) {
        paint(slots, Math.min(MAX_BLUR, perFrame * BLUR_PER_SLOT));

        const step = Math.floor(slots * TICK_STEPS_PER_SLOT);
        if (step !== lastStep) {
          lastStep = step;
          // Weighted by distance covered this frame, so the wheel audibly winds
          // up and then loses momentum rather than only changing tempo.
          playTick(1 - Math.min(1, perFrame / CRUISE_PER_FRAME));
        }

        rafRef.current = requestAnimationFrame(frame);
      } else {
        paint(TRAVEL, 0);
        setSettled(true);
        // playLand carries the final click, so no tick is fired on this frame.
        playLand();
        onCompleteRef.current(selected);
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinKey, paint]);

  const list = displayList.length > 0 ? displayList : idleList;

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrapper} ${isFullscreen ? styles.wrapperLarge : ""}`}
    >
      <div className={styles.container}>
        <div className={styles.track}>
          {list.map((p, i) => (
            <div
              key={i}
              className={`${styles.slot} ${
                settled && i === LANDING_INDEX ? styles.slotWinner : ""
              }`}
            >
              <span className={styles.slotName}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.fadeTop} />
      <div className={styles.fadeBottom} />
      <div className={styles.highlight} />
    </div>
  );
}
