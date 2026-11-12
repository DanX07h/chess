import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Trophy,
  Clock3,
  Flame,
  Gift,
  Download,
  BookOpen,
  Check,
  Info,
} from "lucide-react";
import { recapStats } from "../server/recap.js";
const number = (n) => (n == null ? "—" : n.toLocaleString());
const percentage = (n) => (n == null ? "Not enough data" : `${n}%`);
const date = (s) =>
  s
    ? new Date(s).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No games yet";
export function Welcome({ children, data, onResume, onDemo, error, busy }) {
  return (
    <div className="welcome-page">
      <header className="journey-header">
        <a className="journey-brand" href="/">
          ♞ <span>knightly.</span>
        </a>
        <span>YOUR GAMES HAVE A STORY.</span>
      </header>
      <main className="welcome-main">
        <section className="welcome-copy">
          <span className="journey-kicker">
            <Sparkles size={15} /> INTRODUCING YOUR CHESS REWIND
          </span>
          <h1>
            You made
            <br />
            the moves.
            <br />
            <em>Here’s your story.</em>
          </h1>
          <p>
            The wins you didn’t see coming. The streak you couldn’t stop. The
            opening that feels like home. Let’s meet the player behind your
            games.
          </p>
          <div className="welcome-art" aria-hidden="true">
            <span className="welcome-orbit" />
            <span className="welcome-knight">♞</span>
            <span className="welcome-star">✦</span>
            <span className="art-tag tag-one">a little chaos.</span>
            <span className="art-tag tag-two">a lot of possibility.</span>
          </div>
          <div className="welcome-features">
            <span>
              <Trophy size={15} />
              YOUR HIGHLIGHTS
            </span>
            <span>
              <Flame size={15} />
              YOUR PATTERNS
            </span>
            <span>
              <Gift size={15} />
              YOUR NEXT CHAPTER
            </span>
          </div>
        </section>
        <section className="welcome-form-card">
          <span className="journey-kicker">01 / FIND YOUR CHESS</span>
          <h2>First, who’s at the board?</h2>
          <p>Your public username is all we need.</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {children}
          <div className="welcome-secondary">
            <button onClick={onDemo} disabled={busy}>
              {busy ? (
                <>
                  Preparing the sample… <Loader2 size={14} className="spin" />
                </>
              ) : (
                <>
                  Explore a sample recap <ArrowRight size={14} />
                </>
              )}
            </button>
            {data && !data.demo && (
              <button onClick={onResume}>
                Continue {data.profile.username}’s dashboard{" "}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </section>
      </main>
      <footer className="welcome-footer">
        <span>No password. No sign-up. Just your chess.</span>
        <span>
          Public standard games · Honest insights · Made for your next move
        </span>
      </footer>
    </div>
  );
}
export function ImportProgress({
  job,
  data,
  onContinue,
  onRetry,
  onOpen,
  opening,
}) {
  return (
    <div className="journey-loading">
      <a className="journey-brand" href="/">
        ♞ <span>knightly.</span>
      </a>
      <div className="loading-orbit">
        <span>♞</span>
      </div>
      <span className="journey-kicker">CONNECTING THE MOVES</span>
      <h1>
        {job?.status === "error"
          ? "A pause in the story."
          : "Your chess story is taking shape."}
      </h1>
      <p role="status">{job?.message || "Finding your games…"}</p>
      <div className="journey-progress">
        <i style={{ width: `${job?.progress || 2}%` }} />
      </div>
      <span className="loading-percent">{job?.progress || 0}%</span>
      <p className="loading-explanation">
        First we collect your selected history. Then Stockfish reviews three
        games to add a little depth. Larger histories can take a few minutes.
      </p>
      {job?.datasetId && job.status !== "running" && (
        <button className="button primary" onClick={onOpen} disabled={opening}>
          {opening ? (
            <>
              <Loader2 size={16} className="spin" />
              Opening report…
            </>
          ) : (
            <>
              Open my report <ArrowRight size={16} />
            </>
          )}
        </button>
      )}
      {job?.status === "error" && (
        <button className="button primary" onClick={onRetry}>
          Try another import <ArrowRight size={16} />
        </button>
      )}
      {job?.status === "running" && job?.datasetId === data?.id && (
        <button className="text-button" onClick={onContinue}>
          Go to imported games while analysis finishes <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
export function Recap({ data, onFinish, onStartOver }) {
  const [step, setStep] = useState(0),
    [unwrapped, setUnwrapped] = useState(false),
    [saved, setSaved] = useState(false);
  const summary = data.summary;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const r = useMemo(
    () => recapStats(data.games, timezone),
    [data.games, timezone],
  );
  const headings = [
    "Your chess, replayed.",
    "Every rating tells a story.",
    "You found your rhythm.",
    "You punched above your rating.",
    "You were on a roll.",
    "Your chess o’clock.",
    "Let’s talk brilliant moves.",
    "You kept coming back.",
    "Your opening chapter.",
    "Your next breakthrough.",
    "Something for your next game.",
  ];
  const touch = useRef(null),
    heading = useRef(null);
  const next = () => setStep((s) => Math.min(headings.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  useEffect(() => {
    function key(e) {
      if (["INPUT", "SELECT", "BUTTON"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const gifts = ["white", "black"]
    .map(
      (side) =>
        summary.recommendations.find(
          (o) => o.side === side && o.sample === 0,
        ) || summary.recommendations.find((o) => o.side === side),
    )
    .filter(Boolean);
  const topOpening = (side) =>
    [...summary.openings]
      .filter((o) => o.color === side)
      .sort(
        (a, b) => (b.wins + 2) / (b.games + 4) - (a.wins + 2) / (a.games + 4),
      )[0];
  function saveCard() {
    const escape = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
          })[c],
      );
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#c5e985"/><circle cx="1000" cy="0" r="430" fill="#b2a1ed"/><text x="80" y="120" font-family="sans-serif" font-size="44" font-weight="700" fill="#172118">knightly. / CHESS REWIND</text><text x="80" y="310" font-family="sans-serif" font-size="65" font-weight="700" fill="#172118">${escape(data.profile.username)}</text><text x="80" y="420" font-family="sans-serif" font-size="30" fill="#172118">${escape(date(r.firstDate))} — ${escape(date(r.lastDate))}</text><text x="80" y="650" font-family="sans-serif" font-size="180" font-weight="700" fill="#172118">${summary.total}</text><text x="80" y="715" font-family="sans-serif" font-size="38" fill="#172118">games in this ${data.demo ? "illustrative demo" : "imported report"}</text><text x="80" y="875" font-family="sans-serif" font-size="48" fill="#172118">${summary.winRate ?? 0}% wins · ${r.longestStreak.count} wins in a row</text><text x="80" y="965" font-family="sans-serif" font-size="38" fill="#172118">Favourite pace: ${escape(r.mostPlayed?.name || "Unknown")}</text><text x="80" y="1160" font-family="sans-serif" font-size="27" fill="#172118">A sample of your games. A little more understanding.</text><text x="80" y="1220" font-family="sans-serif" font-size="24" fill="#172118">${data.coverage?.truncated ? "Import limited to " + data.coverage.limit + " games. Not complete account totals." : "Totals cover only the imported report."}</text></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knightly-${data.profile.username}-rewind.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true);
  }
  return (
    <div
      className={`rewind-page rewind-theme-${step % 4}`}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const delta = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(delta) > 70) {
          delta < 0 ? next() : prev();
        }
        touch.current = null;
      }}
    >
      <header className="journey-header">
        <button className="journey-brand" onClick={onStartOver}>
          ♞ <span>knightly.</span>
        </button>
        <span>CHESS REWIND / {data.profile.username}</span>
        <button className="rewind-skip" onClick={onFinish}>
          Skip to dashboard <ArrowRight size={14} />
        </button>
      </header>
      <div className="rewind-track" aria-label="Recap chapters">
        {headings.map((h, i) => (
          <button
            key={h}
            className={i <= step ? "seen" : ""}
            aria-label={`Chapter ${i + 1}: ${h}`}
            aria-current={step === i ? "step" : undefined}
            onClick={() => setStep(i)}
          />
        ))}
      </div>
      <div className="rewind-scope">
        {data.demo ? "ILLUSTRATIVE DEMO · " : ""}
        {date(r.firstDate)} — {date(r.lastDate)} · {number(summary.total)}{" "}
        imported games
        {data.coverage?.truncated &&
          ` · ${data.coverage.limit}-game limit reached`}
      </div>
      <main className="rewind-content" key={step}>
        <span className="journey-kicker">
          {String(step + 1).padStart(2, "0")} /{" "}
          {step === 10 ? "YOUR OPENING GIFT" : "THE PLAYER BEHIND THE MOVES"}
        </span>
        <h1 ref={heading} tabIndex={-1}>
          {headings[step]}
        </h1>
        {step === 0 && (
          <>
            <div className="rewind-number">
              {number(summary.total)}
              <span>games. One very individual player.</span>
            </div>
            <div className="rewind-result-line">
              <span>{summary.wins} wins</span>
              <span>{summary.draws} draws</span>
              <span>{summary.losses} lessons</span>
            </div>
            <p className="rewind-copy">
              Hey, {data.profile.username}. Every move left a clue. Here’s what
              your imported games have to say.
            </p>
            <span className="rewind-floater" aria-hidden="true">
              ♞
            </span>
          </>
        )}
        {step === 1 && (
          <>
            <p className="rewind-copy">
              Different clocks. Different journeys. Here’s how each rating moved
              across your imported games.
            </p>
            <div className="rewind-ratings">
              {Object.entries(r.formats).map(([name, f]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{number(f.lastRating)}</strong>
                  <b className={f.delta < 0 ? "rating-down" : ""}>
                    {f.delta == null
                      ? "Need 2 rated games"
                      : `${f.delta >= 0 ? "+" : ""}${f.delta} rating`}
                  </b>
                  <small>
                    {number(f.firstRating)} → {number(f.lastRating)} · {f.games}{" "}
                    games
                  </small>
                </div>
              ))}
            </div>
            <p className="rewind-footnote">
              First to last recorded game rating, not a lifetime total or
              guaranteed post-game rating. Unrated games are excluded from
              rating changes.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <div className="rewind-number format-number">
              {r.mostPlayed?.name || "Still exploring"}
              <span>
                {r.mostPlayed
                  ? `${r.mostPlayed.share}% of your imported games. This was your pace.`
                  : "No format data available."}
              </span>
            </div>
            <div className="rewind-format-bars">
              {Object.entries(r.formats).map(([name, f]) => (
                <div key={name}>
                  <span>{name}</span>
                  <div>
                    <i
                      style={{ width: `${(f.games / summary.total) * 100}%` }}
                    />
                  </div>
                  <b>{f.games}</b>
                </div>
              ))}
            </div>
            <p className="rewind-copy">
              {r.mostPlayed?.name === "Bullet"
                ? "Quick instincts. Short clocks. There’s barely time to blink."
                : r.mostPlayed?.name === "Blitz"
                  ? "Enough time for a plan. Just enough chaos to keep it interesting."
                  : "You made room to think. That’s where the plans begin."}
            </p>
          </>
        )}
        {step === 3 && (
          <>
            {r.bestWin ? (
              <>
                <div className="rewind-number">
                  {number(r.bestWin.opponentRating)}
                  <span>
                    The highest-rated opponent you beat in this report.
                  </span>
                </div>
                <div className="rewind-match">
                  <Trophy size={26} />
                  <div>
                    <strong>vs {r.bestWin.opponent}</strong>
                    <span>
                      {r.bestWin.category} · {date(r.bestWin.date)}
                    </span>
                  </div>
                  <b>
                    {r.bestWin.difference == null
                      ? "Rating difference unavailable"
                      : `${r.bestWin.difference >= 0 ? "+" : ""}${r.bestWin.difference} vs your rating`}
                  </b>
                </div>
                {r.biggestUpset && (
                  <p className="rewind-copy">
                    Your biggest rating upset: beating {r.biggestUpset.opponent}
                    , rated {r.biggestUpset.difference} points above you.
                  </p>
                )}
              </>
            ) : (
              <p className="rewind-copy">
                No wins against rated opponents in this imported sample yet.
                Your next one is waiting.
              </p>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <div className="rewind-number">
              {r.longestStreak.count}
              <span>wins in a row. You kept the momentum.</span>
            </div>
            <div className="rewind-streak" aria-hidden="true">
              {Array.from(
                { length: Math.min(r.longestStreak.count, 15) },
                (_, i) => (
                  <span key={i}>
                    <Flame size={28} />
                  </span>
                ),
              )}
            </div>
            <p className="rewind-copy">
              {r.longestStreak.count
                ? `${date(r.longestStreak.start)} — ${date(r.longestStreak.end)}. Your longest consecutive win streak across the imported games.`
                : "No win streak in this sample yet. There’s always the next game."}
            </p>
            <p className="rewind-footnote">
              Draws and losses end a streak. Games outside the imported history
              may change the full-account record.
            </p>
          </>
        )}
        {step === 5 && (
          <>
            <div className="rewind-number">
              {r.peakHour == null
                ? "Unknown"
                : `${String(r.peakHour).padStart(2, "0")}:00`}
              <span>
                {r.peakHour == null
                  ? "Game timestamps weren’t supplied."
                  : `Your busiest finishing hour · ${r.timeZone}`}
              </span>
            </div>
            <div
              className="rewind-hours"
              role="img"
              aria-label={`Game finishing times in ${r.timeZone}`}
            >
              {r.hours.map((n, i) => (
                <div key={i} title={`${i}:00 · ${n} games`}>
                  <i
                    className={i === r.peakHour ? "peak" : ""}
                    style={{
                      height: `${n ? Math.max(4, (n / Math.max(...r.hours)) * 100) : 2}%`,
                    }}
                  />
                  {i % 6 === 0 && <span>{i}:00</span>}
                </div>
              ))}
            </div>
            <p className="rewind-copy">
              {r.peakHour == null
                ? "We won’t guess when you play."
                : r.peakHour < 6
                  ? "A quiet world. A very awake chessboard."
                  : r.peakHour < 12
                    ? "Your chess has a morning rhythm."
                    : r.peakHour < 18
                      ? "An afternoon at the board. Time well spent."
                      : "When the day winds down, your chess picks up."}
            </p>
            <p className="rewind-footnote">
              Based on {r.timestampCount} recorded game end timestamps,
              converted to your browser’s timezone. This is not total time spent
              playing.
            </p>
          </>
        )}
        {step === 6 && (
          <>
            <div className="rewind-brilliant-symbol" aria-hidden="true">
              !!
            </div>
            <p className="rewind-copy">
              Some great moves don’t come with a label.
            </p>
            <div className="rewind-fact">
              <Info size={21} />
              <div>
                <h2>Brilliant count: not available</h2>
                <p>
                  {r.brilliants.reason} We can’t identify a “most brilliants”
                  game from these exports.
                </p>
              </div>
            </div>
            {r.sharpest ? (
              <div className="rewind-match">
                <Sparkles size={22} />
                <div>
                  <strong>
                    Sharpest of {summary.analyzed} reviewed games: vs{" "}
                    {r.sharpest.opponent}
                  </strong>
                  <span>
                    {r.sharpest.averageLoss} average centipawn loss ·{" "}
                    {r.sharpest.plies} plies reviewed. Lower loss is better;
                    this is not a brilliant-move score.
                  </span>
                </div>
              </div>
            ) : (
              <p className="rewind-footnote">
                Review more games in your dashboard to find your sharpest
                engine-reviewed performance.
              </p>
            )}
          </>
        )}
        {step === 7 && (
          <>
            <div className="rewind-mini-stats">
              <div>
                <strong>{percentage(summary.recovery.rate)}</strong>
                <span>win rate after a loss</span>
                <small>
                  {summary.recovery.wins} wins / {summary.recovery.games} next
                  games within 4 hours, same format
                </small>
              </div>
              <div>
                <strong>{percentage(summary.comebacks.rate)}</strong>
                <span>comeback win rate</span>
                <small>
                  {summary.comebacks.wins} wins / {summary.comebacks.games}{" "}
                  reviewed games from 2+ pawns behind
                </small>
              </div>
              <div>
                <strong>{percentage(summary.time.rate)}</strong>
                <span>games in time trouble</span>
                <small>
                  {summary.time.timeTrouble} / {summary.time.clockGames} games
                  with clock data
                </small>
              </div>
            </div>
            <p className="rewind-copy">
              Resilience isn’t a single result. It’s what you do with the next
              position.
            </p>
            <p className="rewind-footnote">
              Comebacks only use engine-reviewed portions. Small samples can
              look dramatic; the denominators matter.
            </p>
          </>
        )}
        {step === 8 && (
          <>
            <p className="rewind-copy">
              Two colours. Two opening chapters worth revisiting.
            </p>
            <div className="rewind-opening-results">
              {["white", "black"].map((side) => {
                const o = topOpening(side);
                return (
                  <div key={side}>
                    <span>
                      {side === "white" ? "♙ AS WHITE" : "♟ AS BLACK"}
                    </span>
                    <h2>{o?.name || "A chapter still to write"}</h2>
                    <strong>{o ? `${o.winRate}% wins` : "No games"}</strong>
                    <p>
                      {o
                        ? `${o.wins} wins in ${o.games} games · ${o.games < 5 ? "small sample" : "ranked with small-sample smoothing"}`
                        : "Play a few more games with this colour."}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {step === 9 && (
          <>
            <div className="rewind-number focus-number">
              {summary.focus || "Review. Reflect. Repeat."}
              <span>
                {summary.focus
                  ? "Your suggested training focus."
                  : "Your next habit."}
              </span>
            </div>
            <p className="rewind-copy">
              {summary.focus
                ? `Across ${summary.analyzed} reviewed games, the ${summary.focus.toLowerCase()} had your highest average evaluation loss. That’s a starting point for practice, not a verdict on your ability.`
                : "The best next step is one thoughtful game review. Find the turning point, consider an alternative, and take one lesson into your next game."}
            </p>
            <div className="rewind-fact">
              <BookOpen size={23} />
              <div>
                <h2>A small plan with room to grow.</h2>
                <p>
                  Learn one opening plan. Play one slower game. Review one
                  decision. Your dashboard has the tools to keep going.
                </p>
              </div>
            </div>
          </>
        )}
        {step === 10 && (
          <>
            <p className="rewind-copy">
              A little something for the player you’re becoming. Two openings to
              explore, chosen from your results, rating and early move patterns.
            </p>
            {!unwrapped ? (
              <button
                className="opening-gift"
                onClick={() => setUnwrapped(true)}
              >
                <span className="gift-bow" aria-hidden="true">
                  ✦
                </span>
                <Gift size={90} strokeWidth={1} />
                <span>OPEN YOUR REPERTOIRE</span>
                <strong>Made for your next move.</strong>
                <span className="gift-cta">
                  Unwrap your openings <ArrowRight size={19} />
                </span>
              </button>
            ) : (
              <div className="rewind-gifts">
                {gifts.map((o) => (
                  <div className="rewind-gift-card" key={o.side}>
                    <span>
                      {o.side === "white" ? "♙ WHITE’S GIFT" : "♟ BLACK’S GIFT"}
                    </span>
                    <h2>{o.name}</h2>
                    <b>{o.style}</b>
                    <p>{o.why}</p>
                    <div className="gift-moves">{o.moves}</div>
                    <small>{o.evidence}</small>
                    <span className="gift-confidence">
                      {o.confidence} · A recommendation to test, not a proven
                      fit.
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="rewind-footnote">
              Captures and checks are clues, not proof that a gambit will suit
              you. Play a few slower games and see how these positions feel.
            </p>
            {unwrapped && (
              <button className="rewind-download" onClick={saveCard}>
                <Download size={16} />
                {saved ? "Recap card saved" : "Save your recap card"}
              </button>
            )}
          </>
        )}
      </main>
      <footer className="rewind-controls">
        <button className="rewind-back" disabled={step === 0} onClick={prev}>
          <ChevronLeft size={18} />
          Back
        </button>
        <span>
          {step + 1} / {headings.length}
        </span>
        {step === headings.length - 1 ? (
          <button
            className="rewind-next"
            onClick={unwrapped ? onFinish : () => setUnwrapped(true)}
          >
            {unwrapped ? "Enter your dashboard" : "Unwrap my gift"}
            <ArrowRight size={18} />
          </button>
        ) : (
          <button className="rewind-next" onClick={next}>
            Next chapter <ChevronRight size={18} />
          </button>
        )}
      </footer>
    </div>
  );
}
