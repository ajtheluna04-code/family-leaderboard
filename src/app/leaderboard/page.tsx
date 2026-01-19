import type { CSSProperties } from "react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
<Link className="tab" href="/">Home</Link>

type Profile = { user_id: string; display_name: string };
type Game = { id: number; slug: string; name: string };
type Version = { id: number; game_id: number; name: string };
type Match = {
  id: string;
  game_id: number;
  version_id: number | null;
  winner_id: string;
  played_at: string;
};
type Participant = { match_id: string; player_id: string };

function rankStyle(rank: number): CSSProperties {
  if (rank === 1) return { fontSize: 22, fontWeight: 700 };
  if (rank === 2) return { fontSize: 19, fontWeight: 650 as any };
  if (rank === 3) return { fontSize: 17, fontWeight: 600 };
  return { fontSize: 16, fontWeight: 500 };
}

export default async function Home({
  searchParams,
}: {
  searchParams: { game?: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: games } = await supabase
    .from("games")
    .select("id,slug,name")
    .order("name");
const sp = await Promise.resolve(searchParams as any);
const selectedSlug = sp?.game as string | undefined; // undefined means "Home"
const selectedGame = selectedSlug
  ? (games ?? []).find((g) => g.slug === selectedSlug) ?? null
  : null;

const gameId = selectedGame?.id ?? null;
const title = selectedGame?.name ?? "Family Game Night";


  const [
    { data: profiles },
    { data: versions },
    { data: matches },
    { data: participants },
  ] = await Promise.all([
    supabase.from("profiles").select("user_id,display_name").order("display_name"),
    supabase.from("game_versions").select("id,game_id,name"),
    gameId
      ? supabase
          .from("matches")
          .select("id,game_id,version_id,winner_id,played_at")
          .eq("game_id", gameId)
          .order("played_at", { ascending: false })
      : Promise.resolve({ data: [] as Match[] }),
    gameId
      ? supabase.from("match_participants").select("match_id,player_id")
      : Promise.resolve({ data: [] as Participant[] }),
  ]);

  const nameById = new Map(
    (profiles ?? []).map((p: Profile) => [p.user_id, p.display_name])
  );
  const versionNameById = new Map(
    (versions ?? []).map((v: Version) => [v.id, v.name])
  );

  const participantsByMatch = new Map<string, string[]>();
  for (const mp of participants ?? []) {
    if (!participantsByMatch.has(mp.match_id)) {
      participantsByMatch.set(mp.match_id, []);
    }
    participantsByMatch.get(mp.match_id)!.push(mp.player_id);
  }

  // Stats per player
  const stats = new Map<
    string,
    {
      name: string;
      wins: number;
      games: number;
      lastPlayed: string | null;
      beaten: Map<string, number>;
      lostTo: Map<string, number>;
    }
  >();

  for (const p of profiles ?? []) {
    stats.set(p.user_id, {
      name: p.display_name,
      wins: 0,
      games: 0,
      lastPlayed: null,
      beaten: new Map(),
      lostTo: new Map(),
    });
  }

  for (const m of matches ?? []) {
    const players = participantsByMatch.get(m.id) ?? [];

    for (const pid of players) {
      const s = stats.get(pid);
      if (!s) continue;

      s.games += 1;
      if (!s.lastPlayed || new Date(m.played_at) > new Date(s.lastPlayed)) {
        s.lastPlayed = m.played_at;
      }
      if (pid === m.winner_id) s.wins += 1;
    }

    for (const pid of players) {
      if (pid === m.winner_id) continue;

      const w = stats.get(m.winner_id);
      if (w) w.beaten.set(pid, (w.beaten.get(pid) ?? 0) + 1);

      const l = stats.get(pid);
      if (l) l.lostTo.set(m.winner_id, (l.lostTo.get(m.winner_id) ?? 0) + 1);
    }
  }

  const rows = [...stats.entries()]
    .map(([id, s]) => {
      const mostBeaten = [...s.beaten.entries()].sort((a, b) => b[1] - a[1])[0];
      const mostLostTo = [...s.lostTo.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        id,
        name: s.name,
        wins: s.wins,
        games: s.games,
        lastPlayed: s.lastPlayed,
        mostBeaten: mostBeaten
          ? `${nameById.get(mostBeaten[0]) ?? "?"} (${mostBeaten[1]})`
          : "-",
        mostLostTo: mostLostTo
          ? `${nameById.get(mostLostTo[0]) ?? "?"} (${mostLostTo[1]})`
          : "-",
      };
    })
    .sort((a, b) => b.wins - a.wins || b.games - a.games);

  const leader = rows[0] ?? null;
  const totalGamesLogged = matches?.length ?? 0;
  const lastGameTime = matches?.[0]?.played_at ?? null;

  return (
    <>
      {/* HOME / HERO */}
      <div className="homeHero">
        <div className="homeHeroTop">
          <div>
            <h1
              className={selectedSlug === "catan" ? "catanTitle" : ""}
              style={{ margin: 0 }}
            >
              {title}
            </h1>
            <div className="homeSubtitle">
              Track family game nights. Anyone can view. Family members log in to add results.
            </div>
          </div>

          <div className="homeHeroActions">
            {auth?.user ? (
              <Link className="btnPrimary" href="/submit">
                + Submit result
              </Link>
            ) : (
              <Link className="btnPrimary" href="/login">
                Family login
              </Link>
            )}
            <Link className="btnGhost" href="/admin">
              Admin
            </Link>
          </div>
        </div>

        <div className="homeHeroGrid">
          <div className="homeInfoCard">
            <div className="homeInfoTitle">How it works</div>
            <ol className="homeSteps">
              <li>Pick a game tab.</li>
              <li>Family logs in and submits results.</li>
              <li>Leaderboard updates automatically.</li>
            </ol>
          </div>

          <div className="homeInfoCard">
            <div className="homeInfoTitle">Game snapshot</div>
            <div className="homeStatRow">
              <div className="homeStat">
                <div className="homeStatLabel">Current leader</div>
                <div className="homeStatValue">{leader ? leader.name : "-"}</div>
              </div>
              <div className="homeStat">
                <div className="homeStatLabel">Games logged</div>
                <div className="homeStatValue">{totalGamesLogged}</div>
              </div>
              <div className="homeStat">
                <div className="homeStatLabel">Last game</div>
                <div className="homeStatValue">
                  {lastGameTime ? new Date(lastGameTime).toLocaleString() : "-"}
                </div>
              </div>
            </div>

            <div className="homeHint">
              Tip: Submit results right after the game to keep it accurate.
            </div>
          </div>
        </div>
      </div>
{!selectedGame && (
  <div className="homeInfoCard" style={{ marginBottom: 12 }}>
    <div className="homeInfoTitle">Choose a game</div>
    <div className="small" style={{ marginBottom: 10 }}>
      Tap a game below to view its leaderboard and recent matches.
    </div>
    <div className="chooseGameGrid">
      {(games ?? []).map((g: Game) => (
        <Link key={g.id} className="chooseGameTile" href={`/?game=${g.slug}`}>
          <div className="chooseGameName">{g.name}</div>
          <div className="small">View leaderboard →</div>
        </Link>
      ))}
    </div>
  </div>
)}

      {/* GAME TABS */}
      <div className="tabs">
        {(games ?? []).map((g: Game) => (
          <Link
            key={g.id}
            className={`tab ${g.slug === selectedSlug ? "tabActive" : ""}`}
            href={`/?game=${g.slug}`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {/* LEADERBOARD */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th style={{ padding: "8px 6px" }}>Rank</th>
                <th style={{ padding: "8px 6px" }}>Name</th>
                <th style={{ padding: "8px 6px" }}>Wins</th>
                <th style={{ padding: "8px 6px" }}>Games</th>
                <th style={{ padding: "8px 6px" }}>Last played</th>
                <th style={{ padding: "8px 6px" }}>Most beaten</th>
                <th style={{ padding: "8px 6px" }}>Most lost to</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "10px 6px" }}>{idx + 1}</td>
                  <td style={{ padding: "10px 6px" }}>
                    <span style={rankStyle(idx + 1)}>{r.name}</span>
                  </td>
                  <td style={{ padding: "10px 6px" }}>{r.wins}</td>
                  <td style={{ padding: "10px 6px" }}>{r.games}</td>
                  <td style={{ padding: "10px 6px" }}>
                    {r.lastPlayed ? new Date(r.lastPlayed).toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: "10px 6px" }}>{r.mostBeaten}</td>
                  <td style={{ padding: "10px 6px" }}>{r.mostLostTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT GAMES */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Recent games</h2>

        {(matches ?? []).slice(0, 10).map((m) => (
          <div
            key={m.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <strong>{nameById.get(m.winner_id) ?? "Unknown"}</strong> won
              {m.version_id
                ? ` • ${versionNameById.get(m.version_id) ?? "Version"}`
                : ""}
            </div>
            <div className="small">{new Date(m.played_at).toLocaleString()}</div>
          </div>
        ))}

        {(!matches || matches.length === 0) && (
          <div className="small">No games logged yet.</div>
        )}
      </div>
    </>
  );
}

