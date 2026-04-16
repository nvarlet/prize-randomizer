import { useEffect, useRef, useState, useMemo } from "react";
import type { Participant } from "./template";
import { playTick, playDing } from "./sounds";
import styles from "./SpinWheel.module.css";

interface Props {
  participants: Participant[];
  spinKey: number;
  onComplete: (winner: Participant) => void;
}

const SLOT_HEIGHT = 64;
const VISIBLE_SLOTS = 7;
const SPIN_DURATION = 4500;
const IDLE_SPEED = 0.3;
const TICK_INTERVAL_SLOTS = 1;

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

export default function SpinWheel({ participants, spinKey, onComplete }: Props) {
  const [displayList, setDisplayList] = useState<Participant[]>([]);
  const [offset, setOffset] = useState(0);
  const [settled, setSettled] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState(-1);
  const animFrameRef = useRef<number>(0);
  const idleFrameRef = useRef<number>(0);
  const idleOffsetRef = useRef(0);

  const idleList = useMemo(() => {
    if (participants.length === 0) return [];
    return buildInfiniteList(participants, 200);
  }, [participants]);

  const idleMaxOffset = useMemo(
    () => Math.max(0, (idleList.length - VISIBLE_SLOTS) * SLOT_HEIGHT),
    [idleList]
  );

  // Idle scroll animation
  useEffect(() => {
    if (participants.length === 0 || spinKey > 0) return;

    let running = true;
    idleOffsetRef.current = 0;

    function tick() {
      if (!running) return;
      idleOffsetRef.current += IDLE_SPEED;
      if (idleOffsetRef.current >= idleMaxOffset) {
        idleOffsetRef.current = 0;
      }
      setOffset(idleOffsetRef.current);
      idleFrameRef.current = requestAnimationFrame(tick);
    }

    setDisplayList([]);
    setSettled(false);
    setWinnerIdx(-1);
    idleFrameRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(idleFrameRef.current);
    };
  }, [participants, spinKey, idleMaxOffset]);

  // Spin animation — triggered by spinKey changes (> 0)
  useEffect(() => {
    if (spinKey === 0 || participants.length === 0) return;

    cancelAnimationFrame(idleFrameRef.current);
    setSettled(false);
    setWinnerIdx(-1);

    const selected = participants[Math.floor(Math.random() * participants.length)];
    const centerSlot = Math.floor(VISIBLE_SLOTS / 2);

    const totalSpinSlots = participants.length * 8;
    const list = buildInfiniteList(participants, totalSpinSlots + VISIBLE_SLOTS);

    const landingIndex = totalSpinSlots - 1;
    list[landingIndex] = selected;

    setDisplayList(list);

    const totalDistance = (landingIndex - centerSlot) * SLOT_HEIGHT;
    const start = performance.now();
    let lastTickSlot = -1;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentOffset = eased * totalDistance;

      setOffset(currentOffset);

      const currentSlot = Math.floor(currentOffset / SLOT_HEIGHT);
      if (currentSlot !== lastTickSlot && currentSlot % TICK_INTERVAL_SLOTS === 0) {
        lastTickSlot = currentSlot;
        playTick();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSettled(true);
        setWinnerIdx(landingIndex);
        playDing();
        onComplete(selected);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [spinKey, participants, onComplete]);

  const listToShow = displayList.length > 0 ? displayList : idleList;

  return (
    <div className={styles.wrapper}>
      <div className={styles.highlight} />
      <div
        className={styles.container}
        style={{ height: SLOT_HEIGHT * VISIBLE_SLOTS }}
      >
        <div
          className={styles.track}
          style={{ transform: `translateY(-${offset}px)` }}
        >
          {listToShow.map((p, i) => (
            <div
              key={i}
              className={`${styles.slot} ${settled && i === winnerIdx ? styles.slotWinner : ""}`}
              style={{ height: SLOT_HEIGHT }}
            >
              <span className={styles.slotName}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.fadeTop} />
      <div className={styles.fadeBottom} />
    </div>
  );
}
