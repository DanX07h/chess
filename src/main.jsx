import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Swords,
  BookOpen,
  CalendarDays,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Plus,
  X,
  Search,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  TrendingUp,
  Trophy,
  RotateCcw,
  Clock3,
  Flame,
  ExternalLink,
  Download,
  Info,
  Menu,
  CircleHelp,
  RefreshCw,
  MoveUpRight,
  Lightbulb,
  Shield,
  Zap,
} from "lucide-react";
import { Chess } from "chess.js";
import { summarize } from "../server/analysis.js";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./styles.css";
const START = new Chess().fen();
const fmt = (n) => (n == null ? "—" : n.toLocaleString());
const pct = (n) => (n == null ? "—" : `${n}%`);
const nav = [
  ["Overview", LayoutDashboard],
  ["My games", Swords],
  ["Openings", BookOpen],
  ["Activity", CalendarDays],
  ["Training plan", Target],
];
async function api(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
const dateLabel = (s) =>
  new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
function App() {
  const [data, setData] = useState(null),
    [page, setPage] = useState("Overview"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [importOpen, setImportOpen] = useState(false),
    [job, setJob] = useState(null),
    [review, setReview] = useState(null),
    [mobileNav, setMobileNav] = useState(false),
    [category, setCategory] = useState("All formats"),
    [period, setPeriod] = useState("All time"),
    [help, setHelp] = useState(false);
  const datasetRef = useRef(null);
  datasetRef.current = data?.id;
  async function load(id) {
    const result = await api(`/api/datasets/${id}`);
    setData(result);
    localStorage.setItem("knightly-report", id);
    return result;
  }
  useEffect(() => {
    let active = true;
    const id = localStorage.getItem("knightly-report") || "demo";
    api(`/api/datasets/${id}`)
      .catch(() => api("/api/datasets/demo"))
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => active && setLoading(false));
    return () => (active = false);
  }, []);
  useEffect(() => {
    if (!job?.id || job.status !== "running") return;
    let cancelled = false,
      timer;
    async function poll() {
      try {
        const update = await api(`/api/jobs/${job.id}`);
        if (cancelled) return;
        setJob(update);
        if (update.datasetId && datasetRef.current !== update.datasetId)
          await load(update.datasetId);
        if (update.status === "complete") {
          await load(update.datasetId);
          setTimeout(() => {
            if (!cancelled) setJob(null);
          }, 4000);
        } else if (update.status === "running") timer = setTimeout(poll, 1200);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setJob(null);
        }
      }
    }
    timer = setTimeout(poll, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job?.id, job?.status]);
  const games = useMemo(() => {
    const cutoff =
      period === "Last 7 days"
        ? Date.now() - 7 * 86400000
        : period === "Last 30 days"
          ? Date.now() - 30 * 86400000
          : 0;
    return (data?.games || []).filter(
      (g) =>
        (category === "All formats" || g.category === category) &&
        Date.parse(g.date) >= cutoff,
    );
  }, [data, category, period]);
  const summary = useMemo(() => buildSummary(games, data), [games, data]);
  async function startReview(game) {
    setReview(game.id);
    if (game.analysis?.complete) return;
    try {
      const result = await api(`/api/datasets/${data.id}/review`, {
        method: "POST",
        body: JSON.stringify({ gameId: game.id }),
      });
      if (result.status === "complete") await load(data.id);
      else setJob(result);
    } catch (e) {
      setError(e.message);
    }
  }
  function openPage(name) {
    setPage(name);
    setMobileNav(false);
  }
  const reviewGame = data?.games.find((g) => g.id === review);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            openPage("Overview");
          }}
        >
          <span className="brand-mark">♞</span>knightly
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR CHESS, UNDERSTOOD</div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => openPage(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {page === label && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-coach">
          <span className="coach-symbol">
            <Sparkles size={19} />
          </span>
          <h3>
            A little better.
            <br />
            Every game.
          </h3>
          <p>
            Your next breakthrough starts with understanding your last game.
          </p>
          <button onClick={() => openPage("Training plan")}>
            Find your next step <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            How Knightly works
            <ArrowUpRight size={14} />
          </button>
          <div className="profile-mini">
            <div className="avatar">
              {data?.profile.username.slice(0, 2).toUpperCase() || "KM"}
            </div>
            <div>
              <strong>
                {data?.demo
                  ? "Alex Morgan"
                  : data?.profile.username || "Your profile"}
              </strong>
              <span>
                {data?.demo ? "Demo workspace" : data?.profile.platform}
              </span>
            </div>
            <button
              aria-label="Connect another player"
              onClick={() => setImportOpen(true)}
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
      </aside>
      <button
        className={`mobile-nav-scrim ${mobileNav ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setMobileNav(false)}
        tabIndex={mobileNav ? 0 : -1}
      />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="header-right">
            <span className="live-status">
              <i />
              {data?.demo ? "Exploring demo" : "Personal workspace"}
            </span>
            <button
              className="button primary small"
              onClick={() => setImportOpen(true)}
            >
              <Plus size={15} />
              Connect account
            </button>
          </div>
        </header>
        <main>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-page">
              <Loader2 className="spin" size={30} />
              <p>Getting your chess workspace ready…</p>
            </div>
          ) : !data ? (
            <div className="empty-state">
              <p>We couldn’t load the workspace.</p>
              <button
                className="button primary"
                onClick={() => location.reload()}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {data.demo && (
                <div className="demo-banner">
                  <span>
                    <span className="demo-label">DEMO</span>You’re exploring an
                    illustrative player report. Connect your account to make it
                    yours.
                  </span>
                  <button onClick={() => setImportOpen(true)}>
                    Analyse my games <ArrowRight size={14} />
                  </button>
                </div>
              )}
              {job && (
                <div
                  className={`job-banner ${job.status === "error" ? "failed" : ""}`}
                  role="status"
                >
                  <div>
                    {job.status === "running" ? (
                      <Loader2 size={18} className="spin" />
                    ) : job.status === "error" ? (
                      <Info size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    <span>{job.message}</span>
                    <strong>{job.progress}%</strong>
                    <button
                      aria-label="Dismiss analysis status"
                      onClick={() => setJob(null)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="progress-track">
                    <i style={{ width: `${job.progress}%` }} />
                  </div>
                  {job.status === "error" && job.datasetId && (
                    <small>
                      Imported games are available. Retry analysis from My
                      games.
                    </small>
                  )}
                </div>
              )}
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    {page === "Overview"
                      ? "THE BIG PICTURE"
                      : page === "Openings"
                        ? "BUILD YOUR REPERTOIRE"
                        : page === "Activity"
                          ? "EVERY DAY COUNTS"
                          : page === "Training plan"
                            ? "SMALL STEPS, REAL PROGRESS"
                            : "LEARN FROM EVERY MOVE"}
                  </div>
                  <h1>
                    {page === "Overview" ? (
                      <>
                        Your game. A little clearer<span>.</span>
                      </>
                    ) : page === "My games" ? (
                      "Every game has a lesson."
                    ) : page === "Openings" ? (
                      "Find your kind of chess."
                    ) : page === "Activity" ? (
                      "Consistency looks good on you."
                    ) : (
                      "Your next breakthrough."
                    )}
                  </h1>
                  <p>
                    {page === "Overview"
                      ? `Welcome ${data.demo ? "back, Alex" : data.profile.username}. Let’s turn your games into your next breakthrough.`
                      : page === "My games"
                        ? "Revisit your games, find the turning points, and see what to do differently."
                        : page === "Openings"
                          ? "Discover what works, explore what fits, and build a repertoire that feels like you."
                          : page === "Activity"
                            ? "Explore your results one day at a time. All dates are shown in UTC."
                            : "A focused plan, grounded in the games you actually play."}
                  </p>
                </div>
                <div className="heading-actions">
                  {data.demo ? (
                    <span className="platform-badge">
                      <span className="platform-icon">♟</span> Sample player
                    </span>
                  ) : (
                    <a
                      className="platform-badge"
                      href={data.profile.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="platform-icon">♟</span>
                      {data.profile.platform}
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    className="icon-button"
                    title="Refresh report"
                    aria-label="Refresh report"
                    onClick={() =>
                      load(data.id).catch((e) => setError(e.message))
                    }
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </section>
              <div className="filter-bar">
                <div className="segmented">
                  {["All formats", "Rapid", "Blitz", "Bullet"].map((c) => (
                    <button
                      key={c}
                      className={category === c ? "selected" : ""}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="filter-meta">
                  <span>{games.length} games in view</span>
                  <label className="select-wrap">
                    <CalendarDays size={14} />
                    <select
                      aria-label="Date range"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      <option>All time</option>
                      <option>Last 30 days</option>
                      <option>Last 7 days</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
                </div>
              </div>
              {page === "Overview" ? (
                <Overview
                  games={games}
                  data={data}
                  summary={summary}
                  onNavigate={openPage}
                  onReview={startReview}
                />
              ) : page === "My games" ? (
                <GamesPage games={games} onReview={startReview} />
              ) : page === "Openings" ? (
                <OpeningsPage summary={summary} games={games} />
              ) : page === "Activity" ? (
                <ActivityPage games={games} />
              ) : (
                <TrainingPage
                  summary={summary}
                  games={games}
                  onReview={startReview}
                />
              )}
              <footer>
                <span>
                  <span className="footer-knight">♞</span> Less guessing. More
                  growing.
                </span>
                <span>
                  {data.demo
                    ? "Illustrative data · Not a real player report"
                    : `${data.games.length} games imported · ${new Date(data.createdAt).toLocaleDateString("en-GB")}`}
                  <span className="footer-dot">·</span>Made for the love of the
                  game.
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onStart={(j) => {
            setJob(j);
            setImportOpen(false);
            setCategory("All formats");
            setPeriod("All time");
          }}
        />
      )}
      {reviewGame && (
        <ReviewModal
          game={reviewGame}
          onClose={() => setReview(null)}
          job={job}
          onAnalyse={() => startReview(reviewGame)}
        />
      )}
      {help && (
        <Modal
          title="A clearer picture of your chess"
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <p>
              Knightly imports public, finished standard games from Chess.com or
              Lichess. No password or account permissions are needed.
            </p>
            <h3>What the numbers mean</h3>
            <p>
              Win rate is wins divided by all games, including draws. Ratings
              stay separate by platform and time format. Recovery is the next
              game in the same format within four hours of a loss.
            </p>
            <h3>Engine reviews</h3>
            <p>
              Stockfish 19 lite examines up to the first 60 full moves of three
              recent games after an import. You can review additional games
              individually. This is a quick, limited analysis, not a definitive
              verdict. Phase feedback and comebacks only use reviewed games.
            </p>
            <h3>Opening recommendations</h3>
            <p>
              Results with at least five games contribute to recommendations.
              Other suggestions are starting points based on rating, not a
              proven personality assessment. Early captures, checks and castling
              choices provide exploratory style signals. The built-in opening
              classifier covers common lines and falls back to “Unclassified”;
              Lichess opening labels are used when supplied.
            </p>
            <h3>Your data</h3>
            <p>
              This first version stores imported public games on this server and
              remembers the report link in this browser. It has no accounts or
              private workspaces yet. Don’t deploy it as a private multi-user
              service without adding authentication and data controls.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
// Client-side aggregates keep every view consistent with the active filters.
function buildSummary(games, data) {
  const s = summarize(games);
  return {
    ...s,
    recommendations: data?.summary.recommendations || s.recommendations,
  };
}

function Overview({ games, data, summary: s, onNavigate, onReview }) {
  const ratingKey =
    ["Rapid", "Blitz", "Bullet", "Classical"].find((k) => s.ratings[k]) ||
    Object.keys(s.ratings)[0];
  const rating = s.ratings[ratingKey];
  const rated = games
    .filter((g) => g.category === ratingKey && g.rating)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const change = rated.length > 1 ? rating - rated[0].rating : null;
  return (
    <>
      <div className="stat-grid">
        <Stat
          label={`${ratingKey || "Current"} rating`}
          value={fmt(rating)}
          icon={TrendingUp}
          note={
            change != null
              ? `${change >= 0 ? "+" : ""}${change} in this sample`
              : "Play rated games to track progress"
          }
          trend={change >= 0 ? "up" : "neutral"}
        >
          <Sparkline games={rated} />
        </Stat>
        <Stat
          label="Overall win rate"
          value={pct(s.winRate)}
          icon={Trophy}
          note={`${s.wins} wins · ${s.draws} draws · ${s.losses} losses`}
        >
          <div className="result-strip">
            <i style={{ flex: s.wins || 0.01 }} />
            <i style={{ flex: s.draws || 0.01 }} />
            <i style={{ flex: s.losses || 0.01 }} />
          </div>
        </Stat>
        <Stat
          label="Games in your story"
          value={fmt(s.total)}
          icon={Swords}
          note={`${Object.keys(s.days).length} active days in this view`}
        >
          <div className="tiny-bars">
            {Object.values(s.days)
              .slice(-15)
              .map((d, i) => (
                <i key={i} style={{ height: 8 + d.games * 5 }} />
              ))}
          </div>
        </Stat>
        <Stat
          label="Your next focus"
          value={s.focus || "Find your edge"}
          icon={Target}
          note={
            s.analyzed
              ? `Based on ${s.analyzed} reviewed game${s.analyzed === 1 ? "" : "s"}`
              : "Review a game to unlock insights"
          }
          special
        >
          <button
            className="stat-action"
            onClick={() =>
              s.analyzed
                ? onNavigate("Training plan")
                : games[0] && onReview(games[0])
            }
            aria-label="See training focus"
          >
            <ArrowUpRight size={20} />
          </button>
        </Stat>
      </div>
      <div className="dashboard-grid">
        <section className="panel rating-panel">
          <PanelHeading
            title="The bigger picture"
            subtitle="Small improvements add up."
            right={
              <span className="tag">
                <span className="dot green" />
                {ratingKey || "Rating"} progress
              </span>
            }
          />
          <RatingChart games={rated} ratingKey={ratingKey} />
          <div className="chart-footer">
            <span>
              <span className="dot green" />
              Your rating
            </span>
            <span>
              {rated.length
                ? `${dateLabel(rated[Math.max(0, rated.length - 60)].date)} — ${dateLabel(rated.at(-1).date)}`
                : "No rated games in this view"}
            </span>
          </div>
        </section>
        <section className="coach-panel">
          <div className="coach-panel-label">
            <Sparkles size={16} /> A LITTLE DIRECTION
          </div>
          <div className="coach-art">
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <span className="art-knight">♞</span>
            <span className="art-spark">✦</span>
          </div>
          <h2>
            {s.focus
              ? `Make your ${s.focus.toLowerCase()} your advantage.`
              : "There’s a lesson in your last game."}
          </h2>
          <p>
            {s.focus
              ? `Your reviewed games show the greatest average evaluation loss in the ${s.focus.toLowerCase()}. Start there, one move at a time.`
              : "The result tells one story. The moves tell another. Let’s find the moments that matter."}
          </p>
          <button
            onClick={() =>
              s.analyzed
                ? onNavigate("Training plan")
                : games[0] && onReview(games[0])
            }
            disabled={!games.length}
          >
            {s.analyzed
              ? "Explore your training plan"
              : "Review your latest game"}
            <ArrowUpRight size={17} />
          </button>
          <span className="coach-footnote">
            {s.analyzed
              ? "Built from your reviewed games"
              : "Powered by Stockfish 19"}
          </span>
        </section>
      </div>
      <div className="dashboard-grid second-row">
        <section className="panel recent-panel">
          <PanelHeading
            title="Fresh from the board"
            subtitle="Your most recent games, and what comes next."
            right={
              <button
                className="text-button"
                onClick={() => onNavigate("My games")}
              >
                All games <ArrowRight size={14} />
              </button>
            }
          />
          <GameTable games={games.slice(0, 5)} onReview={onReview} compact />
        </section>
        <section className="panel activity-panel">
          <PanelHeading
            title="Your days, in chess"
            right={
              <button
                className="icon-button"
                aria-label="Open activity calendar"
                onClick={() => onNavigate("Activity")}
              >
                <ArrowUpRight size={17} />
              </button>
            }
          />
          <Calendar games={games} compact />
        </section>
      </div>
      <section className="panel repertoire-panel">
        <PanelHeading
          title="A repertoire that feels like you"
          subtitle="A little evidence. A few possibilities. Your next opening."
          right={
            <button
              className="text-button"
              onClick={() => onNavigate("Openings")}
            >
              Explore openings <ArrowRight size={14} />
            </button>
          }
        />
        <RecommendationCards
          recommendations={s.recommendations.slice(0, 3)}
          onExplore={() => onNavigate("Openings")}
        />
        <div className="panel-note">
          <Info size={13} />
          Recommendations use the full imported report. Small samples are a
          starting point, not a verdict.
        </div>
      </section>
      <InsightCards summary={s} />
    </>
  );
}
function Stat({ label, value, icon: Icon, note, children, special, trend }) {
  return (
    <section className={`stat-card ${special ? "special" : ""}`}>
      <div className="stat-label">
        {label}
        <Icon size={16} />
      </div>
      <div className={`stat-value ${special ? "focus-value" : ""}`}>
        {value}
      </div>
      <div className={`stat-note ${trend === "up" ? "positive" : ""}`}>
        {trend === "up" && <TrendingUp size={12} />} {note}
      </div>
      {children}
    </section>
  );
}
function Sparkline({ games }) {
  const vals = games.slice(-24).map((g) => g.rating);
  if (vals.length < 2) return null;
  const min = Math.min(...vals),
    max = Math.max(...vals);
  const points = vals
    .map(
      (v, i) =>
        `${(i / (vals.length - 1)) * 88},${27 - ((v - min) / (max - min || 1)) * 23}`,
    )
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 90 30">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
function PanelHeading({ title, subtitle, right }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
function RatingChart({ games, ratingKey }) {
  const [hover, setHover] = useState(null);
  const shown = games.slice(-60);
  if (shown.length < 2)
    return (
      <div className="chart-empty">
        <TrendingUp size={32} />
        <p>At least two rated games are needed to show your progress.</p>
      </div>
    );
  const values = shown.map((g) => g.rating),
    min = Math.floor((Math.min(...values) - 35) / 50) * 50,
    max = Math.ceil((Math.max(...values) + 35) / 50) * 50;
  const w = 680,
    h = 180,
    left = 40,
    right = 15,
    top = 15,
    bottom = 20;
  const x = (i) => left + (i / (shown.length - 1)) * (w - left - right),
    y = (v) => top + ((max - v) / (max - min)) * (h - top - bottom);
  const line = values
    .map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`)
    .join(" ");
  const area = `${line} L ${x(values.length - 1)} ${h - bottom} L ${left} ${h - bottom} Z`;
  const ticks = Array.from({ length: 4 }, (_, i) =>
    Math.round(min + ((max - min) / 3) * i),
  );
  const point = hover != null ? shown[hover] : shown.at(-1);
  const index = hover ?? shown.length - 1;
  return (
    <div className="rating-chart">
      <div className="chart-summary">
        <strong>
          {fmt(point.rating)}
          <span>ELO</span>
        </strong>
        <span>
          {hover != null
            ? `${dateLabel(point.date)} · vs ${point.opponent}`
            : "A clearer view of your trajectory"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${ratingKey} rating over ${shown.length} games, from ${values[0]} to ${values.at(-1)}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a6c77c" stopOpacity=".2" />
            <stop offset="100%" stopColor="#a6c77c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={left}
              y1={y(t)}
              x2={w - right}
              y2={y(t)}
              stroke="#ffffff0b"
              strokeDasharray="3 5"
            />
            <text x={0} y={y(t) + 4} fill="#69746d" fontSize="10">
              {t}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#chart-fill)" />
        <path
          d={line}
          stroke="#b4d28a"
          strokeWidth="2.3"
          fill="none"
          strokeLinejoin="round"
        />
        <line
          x1={x(index)}
          y1={top}
          x2={x(index)}
          y2={h - bottom}
          stroke="#b4d28a"
          opacity=".23"
          strokeDasharray="4 4"
        />
        <circle
          cx={x(index)}
          cy={y(point.rating)}
          r="4"
          fill="#c5dfa2"
          stroke="#283322"
          strokeWidth="4"
        />
        {shown.map((g, i) => (
          <rect
            key={g.id}
            x={x(i) - (w - left - right) / shown.length / 2}
            y={0}
            width={(w - left - right) / shown.length + 2}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {[
          0,
          Math.floor((shown.length - 1) / 3),
          Math.floor((2 * (shown.length - 1)) / 3),
          shown.length - 1,
        ].map((i) => (
          <text
            key={i}
            x={x(i)}
            y={h - 1}
            textAnchor={
              i === 0 ? "start" : i === shown.length - 1 ? "end" : "middle"
            }
            fill="#69746d"
            fontSize="10"
          >
            {dateLabel(shown[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
function InsightCards({ summary: s }) {
  const items = [
    {
      title: "The bounce-back",
      icon: RotateCcw,
      value: pct(s.recovery.rate),
      text: s.recovery.games
        ? `Wins in ${s.recovery.games} games played within 4 hours of a loss, in the same format.`
        : "No qualifying games after a loss in this view.",
      tag: "Recovery rate",
    },
    {
      title: "Never out of the game",
      icon: Flame,
      value: pct(s.comebacks.rate),
      text: s.comebacks.games
        ? `${s.comebacks.wins} wins from ${s.comebacks.games} reviewed games where you were 2+ pawns behind.`
        : "Review more games to discover how often you turn losing positions into wins.",
      tag: "Comeback rate",
    },
    {
      title: "On your own time",
      icon: Clock3,
      value: pct(s.time.rate),
      text: s.time.clockGames
        ? `Time trouble in ${s.time.timeTrouble} of ${s.time.clockGames} games with clock data. ${s.time.timeouts} losses on time.`
        : "Clock data is unavailable for these games. Time management can’t be measured yet.",
      tag: "Games in time trouble",
    },
  ];
  return (
    <div className="insight-grid">
      {items.map(({ title, icon: Icon, value, text, tag }) => (
        <section className="insight-card" key={title}>
          <div className="insight-icon">
            <Icon size={17} />
          </div>
          <div className="insight-top">
            <h3>{title}</h3>
            <strong>{value}</strong>
          </div>
          <span className="muted-label">{tag}</span>
          <p>{text}</p>
        </section>
      ))}
    </div>
  );
}
function GameTable({ games, onReview, compact }) {
  if (!games.length)
    return (
      <EmptyState
        title="No games in this view"
        text="Try a different format or date range."
      />
    );
  return (
    <div className="table-scroll">
      <table className={`game-table ${compact ? "compact" : ""}`}>
        <thead>
          <tr>
            <th>OPPONENT</th>
            <th>RESULT</th>
            <th>OPENING</th>
            {!compact && <th>FORMAT</th>}
            <th>PLAYED</th>
            <th>
              <span className="sr-only">Review</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id} onClick={() => onReview(g)}>
              <td>
                <div className="opponent-cell">
                  <span
                    className={`piece-indicator ${g.color}`}
                    aria-label={`You played ${g.color}`}
                  >
                    ♟
                  </span>
                  <div>
                    <strong>{g.opponent}</strong>
                    <span>
                      {g.opponentRating || "Unrated"}{" "}
                      <span className="opponent-you">
                        vs {g.rating || "unrated"}
                      </span>
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <span className={`result-badge ${g.result}`}>
                  <span />
                  {g.result === "win"
                    ? "Win"
                    : g.result === "loss"
                      ? "Loss"
                      : "Draw"}
                </span>
              </td>
              <td>
                <span className="opening-name">{g.opening.name}</span>
                {!compact && (
                  <span className="table-subtext">{g.opening.eco}</span>
                )}
              </td>
              {!compact && (
                <td>
                  <span className="format-cell">
                    <Clock3 size={12} />
                    {g.category}
                  </span>
                </td>
              )}
              <td className="date-cell">{dateLabel(g.date)}</td>
              <td>
                <button
                  className="review-button"
                  aria-label={`Review game against ${g.opponent}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReview(g);
                  }}
                >
                  {g.analysis?.complete ? (
                    <Check size={14} />
                  ) : (
                    <ArrowUpRight size={16} />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function GamesPage({ games, onReview }) {
  const [query, setQuery] = useState(""),
    [result, setResult] = useState("all"),
    [limit, setLimit] = useState(20);
  const found = games.filter(
    (g) =>
      (result === "all" || g.result === result) &&
      `${g.opponent} ${g.opening.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="panel">
      <div className="games-toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search games"
            placeholder="Search opponents or openings…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(20);
            }}
          />
        </div>
        <select
          aria-label="Filter game results"
          value={result}
          onChange={(e) => {
            setResult(e.target.value);
            setLimit(20);
          }}
        >
          <option value="all">All results</option>
          <option value="win">Wins</option>
          <option value="loss">Losses</option>
          <option value="draw">Draws</option>
        </select>
        <span>{found.length} games</span>
      </div>
      <GameTable games={found.slice(0, limit)} onReview={onReview} />
      {found.length > limit && (
        <div className="load-more">
          <button
            className="button secondary"
            onClick={() => setLimit(limit + 20)}
          >
            Show more games <ChevronDown size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
function Calendar({ games, compact = false }) {
  const [month, setMonth] = useState(() => {
      const d = games.length ? new Date(games[0].date) : new Date();
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }),
    [selected, setSelected] = useState(null);
  const year = month.getUTCFullYear(),
    mon = month.getUTCMonth(),
    offset = (month.getUTCDay() + 6) % 7,
    count = new Date(Date.UTC(year, mon + 1, 0)).getUTCDate();
  const dayGames = useMemo(() => {
    const map = {};
    games.forEach((g) => (map[g.date.slice(0, 10)] ??= []).push(g));
    return map;
  }, [games]);
  const key = (day) =>
    `${year}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const selectedGames = selected ? dayGames[selected] || [] : [];
  const monthGames = games.filter((g) =>
    g.date.startsWith(`${year}-${String(mon + 1).padStart(2, "0")}`),
  );
  const activeDays = new Set(monthGames.map((g) => g.date.slice(0, 10))).size;
  function shift(n) {
    setMonth(new Date(Date.UTC(year, mon + n, 1)));
    setSelected(null);
  }
  return (
    <div className={`calendar ${compact ? "calendar-compact" : ""}`}>
      <div className="calendar-toolbar">
        <strong>
          {month.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </strong>
        <div>
          <button aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span className="weekday" key={`w${i}`}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1,
            k = key(day),
            gs = dayGames[k] || [],
            wr = gs.length
              ? gs.filter((g) => g.result === "win").length / gs.length
              : 0;
          return (
            <button
              key={day}
              className={`calendar-day ${gs.length ? "has-games" : ""} ${gs.length ? (wr >= 0.66 ? "day-strong" : wr >= 0.34 ? "day-mid" : "day-low") : ""} ${selected === k ? "day-selected" : ""} ${k === new Date().toISOString().slice(0, 10) ? "today" : ""}`}
              title={`${k}: ${gs.length} games${gs.length ? `, ${Math.round(wr * 100)}% wins` : ""}`}
              aria-label={`${k}, ${gs.length} games`}
              onClick={() => setSelected(selected === k ? null : k)}
            >
              {day}
              {!compact && gs.length > 0 && (
                <small>{Math.round(wr * 100)}%</small>
              )}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>{activeDays} active days</span>
        <div>
          <span>Win rate</span>
          <i className="day-low" />
          <i className="day-mid" />
          <i className="day-strong" />
          <span>High</span>
        </div>
      </div>
      {selected && (
        <div className="day-detail">
          <strong>
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </strong>
          <span>
            {selectedGames.length
              ? `${selectedGames.length} games · ${Math.round((selectedGames.filter((g) => g.result === "win").length / selectedGames.length) * 100)}% wins`
              : "A day away from the board."}
          </span>
          {!compact && selectedGames.length > 0 && (
            <div className="day-game-list">
              {selectedGames.map((g) => (
                <div key={g.id}>
                  <span className={`result-text ${g.result}`}>{g.result}</span>
                  <span>vs {g.opponent}</span>
                  <span>{g.opening.name}</span>
                  <span>{g.color}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ActivityPage({ games }) {
  const total = games.length,
    wins = games.filter((g) => g.result === "win").length;
  const days = new Set(games.map((g) => g.date.slice(0, 10))).size;
  const categories = ["Rapid", "Blitz", "Bullet", "Classical"];
  return (
    <div className="activity-page-grid">
      <section className="panel">
        <PanelHeading
          title="Your chess calendar"
          subtitle="Select a day to see your results. Dates are in UTC."
        />
        <Calendar games={games} />
      </section>
      <div className="activity-side">
        <section className="panel">
          <PanelHeading title="A habit worth building" />
          <div className="activity-big-number">
            {days}
            <span>days at the board</span>
          </div>
          <div className="activity-stat">
            <span>Games played</span>
            <strong>{total}</strong>
          </div>
          <div className="activity-stat">
            <span>Average per active day</span>
            <strong>{days ? (total / days).toFixed(1) : "—"}</strong>
          </div>
          <div className="activity-stat">
            <span>Win rate</span>
            <strong>
              {total ? Math.round((wins / total) * 100) + "%" : "—"}
            </strong>
          </div>
        </section>
        <section className="panel format-breakdown">
          <PanelHeading title="Your pace of play" />
          {categories.map((c) => {
            const gs = games.filter((g) => g.category === c);
            return (
              <div className="format-row" key={c}>
                <div>
                  <Clock3 size={14} />
                  <strong>{c}</strong>
                  <span>{gs.length} games</span>
                </div>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${total ? (gs.length / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <p className="panel-note">
            Formats have different rating pools. Compare your progress within
            each format.
          </p>
        </section>
      </div>
    </div>
  );
}
function RecommendationCards({ recommendations, onExplore }) {
  return (
    <div className="recommendation-grid">
      {recommendations.map((r, i) => (
        <button
          className="opening-card"
          key={r.name + r.side}
          onClick={() => onExplore(r)}
        >
          <div className="opening-card-top">
            <span className={`color-label ${r.side}`}>
              <i />
              {r.side === "white" ? "AS WHITE" : "AS BLACK"}
            </span>
            <span className="eco-code">{r.eco}</span>
          </div>
          <div className="opening-card-middle">
            <MiniBoard moves={r.moves} />
            <div>
              <span className="opening-style">{r.style}</span>
              <h3>{r.name}</h3>
              <p>
                {r.moves
                  .split(" ")
                  .slice(0, 5)
                  .map(
                    (m, j) =>
                      `${j % 2 === 0 ? `${Math.floor(j / 2) + 1}. ` : ""}${m}`,
                  )
                  .join(" ")}
              </p>
            </div>
          </div>
          <div className="opening-card-footer">
            <span>
              <span className={`dot ${r.sample ? "green" : "muted"}`} />
              {r.confidence}
            </span>
            <ArrowUpRight size={16} />
          </div>
        </button>
      ))}
    </div>
  );
}
function OpeningsPage({ summary: s, games }) {
  const [color, setColor] = useState("white"),
    [selected, setSelected] = useState(null),
    [min, setMin] = useState(1);
  const rows = s.openings
    .filter((o) => o.color === color && o.games >= min)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games);
  return (
    <>
      <section className="panel repertoire-panel">
        <PanelHeading
          title="Your recommended repertoire"
          subtitle="Evidence where we have it. Honest suggestions where we don’t."
        />
        <RecommendationCards
          recommendations={s.recommendations}
          onExplore={setSelected}
        />
        <div className="panel-note">
          <Info size={13} />
          Suggestions use your full report, including formats outside the active
          filter. Win rate alone does not prove an opening fits your style.
        </div>
      </section>
      <section className="panel style-signals">
        <PanelHeading
          title="Your style, in signals"
          subtitle="Patterns from your first 20 moves in each game. Clues to explore, not a personality test."
        />
        <div className="style-signal-grid">
          <div>
            <Swords size={18} />
            <strong>{pct(s.style.captureRate)}</strong>
            <span>Early moves that capture</span>
          </div>
          <div>
            <Zap size={18} />
            <strong>{pct(s.style.checkRate)}</strong>
            <span>Early moves that give check</span>
          </div>
          <div>
            <Shield size={18} />
            <strong>{pct(s.style.longCastleRate)}</strong>
            <span>Games with queenside castling</span>
          </div>
          <div>
            <Clock3 size={18} />
            <strong>{s.style.averageLength ?? "—"}</strong>
            <span>Average full moves per game</span>
          </div>
        </div>
      </section>
      <section className="panel openings-results">
        <PanelHeading
          title="What’s working at the board"
          subtitle="Results from the games in your current view."
          right={
            <div className="segmented">
              <button
                className={color === "white" ? "selected" : ""}
                onClick={() => setColor("white")}
              >
                ♙ White
              </button>
              <button
                className={color === "black" ? "selected" : ""}
                onClick={() => setColor("black")}
              >
                ♟ Black
              </button>
            </div>
          }
        />
        <div className="opening-filter">
          <label>
            Minimum games{" "}
            <select
              aria-label="Minimum games per opening"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
            >
              <option value={1}>1 game</option>
              <option value={5}>5 games</option>
              <option value={10}>10 games</option>
            </select>
          </label>
        </div>
        {!rows.length ? (
          <EmptyState
            title="A little more chess needed"
            text="No openings meet this sample size. Lower the minimum or import more games."
          />
        ) : (
          <div className="table-scroll">
            <table className="opening-table">
              <thead>
                <tr>
                  <th>OPENING</th>
                  <th>GAMES</th>
                  <th>W / D / L</th>
                  <th>WIN RATE</th>
                  <th>SAMPLE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.name}>
                    <td>
                      <span className="eco-pill">{o.eco}</span>
                      <strong>{o.name}</strong>
                    </td>
                    <td>{o.games}</td>
                    <td>
                      <span className="positive">{o.wins}</span> / {o.draws} /{" "}
                      <span className="negative">
                        {o.games - o.wins - o.draws}
                      </span>
                    </td>
                    <td>
                      <div className="win-rate-cell">
                        <div className="bar-track">
                          <i style={{ width: `${o.winRate}%` }} />
                        </div>
                        <strong>{o.winRate}%</strong>
                      </div>
                    </td>
                    <td>
                      <span className="sample-tag">
                        {o.games < 5
                          ? "Small sample"
                          : o.games < 25
                            ? "Early signal"
                            : "Growing evidence"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="opening-explanation">
            <div className="opening-explanation-top">
              <MiniBoard moves={selected.moves} />
              <div>
                <span className="tag">
                  {selected.side === "white"
                    ? "Play with White"
                    : "Play with Black"}
                </span>
                <h3>{selected.style}</h3>
                <p>{selected.why}</p>
              </div>
            </div>
            <div className="move-line">
              {selected.moves.split(" ").map((m, i) => (
                <span key={i}>
                  {i % 2 === 0 && <small>{Math.floor(i / 2) + 1}.</small>}
                  {m}
                </span>
              ))}
            </div>
            <h3>Why it’s on your list</h3>
            <p>{selected.evidence}</p>
            <h3>Your first three steps</h3>
            <ol>
              <li>
                Play through the starting moves and identify the central pawn
                structure.
              </li>
              <li>
                Study one annotated master game. Focus on development and the
                main pawn break.
              </li>
              <li>
                Try it in five slower games, then review the positions where you
                felt unsure.
              </li>
            </ol>
            <div className="subtle-note">
              <Info size={15} />A useful experiment, not a promise of higher win
              rates.
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function TrainingPage({ summary: s, games, onReview }) {
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("knightly-practice") || "{}");
    } catch {
      return {};
    }
  });
  const tasks = [
    {
      id: "review",
      title: "Find one turning point",
      text: "Review a recent loss. Before looking at the engine, write down the move where the game felt different.",
      time: "10 min",
      action: () => {
        const g = games.find((g) => g.result === "loss") || games[0];
        if (g) onReview(g);
      },
      label: "Choose a game",
    },
    {
      id: "opening",
      title: "Understand a plan, not just a line",
      text: "Choose one recommended opening. Learn where your pieces belong and which pawn break you’re aiming for.",
      time: "15 min",
    },
    {
      id: "slow",
      title: "Give your thinking some room",
      text: "Play a 15+10 game. Before each move, check your opponent’s threats, your loose pieces, and your king’s safety.",
      time: "30 min",
    },
    {
      id: "reflect",
      title: "Close the loop",
      text: "After your next game, note one thing you did well and one position to revisit. Keep the lesson small and specific.",
      time: "5 min",
    },
  ];
  function toggle(id) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    localStorage.setItem("knightly-practice", JSON.stringify(next));
  }
  return (
    <>
      <div className="training-grid">
        <section className="panel phase-panel">
          <PanelHeading
            title="Where your moves leave room to grow"
            subtitle={`Average centipawn loss across ${s.analyzed} reviewed games in this view. Lower is better.`}
          />
          {s.analyzed ? (
            <>
              {Object.entries(s.phases).map(([name, p]) => (
                <div className="phase-row" key={name}>
                  <div>
                    <strong>{name}</strong>
                    <span>{p.moves} reviewed moves</span>
                    <b>
                      {p.averageLoss ?? "—"} <small>cp</small>
                    </b>
                  </div>
                  <div className="bar-track">
                    <i
                      style={{
                        width: `${p.averageLoss == null ? 0 : Math.min(100, p.averageLoss / 3)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="subtle-note">
                <Info size={15} />
                Quick engine analysis can miss deeper tactics. Opening = first
                10 moves; endgame = no queens and at most 12 pieces; other
                positions = middlegame.
              </div>
            </>
          ) : (
            <EmptyState
              title="Your next lesson is in your games"
              text="Review a game with Stockfish to unlock phase-specific feedback."
              action={
                games[0] && (
                  <button
                    className="button primary"
                    onClick={() => onReview(games[0])}
                  >
                    Review latest game <ArrowRight size={15} />
                  </button>
                )
              }
            />
          )}
        </section>
        <section className="training-focus">
          <span className="eyebrow">
            <Target size={16} /> YOUR STARTING POINT
          </span>
          <h2>
            {s.focus
              ? `Let’s work on your ${s.focus.toLowerCase()}.`
              : "Build the habit of reviewing."}
          </h2>
          <p>
            {s.focus
              ? `The ${s.focus.toLowerCase()} has the highest average evaluation loss in your reviewed sample. It’s a useful place to investigate, rather than a complete diagnosis.`
              : "Results show what happened. Reviewing your decisions helps explain why. Start with one game, and look for one repeatable lesson."}
          </p>
          <span className="tag">
            {s.analyzed < 5
              ? "Limited sample — keep exploring"
              : `${s.analyzed} reviewed games`}
          </span>
        </section>
      </div>
      <section className="panel training-checklist">
        <PanelHeading
          title="A small plan for your next session"
          subtitle="These practice suggestions are a starting point. Your checklist is saved in this browser."
          right={
            <span className="tag">
              {tasks.filter((t) => done[t.id]).length} / {tasks.length} complete
            </span>
          }
        />
        {tasks.map((t, i) => (
          <div
            className={`practice-row ${done[t.id] ? "completed" : ""}`}
            key={t.id}
          >
            <button
              className="check-button"
              aria-label={`${done[t.id] ? "Unmark" : "Complete"} ${t.title}`}
              onClick={() => toggle(t.id)}
            >
              {done[t.id] ? <Check size={17} /> : <span>{i + 1}</span>}
            </button>
            <div>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
              {t.action && (
                <button className="text-button" onClick={t.action}>
                  {t.label}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
            <span className="practice-time">
              <Clock3 size={13} />
              {t.time}
            </span>
          </div>
        ))}
      </section>
      <InsightCards summary={s} />
    </>
  );
}
const PIECES = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
function Board({ fen = START, flipped = false, lastMove, mini = false }) {
  const placement = fen.split(" ")[0];
  const squares = [];
  placement.split("/").forEach((row, r) => {
    let file = 0;
    for (const c of row) {
      if (/[1-8]/.test(c)) {
        for (let i = 0; i < Number(c); i++)
          squares.push({ r, f: file++, piece: null });
      } else squares.push({ r, f: file++, piece: c });
    }
  });
  if (flipped) squares.reverse();
  return (
    <div
      className={`chessboard ${mini ? "mini-board" : ""}`}
      role="img"
      aria-label={
        mini
          ? "Opening position"
          : `Chess position, ${fen.split(" ")[1] === "w" ? "White" : "Black"} to move`
      }
    >
      {squares.map(({ r, f, piece }, i) => {
        const square = String.fromCharCode(97 + f) + (8 - r),
          highlight =
            lastMove && (square === lastMove.from || square === lastMove.to);
        return (
          <div
            key={square}
            className={`square ${(r + f) % 2 ? "dark-square" : "light-square"} ${highlight ? "highlight-square" : ""}`}
          >
            {piece && (
              <span
                className={`chess-piece ${piece === piece.toUpperCase() ? "white-piece" : "black-piece"}`}
              >
                {PIECES[piece.toLowerCase()]}
              </span>
            )}
            {!mini && i % 8 === 0 && (
              <span className="rank-coordinate">{8 - r}</span>
            )}
            {!mini && i >= 56 && (
              <span className="file-coordinate">
                {String.fromCharCode(97 + f)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
function MiniBoard({ moves }) {
  const fen = useMemo(() => {
    const c = new Chess();
    try {
      for (const m of moves.split(" ")) c.move(m);
    } catch {}
    return c.fen();
  }, [moves]);
  return <Board fen={fen} mini />;
}
function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function keyboard(e) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled),input,select,a[href],[tabindex="0"]',
          ),
        ];
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", keyboard);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function ImportModal({ onClose, onStart }) {
  const [platform, setPlatform] = useState("chess.com"),
    [username, setUsername] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/import", {
        method: "POST",
        body: JSON.stringify({ platform, username: username.trim() }),
      });
      onStart(result);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal title="Your games. Your next chapter." onClose={onClose}>
      <form className="import-form" onSubmit={submit}>
        <div className="import-icon">♞</div>
        <p>
          Connect a public profile to discover your patterns, find your
          openings, and make your next move count.
        </p>
        <label>Where do you play?</label>
        <div className="platform-picker">
          {[
            ["chess.com", "Chess.com"],
            ["lichess", "Lichess"],
          ].map(([id, name]) => (
            <button
              type="button"
              className={platform === id ? "selected" : ""}
              aria-label={name}
              key={id}
              onClick={() => setPlatform(id)}
            >
              <span>{id === "lichess" ? "♘" : "♟"}</span>
              {name}
              {platform === id && <CheckCircle2 size={16} />}
            </button>
          ))}
        </div>
        <label htmlFor="username">Your username</label>
        <div className="username-input">
          <span>@</span>
          <input
            id="username"
            placeholder="e.g. yourchessname"
            required
            minLength={1}
            maxLength={30}
            pattern="[A-Za-z0-9_\-]+"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <span className="input-hint">
          Just your username — no password needed.
        </span>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button
          className="button primary import-submit"
          disabled={busy || !username.trim()}
        >
          {busy ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <Sparkles size={17} />
          )}{" "}
          {busy ? "Starting your report…" : "Find my chess story"}
          <ArrowRight size={17} />
        </button>
        <div className="import-details">
          <span>
            <Check size={13} />
            Up to 150 recent games
          </span>
          <span>
            <Check size={13} />3 Stockfish reviews
          </span>
          <span>
            <Check size={13} />
            No sign-in required
          </span>
        </div>
        <div className="subtle-note">
          <Clock3 size={15} />
          Your results arrive first; engine reviews run in the background. First
          analysis may take a few minutes. Chess.com imports check up to 12
          recent archive months.
        </div>
      </form>
    </Modal>
  );
}
function ReviewModal({ game: g, onClose, job, onAnalyse }) {
  const [ply, setPly] = useState(0),
    [flipped, setFlipped] = useState(g.color === "black");
  const [copied, setCopied] = useState(false);
  const moves = g.moves,
    analysis = g.analysis;
  const move = ply ? moves[ply - 1] : null;
  const fen = move?.after || moves[0]?.before || START;
  const position = analysis?.positions.find((p) => p.ply === ply),
    mistake = analysis?.mistakes.find((m) => m.ply === ply);
  const currentCp = position?.cp;
  const bar =
    currentCp == null ? 50 : Math.max(3, Math.min(97, 50 + currentCp / 16));
  const active = job?.status === "running";
  useEffect(() => {
    const listener = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPly((p) => Math.max(0, p - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPly((p) => Math.min(moves.length, p + 1));
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [moves.length]);
  const ownAtBottom = flipped === (g.color === "black");
  const best = useMemo(() => {
    if (!mistake?.best) return null;
    try {
      const chess = new Chess(moves[ply - 1].before);
      return chess.move({
        from: mistake.best.slice(0, 2),
        to: mistake.best.slice(2, 4),
        promotion: mistake.best[4],
      })?.san;
    } catch {
      return null;
    }
  }, [mistake, ply, moves]);
  function download() {
    const blob = new Blob([g.pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knightly-${g.opponent}-${g.date.slice(0, 10)}.pgn`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Modal title={`Your game vs ${g.opponent}`} onClose={onClose} wide>
      <div className="review-meta">
        <span className={`result-badge ${g.result}`}>
          <span />
          {g.result === "win"
            ? "Victory"
            : g.result === "loss"
              ? "Defeat"
              : "Draw"}
        </span>
        <span>{g.opening.name}</span>
        <span>·</span>
        <span>{g.category}</span>
        <span>·</span>
        <span>{dateLabel(g.date)}</span>
      </div>
      <div className="review-layout">
        <div className="board-section">
          <div className="board-player">
            <span className="avatar small-avatar">
              {(ownAtBottom ? g.opponent : "YOU").slice(0, 2).toUpperCase()}
            </span>
            <strong>{ownAtBottom ? g.opponent : "You"}</strong>
            <span>{ownAtBottom ? g.opponentRating : g.rating}</span>
          </div>
          <div className="board-with-eval">
            <div
              className={`eval-bar ${flipped ? "flipped-eval" : ""}`}
              title="Evaluation from White’s perspective"
            >
              <div style={{ height: `${bar}%` }} className="white-eval" />
              <span>
                {currentCp == null
                  ? "—"
                  : Math.abs(currentCp) >= 9000
                    ? "M"
                    : (Math.abs(currentCp) / 100).toFixed(1)}
              </span>
            </div>
            <Board fen={fen} flipped={flipped} lastMove={move} />
          </div>
          <div className="board-player">
            <span className="avatar small-avatar">
              {(ownAtBottom ? "YOU" : g.opponent).slice(0, 2).toUpperCase()}
            </span>
            <strong>{ownAtBottom ? "You" : g.opponent}</strong>
            <span>{ownAtBottom ? g.rating : g.opponentRating}</span>
            <button
              className="icon-button"
              aria-label="Flip board"
              title="Flip board"
              onClick={() => setFlipped(!flipped)}
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="board-controls">
            <button
              aria-label="First position"
              onClick={() => setPly(0)}
              disabled={!ply}
            >
              <ChevronsLeft size={20} />
            </button>
            <button
              aria-label="Previous move"
              onClick={() => setPly(Math.max(0, ply - 1))}
              disabled={!ply}
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              {ply} / {moves.length}
            </span>
            <button
              aria-label="Next move"
              onClick={() => setPly(Math.min(moves.length, ply + 1))}
              disabled={ply === moves.length}
            >
              <ChevronRight size={20} />
            </button>
            <button
              aria-label="Final position"
              onClick={() => setPly(moves.length)}
              disabled={ply === moves.length}
            >
              <ChevronsRight size={20} />
            </button>
          </div>
          <div className="board-hint">Use ← and → to explore the game</div>
        </div>
        <div className="review-side">
          <div className="review-engine-header">
            <Sparkles size={16} />
            <strong>{analysis ? "Stockfish review" : "Game review"}</strong>
            {analysis && <span className="tag">6k nodes / position</span>}
          </div>
          {analysis ? (
            <>
              <div
                className={`move-feedback ${mistake?.label?.toLowerCase() || ""}`}
              >
                <span className="eyebrow">
                  {ply
                    ? `MOVE ${Math.ceil(ply / 2)} · ${ply % 2 ? "WHITE" : "BLACK"}`
                    : "STARTING POSITION"}
                </span>
                <h3>
                  {mistake
                    ? `${mistake.san} · ${mistake.label}`
                    : ply
                      ? "Their move. Your next opportunity."
                      : "Every game starts with possibilities."}
                </h3>
                <p>
                  {mistake
                    ? mistake.loss >= 50
                      ? `${best ? `Consider ${best} instead. ` : ""}This move lost approximately ${(mistake.loss / 100).toFixed(2)} pawns of evaluation. Check the threats before choosing your reply.`
                      : "This move kept the evaluation broadly stable at this search limit."
                    : ply > analysis.plies
                      ? "This position is beyond the reviewed first 60 full moves. You can still explore it on the board."
                      : "Select one of your moves to see the engine’s quick assessment."}
                </p>
                {position && (
                  <div className="eval-label">
                    White’s evaluation{" "}
                    <strong>
                      {Math.abs(position.cp) >= 9000
                        ? position.cp > 0
                          ? "White has a forced mate"
                          : "Black has a forced mate"
                        : `${position.cp >= 0 ? "+" : ""}${(position.cp / 100).toFixed(2)}`}
                    </strong>
                  </div>
                )}
              </div>
              <EvalChart
                positions={analysis.positions}
                onSelect={setPly}
                ply={ply}
              />
            </>
          ) : (
            <div className="review-pending">
              {active ? (
                <Loader2 size={24} className="spin" />
              ) : (
                <Lightbulb size={24} />
              )}
              <h3>
                {active
                  ? "Finding the moments that matter…"
                  : "Look a little deeper."}
              </h3>
              <p>
                {active
                  ? `${job.message} ${job.progress}%`
                  : "Run a Stockfish review to see evaluation changes and suggested alternatives."}
              </p>
              {!active && (
                <button className="button primary" onClick={onAnalyse}>
                  <Sparkles size={15} />
                  Analyse this game
                </button>
              )}
            </div>
          )}
          <div className="move-list" aria-label="Game moves">
            {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => (
              <div className="move-pair" key={i}>
                <span>{i + 1}.</span>
                {[i * 2, i * 2 + 1].map((j) => {
                  const m = moves[j];
                  if (!m) return <span key={j} />;
                  const mark = analysis?.mistakes.find((x) => x.ply === j + 1);
                  return (
                    <button
                      key={j}
                      className={`${ply === j + 1 ? "selected" : ""} ${mark?.loss >= 200 ? "blunder" : mark?.loss >= 100 ? "mistake" : ""}`}
                      onClick={() => setPly(j + 1)}
                    >
                      {m.san}
                      <span>
                        {mark?.loss >= 200
                          ? "??"
                          : mark?.loss >= 100
                            ? "?"
                            : mark?.loss >= 50
                              ? "?!"
                              : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="review-footer">
            <button className="text-button" onClick={download}>
              <Download size={14} />
              {copied ? "Downloaded" : "Download PGN"}
            </button>
            {g.url && (
              <a
                className="text-button"
                href={g.url}
                target="_blank"
                rel="noreferrer"
              >
                Original game <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      </div>
      {analysis && (
        <div className="review-disclaimer">
          Stockfish 19 lite · limited search · {analysis.plies} of{" "}
          {analysis.totalPlies} plies reviewed. Evaluations are estimates, not a
          full-depth analysis.
        </div>
      )}
    </Modal>
  );
}
function EvalChart({ positions, onSelect, ply }) {
  if (positions.length < 2) return null;
  const w = 320,
    h = 62;
  const x = (i) => (i / (positions.length - 1)) * w,
    y = (cp) => h / 2 - (Math.max(-600, Math.min(600, cp)) / 600) * (h / 2 - 5);
  const points = positions.map((p, i) => `${x(i)},${y(p.cp)}`).join(" ");
  return (
    <div className="eval-chart">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Game evaluation graph"
      >
        <line
          x1="0"
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke="#53604f"
          strokeDasharray="3 3"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#b3cf8a"
          strokeWidth="1.5"
        />
        {positions.map((p, i) => (
          <rect
            key={i}
            x={x(i) - 3}
            y="0"
            width={Math.max(6, w / positions.length)}
            height={h}
            fill="transparent"
            onClick={() => onSelect(p.ply)}
            style={{ cursor: "pointer" }}
          />
        ))}
        <line
          x1={x(Math.min(ply, positions.length - 1))}
          x2={x(Math.min(ply, positions.length - 1))}
          y1="0"
          y2={h}
          stroke="#e9e9dc"
          opacity=".5"
        />
      </svg>
      <span>Click the graph to explore a position</span>
    </div>
  );
}
function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">♞</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
