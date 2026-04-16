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
const SPIN_DURATION = 7000;

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

  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const idleList = useMemo(() => {
    if (participants.length === 0) return [];
    return buildInfiniteList(participants, VISIBLE_SLOTS);
  }, [participants]);

  // Only spinKey triggers the animation — refs for everything else
  useEffect(() => {
    if (spinKey === 0) return;

    const currentParticipants = participantsRef.current;
    if (currentParticipants.length === 0) return;

    setSettled(false);
    setWinnerIdx(-1);

    const selected = currentParticipants[Math.floor(Math.random() * currentParticipants.length)];
    const centerSlot = Math.floor(VISIBLE_SLOTS / 2);

    const totalSpinSlots = currentParticipants.length * 8;
    const list = buildInfiniteList(currentParticipants, totalSpinSlots + VISIBLE_SLOTS);

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
      if (currentSlot !== lastTickSlot) {
        lastTickSlot = currentSlot;
        playTick();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSettled(true);
        setWinnerIdx(landingIndex);
        playDing();
        onCompleteRef.current(selected);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [spinKey]);

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
