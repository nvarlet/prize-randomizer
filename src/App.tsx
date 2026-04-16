import { useState, useCallback } from "react";
import { Upload, Download, Sparkles, RotateCcw, Users, X, ChevronRight } from "lucide-react";
import { downloadTemplate, parseSpreadsheet, type Participant } from "./template";
import SpinWheel from "./SpinWheel";
import styles from "./App.module.css";

type AppState = "upload" | "ready" | "spinning" | "winner";

export default function App() {
  const [state, setState] = useState<AppState>("upload");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [fileName, setFileName] = useState("");
  const [winner, setWinner] = useState<Participant | null>(null);
  const [pastWinners, setPastWinners] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const [excludePast, setExcludePast] = useState(true);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    try {
      const data = await file.arrayBuffer();
      const parsed = parseSpreadsheet(data);
      setParticipants(parsed);
      setFileName(file.name);
      setState("ready");
      setPastWinners([]);
      setWinner(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const eligibleParticipants = excludePast
    ? participants.filter((p) => !pastWinners.some((w) => w.name === p.name && w.email === p.email))
    : participants;

  const handleSpin = useCallback(() => {
    if (eligibleParticipants.length === 0) return;
    setState("spinning");
  }, [eligibleParticipants]);

  const handleSpinComplete = useCallback(
    (selected: Participant) => {
      setWinner(selected);
      setPastWinners((prev) => [...prev, selected]);
      setState("winner");
    },
    []
  );

  const handleSpinAgain = useCallback(() => {
    setWinner(null);
    setState("ready");
  }, []);

  const handleReset = useCallback(() => {
    setState("upload");
    setParticipants([]);
    setFileName("");
    setWinner(null);
    setPastWinners([]);
    setError("");
  }, []);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span>Prize Randomizer</span>
          </div>
          {state !== "upload" && (
            <button className={styles.resetBtn} onClick={handleReset}>
              <RotateCcw size={16} />
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {state === "upload" && (
          <div className={styles.uploadSection}>
            <div className={styles.heroText}>
              <h1>Prize Randomizer</h1>
              <p>Import your participant list to randomly select a winner.</p>
            </div>

            <div
              className={styles.dropzone}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className={styles.dropzoneInner}>
                <div className={styles.dropzoneIcon}>
                  <Upload size={32} />
                </div>
                <p className={styles.dropzoneTitle}>Drop your spreadsheet here</p>
                <p className={styles.dropzoneSub}>or click to browse — .xlsx, .xls, .csv</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleInputChange}
                  className={styles.fileInput}
                />
              </div>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <X size={16} />
                {error}
              </div>
            )}

            <div className={styles.templateCta}>
              <span>Need a starting point?</span>
              <button onClick={downloadTemplate} className={styles.templateBtn}>
                <Download size={16} />
                Download Template
              </button>
            </div>
          </div>
        )}

        {(state === "ready" || state === "spinning" || state === "winner") && (
          <div className={styles.randomizerSection}>
            <div className={styles.fileInfo}>
              <Users size={16} />
              <span className={styles.fileName}>{fileName}</span>
              <span className={styles.participantCount}>
                {eligibleParticipants.length} eligible of {participants.length} total
              </span>
            </div>

            <div className={styles.wheelArea}>
              <SpinWheel
                participants={eligibleParticipants}
                spinning={state === "spinning"}
                winner={winner}
                onComplete={handleSpinComplete}
              />
            </div>

            {state === "ready" && (
              <div className={styles.controls}>
                {eligibleParticipants.length === 0 ? (
                  <p className={styles.allDrawn}>
                    All participants have been drawn! Reset to start over.
                  </p>
                ) : (
                  <button className={styles.spinBtn} onClick={handleSpin}>
                    <Sparkles size={20} />
                    Draw a Winner
                  </button>
                )}
              </div>
            )}

            {state === "winner" && winner && (
              <div className={styles.winnerCard}>
                <div className={styles.winnerLabel}>Winner</div>
                <h2 className={styles.winnerName}>{winner.name}</h2>
                {winner.email && <p className={styles.winnerDetail}>{winner.email}</p>}
                <button className={styles.spinAgainBtn} onClick={handleSpinAgain}>
                  <Sparkles size={16} />
                  Draw Another
                </button>
              </div>
            )}

            {pastWinners.length > 0 && (
              <div className={styles.pastWinners}>
                <h3>
                  <ChevronRight size={16} /> Selected
                </h3>
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
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
