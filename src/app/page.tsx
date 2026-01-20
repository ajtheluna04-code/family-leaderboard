import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Game = { id: number; slug: string; name: string };
type Profile = { user_id: string; display_name: string; avatar_url?: string | null };
type Match = { id: string; game_id: number; winner_id: string; played_at: string };

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const [{ data: games }, { data: profiles }, { data: matches }] = await Promise.all([
    supabase.from("games").select("id,slug,name").order("name"),
    supabase.from("profiles").select("user_id,display_name,avatar_url").order("display_name"),
    supabase
      .from("matches")
      .select("id,game_id,winner_id,played_at")
      .order("played_at", { ascending: false })
      .limit(1000),
  ]);

  const nameById = new Map((profiles ?? []).map((p: Profile) => [p.user_id, p.display_name]));
  const avatarById = new Map((profiles ?? []).map((p: Profile) => [p.user_id, p.avatar_url ?? null]));

  // game_id -> (winner_id -> wins)
  const winsByGame = new Map<number, Map<string, number>>();
  const lastPlayedByGame = new Map<number, string>();

  for (const m of matches ?? []) {
    if (!winsByGame.has(m.game_id)) winsByGame.set(m.game_id, new Map());
    const gameWins = winsByGame.get(m.game_id)!;
    gameWins.set(m.winner_id, (gameWins.get(m.winner_id) ?? 0) + 1);

    if (!lastPlayedByGame.has(m.game_id)) lastPlayedByGame.set(m.game_id, m.played_at);
  }

  const champions = (games ?? []).map((g: Game) => {
    const gameWins = winsByGame.get(g.id) ?? new Map<string, number>();
    const best = [...gameWins.entries()].sort((a, b) => b[1] - a[1])[0]; // [user_id, wins]
    const champId = best?.[0] ?? null;
    const champWins = best?.[1] ?? 0;

    return {
      slug: g.slug,
      gameName: g.name,
      champName: champId ? nameById.get(champId) ?? "Unknown" : null,
      champAvatar: champId ? (avatarById.get(champId) ?? null) : null,
      champWins,
      lastPlayed: lastPlayedByGame.get(g.id) ?? null,
    };
  });

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1 style={{ margin: 0 }}>Game Night</h1>
          <div className="small">Pick a game to view leaderboards and log results.</div>
        </div>

        <div style={{ minWidth: 180, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {auth?.user ? (
            <Link className="tab" href="/submit">
              + Submit result
            </Link>
          ) : (
            <Link className="tab" href="/login">
              Family login
            </Link>
          )}
          <Link className="tab" href="/admin">
            Admin
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current Champions</h2>

        <div className="champGrid">
          {champions.map((c) => (
            <Link key={c.slug} className="champTile" href={`/leaderboard?game=${c.slug}`}>
              <div className="champGame">{c.gameName}</div>

              {c.champName ? (
                <div className="champRow">
                  <div>
                    <div className="champName">{c.champName}</div>
                    <div className="small">Wins: {c.champWins}</div>
                    <div className="small" style={{ marginTop: 8 }}>
                      {c.lastPlayed ? `Last played: ${new Date(c.lastPlayed).toLocaleString()}` : " "}
                    </div>
                  </div>

                  <div className="holoWrap">
                    {c.champAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="holoImg" src={c.champAvatar} alt={`${c.champName} photo`} />
                    ) : (
                      <div className="holoFallback">{c.champName.slice(0, 1)}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="small">No games logged yet</div>
              )}

              <div className="small" style={{ marginTop: 10 }}>
                View leaderboard →
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Choose a game</h2>
        <div className="tabs">
          {(games ?? []).map((g: Game) => (
            <Link key={g.id} className="tab" href={`/leaderboard?game=${g.slug}`}>
              {g.name}
            </Link>
          ))}
        </div>

        {(!games || games.length === 0) && <div className="small">No games found yet.</div>}
      </div>
    </div>
  );
}
