import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, Download, Sparkles, RotateCcw, Users, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { downloadTemplate, parseSpreadsheet, type Participant } from "./template";
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
    setState("spinning");
    setSpinKey((k) => k + 1);
  }, [eligibleParticipants]);

  const handleSpinComplete = useCallback((selected: Participant) => {
    setWinner(selected);
    setPastWinners((prev) => [...prev, selected]);
    setState("winner");
  }, []);

  const handleSpinAgain = useCallback(() => {
    setWinner(null);
    setState("ready");
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

      if ((e.key === " " || e.key === "Enter") && state === "ready" && eligibleParticipants.length > 0) {
        e.preventDefault();
        handleSpin();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, eligibleParticipants, handleSpin]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {state !== "upload" && state !== "loading" && (
            <button className={styles.resetBtn} onClick={handleReset}>
              <RotateCcw size={15} />
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {(state === "upload" || state === "loading") && (
          <div className={styles.uploadSection}>
            <div className={styles.heroText}>
              <h1>IFYS Prize Randomiser</h1>
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

        {(state === "ready" || state === "spinning" || state === "winner") && (
          <div className={styles.randomizerSection}>
            <div className={styles.fileInfo}>
              <Users size={15} />
              <span className={styles.fileName}>{fileName}</span>
              <span className={styles.participantCount}>
                {eligibleParticipants.length} eligible of {participants.length} total
              </span>
            </div>

            {dupeCount > 0 && (
              <div className={styles.warnBanner}>
                {dupeCount} duplicate {dupeCount === 1 ? "entry was" : "entries were"} removed.
              </div>
            )}

            <div className={styles.wheelArea}>
              <SpinWheel
                participants={eligibleParticipants}
                spinKey={spinKey}
                onComplete={handleSpinComplete}
              />
            </div>

            {state === "ready" && (
              <div className={styles.controls}>
                {eligibleParticipants.length === 0 ? (
                  <p className={styles.allDrawn}>
                    All participants have been drawn. Reset to start over.
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
            )}

            {state === "winner" && winner && (
              <div className={styles.winnerCard}>
                <div className={styles.winnerLabel}>Selected</div>
                <h2 className={styles.winnerName}>{winner.name}</h2>
                {winner.email && <p className={styles.winnerDetail}>{winner.email}</p>}
                <button className={styles.spinAgainBtn} onClick={handleSpinAgain}>
                  <Sparkles size={15} />
                  Draw Another
                </button>
              </div>
            )}

            {pastWinners.length > 0 && (
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
