import { useEffect, useState } from "react";
import { FiActivity, FiCalendar, FiClock, FiDownload, FiFlag, FiMapPin, FiPlus, FiSearch, FiTarget, FiTrash2, FiTrendingUp, FiX } from "react-icons/fi";
import ConfirmDialog from "../confirmDialog";
import styles from "./styles.module.css";

const runsKey = "stridebook-runs";
const goalKey = "stridebook-weekly-goal";
const unitKey = "stridebook-distance-unit";
const mileKm = 1.60934;
const dateKey = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const shiftDate = (value, amount) => { const date = new Date(value + "T12:00:00"); date.setDate(date.getDate() + amount); return dateKey(date); };
const mondayOf = (value) => { const date = new Date(value + "T12:00:00"); date.setDate(date.getDate() - (date.getDay() + 6) % 7); return dateKey(date); };
const readStorage = (key, fallback) => { try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; } catch { return fallback; } };
const formatDate = (value, options = { month: "short", day: "numeric" }) => new Intl.DateTimeFormat("en", options).format(new Date(value + "T12:00:00"));
const paceLabel = (distanceKm, minutes, unit) => {
    if (!distanceKm || !minutes) return "—";
    const seconds = Math.round(minutes * 60 / (unit === "mi" ? distanceKm / mileKm : distanceKm));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
const formatDistance = (distanceKm, unit) => (unit === "mi" ? distanceKm / mileKm : distanceKm).toFixed(1);
const id = () => globalThis.crypto?.randomUUID?.() ?? String(Date.now());

const RunningActivityLog = () => {
    const today = dateKey(new Date());
    const [runs, setRuns] = useState(() => readStorage(runsKey, []));
    const [goalKm, setGoalKm] = useState(() => readStorage(goalKey, 24));
    const [unit, setUnit] = useState(() => readStorage(unitKey, "km"));
    const [period, setPeriod] = useState("7d");
    const [query, setQuery] = useState("");
    const [effort, setEffort] = useState("All efforts");
    const [isAdding, setIsAdding] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    useEffect(() => localStorage.setItem(runsKey, JSON.stringify(runs)), [runs]);
    useEffect(() => localStorage.setItem(goalKey, String(goalKm)), [goalKm]);
    useEffect(() => localStorage.setItem(unitKey, JSON.stringify(unit)), [unit]);

    const weekStart = mondayOf(today);
    const weekRuns = runs.filter((run) => run.date >= weekStart && run.date <= today);
    const rangeStart = period === "7d" ? shiftDate(today, -6) : period === "30d" ? shiftDate(today, -29) : "0000-01-01";
    const filteredRuns = runs.filter((run) => run.date >= rangeStart && run.date <= today && (effort === "All efforts" || run.effort === effort) && `${run.route} ${run.notes ?? ""}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    const rangeKm = filteredRuns.reduce((sum, run) => sum + run.distanceKm, 0);
    const rangeMinutes = filteredRuns.reduce((sum, run) => sum + run.minutes, 0);
    const weekDistanceKm = weekRuns.reduce((sum, run) => sum + run.distanceKm, 0);
    const weekDays = Array.from({ length: 7 }, (_, index) => {
        const date = shiftDate(weekStart, index);
        return { date, label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(date + "T12:00:00")), km: weekRuns.filter((run) => run.date === date).reduce((sum, run) => sum + run.distanceKm, 0) };
    });
    const chartMax = Math.max(goalKm, ...weekDays.map((day) => day.km));

    const createRun = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const amount = Number(data.get("distance"));
        const distanceKm = unit === "mi" ? amount * mileKm : amount;
        if (!amount || distanceKm <= 0) return;
        const run = { id: id(), route: String(data.get("route")).trim(), date: String(data.get("date")), distanceKm, minutes: Number(data.get("minutes")), effort: String(data.get("effort")), notes: String(data.get("notes")).trim(), createdAt: Date.now() };
        setRuns((current) => [run, ...current]);
        setIsAdding(false);
    };
    const exportCsv = () => {
        const rows = [["Date", "Route", `Distance (${unit})`, "Duration (minutes)", `Pace (min/${unit})`, "Effort", "Notes"], ...filteredRuns.map((run) => [run.date, run.route, formatDistance(run.distanceKm, unit), run.minutes, paceLabel(run.distanceKm, run.minutes, unit), run.effort, run.notes ?? ""])];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = "stridebook-runs.csv"; anchor.click(); URL.revokeObjectURL(url);
    };
    const removeRun = () => { setRuns((current) => current.filter((run) => run.id !== pendingDelete.id)); setPendingDelete(null); };

    return <div className={styles.runningLog}>
        <section className={styles.hero} id="overview"><div><span className={styles.eyebrow}><FiActivity aria-hidden="true" /> ONE RUN AT A TIME</span><h1>Every run<br /><span>moves you forward.</span></h1><p>Your miles, your pace, your own little collection of good days.</p></div><div className={styles.heroMark}><span>STRIDE<br />BY STRIDE</span><i /><i /><i /></div></section>
        <div className={styles.toolbar}><div className={styles.unitSwitch} aria-label="Distance units"><span>VIEW IN</span><button type="button" aria-pressed={unit === "km"} className={unit === "km" ? styles.unitActive : ""} onClick={() => setUnit("km")}>KM</button><button type="button" aria-pressed={unit === "mi"} className={unit === "mi" ? styles.unitActive : ""} onClick={() => setUnit("mi")}>MI</button></div><button className={styles.addRunButton} type="button" onClick={() => setIsAdding(true)}><FiPlus aria-hidden="true" /> Log a run</button></div>

        <section className={styles.metricGrid} aria-label="Run summary"><article><span className={styles.metricIcon}><FiTrendingUp aria-hidden="true" /></span><div><strong>{formatDistance(rangeKm, unit)}<small> {unit}</small></strong><span>{period === "7d" ? "PAST 7 DAYS" : period === "30d" ? "PAST 30 DAYS" : "ALL DISTANCE"}</span></div></article><article><span className={styles.metricIcon}><FiActivity aria-hidden="true" /></span><div><strong>{filteredRuns.length}<small> runs</small></strong><span>ACTIVITIES</span></div></article><article><span className={styles.metricIcon}><FiClock aria-hidden="true" /></span><div><strong>{rangeKm ? paceLabel(rangeKm, rangeMinutes, unit) : "—"}<small> /{unit}</small></strong><span>AVERAGE PACE</span></div></article><article><span className={styles.metricIcon}><FiFlag aria-hidden="true" /></span><div><strong>{rangeMinutes}<small> min</small></strong><span>MOVING TIME</span></div></article></section>

        <div className={styles.contentGrid}>
            <section className={styles.activityCard} id="run-log" aria-labelledby="run-log-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>THE MILES YOU MADE</span><h2 id="run-log-title">Run log</h2></div><button className={styles.exportButton} type="button" onClick={exportCsv} disabled={!filteredRuns.length}><FiDownload aria-hidden="true" /> Export CSV</button></div>
                <div className={styles.logFilters}><div className={styles.periodButtons}>{[["7d", "7 days"], ["30d", "30 days"], ["all", "All time"]].map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} className={period === value ? styles.selectedPeriod : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div><label className={styles.search}><FiSearch aria-hidden="true" /><span>Search routes or notes</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a route" /></label><label className={styles.effortSelect}><span>Effort</span><select value={effort} onChange={(event) => setEffort(event.target.value)}>{["All efforts", "Easy", "Steady", "Tempo", "Long run"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
                <div className={styles.runList}>{filteredRuns.map((run, index) => <article className={styles.runRow} key={run.id}><div className={`${styles.runBadge} ${index % 3 === 1 ? styles.badgeAlt : ""}`}><span>{String(run.date.split("-")[2])}</span><small>{formatDate(run.date, { month: "short" }).toUpperCase()}</small></div><div className={styles.runDetails}><h3><FiMapPin aria-hidden="true" /><span>{run.route || "Untitled route"}</span></h3><span><FiCalendar aria-hidden="true" /> {formatDate(run.date, { weekday: "short", month: "short", day: "numeric" })} <i>·</i> {run.effort}</span>{run.notes && <p>{run.notes}</p>}</div><div className={styles.runMetric}><strong>{formatDistance(run.distanceKm, unit)} <small>{unit}</small></strong><span>{run.minutes} min</span></div><div className={styles.runMetric}><strong>{paceLabel(run.distanceKm, run.minutes, unit)}</strong><span>min / {unit}</span></div><button className={styles.deleteButton} type="button" aria-label={`Remove ${run.route} run`} onClick={() => setPendingDelete(run)}><FiTrash2 aria-hidden="true" /></button></article>)}{filteredRuns.length === 0 && <div className={styles.emptyRuns}><span className={styles.emptyTrack}>↗</span><h3>{runs.length ? "No runs match these filters." : "Your next run starts a good story."}</h3><p>{runs.length ? "Try another date range, effort, or search." : "Log an activity to see your pace, distance, and weekly progress here."}</p>{!runs.length && <button type="button" onClick={() => setIsAdding(true)}><FiPlus aria-hidden="true" /> Log your first run</button>}</div>}</div>
            </section>

            <aside className={styles.goalCard} id="weekly-goal" aria-labelledby="goal-title"><div className={styles.goalHeading}><span className={styles.goalIcon}><FiTarget aria-hidden="true" /></span><div><span className={styles.eyebrow}>KEEP A STEADY RHYTHM</span><h2 id="goal-title">Weekly distance</h2></div></div><div className={styles.goalTotal}><strong>{formatDistance(weekDistanceKm, unit)}<small> {unit}</small></strong><span>of {formatDistance(goalKm, unit)} {unit}</span></div><div className={styles.goalProgress}><i style={{ width: `${Math.min(100, weekDistanceKm / goalKm * 100)}%` }} /></div><label className={styles.goalInput}>Weekly goal<input type="number" min="1" max="500" step="1" value={Number((unit === "mi" ? goalKm / mileKm : goalKm).toFixed(1))} onChange={(event) => { const value = Math.max(.5, Number(event.target.value) || .5); setGoalKm(unit === "mi" ? value * mileKm : value); }} /><span>{unit}</span></label><div className={styles.chartHeading}><h3>This week</h3><span>{formatDate(weekStart)} – {formatDate(today)}</span></div><div className={styles.weekChart} role="img" aria-label={`Daily running distance this week, ${formatDistance(weekDistanceKm, unit)} ${unit} total`}>{weekDays.map((day) => <div className={styles.weekColumn} key={day.date}><span>{day.km ? formatDistance(day.km, unit) : ""}</span><div><i style={{ height: `${Math.max(day.km ? 5 : 0, day.km / chartMax * 100)}%` }} /></div><small>{day.label}</small></div>)}</div><p className={styles.goalHint}>Your week is yours to shape. Rest days count too.</p></aside>
        </div>

        {isAdding && <div className={styles.modalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAdding(false); }}><section className={styles.runModal} role="dialog" aria-modal="true" aria-labelledby="run-modal-title"><div className={styles.modalHeading}><div><span className={styles.eyebrow}>ADD TO YOUR LOG</span><h2 id="run-modal-title">A run worth keeping</h2></div><button type="button" aria-label="Close" onClick={() => setIsAdding(false)}><FiX aria-hidden="true" /></button></div><form onSubmit={createRun}><label className={styles.fullField}>Route name<input name="route" maxLength="70" placeholder="e.g. Riverside loop" required autoFocus /></label><div className={styles.formRow}><label>Date<input name="date" type="date" max={today} defaultValue={today} required /></label><label>Distance ({unit})<input name="distance" type="number" min="0.1" max="1000" step="0.1" placeholder={unit === "km" ? "5.0" : "3.1"} required /></label><label>Moving time <small>minutes</small><input name="minutes" type="number" min="1" max="1440" step="1" placeholder="32" required /></label><label>Effort<select name="effort" defaultValue="Easy">{["Easy", "Steady", "Tempo", "Long run"].map((value) => <option key={value}>{value}</option>)}</select></label></div><label className={styles.fullField}>A note <small>Optional</small><textarea name="notes" maxLength="240" placeholder="How did it feel? Anything you want to remember?" /></label><p className={styles.paceTip}><FiActivity aria-hidden="true" /> Pace is calculated from your distance and moving time.</p><div className={styles.modalActions}><button type="button" onClick={() => setIsAdding(false)}>Cancel</button><button type="submit"><FiPlus aria-hidden="true" /> Save run</button></div></form></section></div>}
        {pendingDelete && <ConfirmDialog title="Remove this run?" description={`${pendingDelete.route || "This activity"} and its distance will be removed from your log.`} confirmLabel="Remove run" onCancel={() => setPendingDelete(null)} onConfirm={removeRun} />}
    </div>;
};

export default RunningActivityLog;
