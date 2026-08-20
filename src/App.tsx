import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, Download, Sparkles, RotateCcw, Users, X, ChevronDown, ChevronUp, Loader2, Maximize, Minimize, Volume2, VolumeX, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { downloadTemplate, parseSpreadsheet, type Participant } from "./template";
import { primeAudio, setMuted, isMuted } from "./sounds";
import SpinWheel from "./SpinWheel";
import styles from "./App.module.css";

type AppState = "upload" | "loading" | "ready" | "spinning" | "winner";

export default function App() {
  const [state, setState] = useState<AppState>("upload");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [dupeCount, setDupeCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [winner, setWinner] = useState<Participant | null>(null);
  const [pastWinners, setPastWinners] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const [excludePast, setExcludePast] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [showPast, setShowPast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundOff, setSoundOff] = useState(isMuted);

  const toggleSound = useCallback(() => {
    setSoundOff((off) => {
      setMuted(!off);
      if (off) primeAudio();
      return !off;
    });
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setDupeCount(0);
    setState("loading");

    try {
      const data = await file.arrayBuffer();
      const { participants: parsed, duplicatesRemoved } = parseSpreadsheet(data);
      setParticipants(parsed);
      setDupeCount(duplicatesRemoved);
      setFileName(file.name);
      setState("ready");
      setPastWinners([]);
      setWinner(null);
      setSpinKey(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
      setState("upload");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const eligibleParticipants = useMemo(
    () =>
      excludePast
        ? participants.filter(
            (p) => !pastWinners.some((w) => w.name === p.name && w.email === p.email)
          )
        : participants,
    [participants, pastWinners, excludePast]
  );

  const handleSpin = useCallback(() => {
    if (eligibleParticipants.length === 0) return;
    // Opened here, inside the gesture, so the first tick isn't swallowed by the
    // browser's autoplay policy.
    primeAudio();
    setWinner(null);
    setState("spinning");
    setSpinKey((k) => k + 1);
  }, [eligibleParticipants]);

  const handleSpinComplete = useCallback((selected: Participant) => {
    setWinner(selected);
    setPastWinners((prev) => [...prev, selected]);
    setState("winner");

    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.65 },
      colors: ["#123a4f", "#2c6180", "#7fa3b8", "#d7e2e9"],
      gravity: 1.2,
      scalar: 0.8,
      drift: 0,
      ticks: 120,
      disableForReducedMotion: true,
    });
  }, []);

  const handleReset = useCallback(() => {
    setState("upload");
    setParticipants([]);
    setDupeCount(0);
    setFileName("");
    setWinner(null);
    setPastWinners([]);
    setError("");
    setSpinKey(0);
    setShowPast(false);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // A focused button already fires on Space, so let it handle itself.
      if (e.target instanceof HTMLButtonElement) return;
      if (e.key !== " " && e.key !== "Enter") return;
      // Available straight after a win too, so consecutive prizes are one press.
      if (state !== "ready" && state !== "winner") return;
      if (eligibleParticipants.length === 0) return;

      e.preventDefault();
      handleSpin();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, eligibleParticipants, handleSpin]);

  const isDrawScreen = state !== "upload" && state !== "loading";

  return (
    <div className={`${styles.app} ${isFullscreen ? styles.fullscreen : ""}`}>
      <header className={`${styles.header} ${isFullscreen ? styles.headerFs : ""}`}>
        <div className={styles.headerInner}>
          <img src="/ifys-logo.png" alt="IFYS — Strengthening the Human Spirit" className={styles.logo} />
          <div className={styles.headerRight}>
            {isDrawScreen && !isFullscreen && (
              <button className={styles.resetBtn} onClick={handleReset}>
                <RotateCcw size={15} />
                Start Over
              </button>
            )}
            {isDrawScreen && (
              <>
                <button
                  className={styles.fsBtn}
                  onClick={toggleSound}
                  title={soundOff ? "Turn sound on" : "Turn sound off"}
                >
                  {soundOff ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  className={styles.fsBtn}
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {(state === "upload" || state === "loading") && (
          <div className={styles.uploadSection}>
            <div className={styles.heroText}>
              <h1>Prize Randomiser</h1>
              <p>Import your participant list to randomly select a winner.</p>
            </div>

            <div
              className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div className={styles.dropzoneInner}>
                {state === "loading" ? (
                  <>
                    <div className={styles.dropzoneIcon}>
                      <Loader2 size={28} className={styles.spinner} />
                    </div>
                    <p className={styles.dropzoneTitle}>Reading spreadsheet...</p>
                  </>
                ) : (
                  <>
                    <div className={styles.dropzoneIcon}>
                      <Upload size={28} />
                    </div>
                    <p className={styles.dropzoneTitle}>Drop your spreadsheet here</p>
                    <p className={styles.dropzoneSub}>or click to browse — .xlsx, .xls, .csv</p>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleInputChange}
                  className={styles.fileInput}
                  disabled={state === "loading"}
                />
              </div>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <X size={15} />
                {error}
              </div>
            )}

            <div className={styles.templateCta}>
              <span>Need a starting point?</span>
              <button onClick={downloadTemplate} className={styles.templateBtn}>
                <Download size={15} />
                Download Template
              </button>
            </div>
          </div>
        )}

        {isDrawScreen && (
          <div className={styles.randomizerSection}>
            {!isFullscreen && (
              <>
                <div className={styles.metaRow}>
                  <span className={styles.metaChip}>
                    <Users size={14} />
                    <span className={styles.fileName}>{fileName}</span>
                  </span>
                  <span className={styles.metaChip}>
                    <strong>{eligibleParticipants.length}</strong> of {participants.length} remaining
                  </span>
                </div>

                {dupeCount > 0 && (
                  <div className={styles.warnBanner}>
                    {dupeCount} duplicate {dupeCount === 1 ? "entry was" : "entries were"} removed.
                  </div>
                )}
              </>
            )}

            <div className={styles.wheelArea}>
              <SpinWheel
                participants={eligibleParticipants}
                spinKey={spinKey}
                isFullscreen={isFullscreen}
                onComplete={handleSpinComplete}
              />
            </div>

            <div className={styles.winnerStage}>
              {state === "winner" && winner && (
                <div className={styles.winnerCard}>
                  <div className={styles.winnerLabel}>
                    <Trophy size={13} />
                    Winner
                  </div>
                  <h2 className={styles.winnerName}>{winner.name}</h2>
                  {winner.email && !isFullscreen && (
                    <p className={styles.winnerDetail}>{winner.email}</p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.actionArea}>
              {eligibleParticipants.length === 0 ? (
                <>
                  <p className={styles.allDrawn}>Everyone has been drawn.</p>
                  {!isFullscreen && (
                    <button className={styles.resetBtn} onClick={handleReset}>
                      <RotateCcw size={15} />
                      Start Over
                    </button>
                  )}
                </>
              ) : state === "spinning" ? (
                <p className={styles.drawing}>
                  Drawing
                  <span className={styles.dots} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </p>
              ) : (
                <>
                  <button className={styles.spinBtn} onClick={handleSpin}>
                    <Sparkles size={18} />
                    Draw a Winner
                  </button>
                  <p className={styles.hint}>or press Space</p>
                </>
              )}
            </div>

            {!isFullscreen && pastWinners.length > 0 && (
              <div className={styles.pastWinners}>
                <button
                  className={styles.pastToggle}
                  onClick={() => setShowPast((v) => !v)}
                >
                  <span>
                    Drawn — {pastWinners.length} {pastWinners.length === 1 ? "winner" : "winners"}
                  </span>
                  {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showPast && (
                  <>
                    <div className={styles.pastList}>
                      {pastWinners.map((w, i) => (
                        <div key={i} className={styles.pastItem}>
                          <span className={styles.pastRank}>#{i + 1}</span>
                          <span className={styles.pastName}>{w.name}</span>
                        </div>
                      ))}
                    </div>

                    <label className={styles.excludeToggle}>
                      <input
                        type="checkbox"
                        checked={excludePast}
                        onChange={(e) => setExcludePast(e.target.checked)}
                      />
                      <span>Exclude past winners from future draws</span>
                    </label>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
