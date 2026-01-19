import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Game = { id: number; slug: string; name: string };

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: games } = await supabase.from("games").select("id,slug,name").order("name");

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1 style={{ margin: 0 }}>Game Night</h1>
          <div className="small">Pick a game to view leaderboards and recent results.</div>
        </div>
        <div style={{ minWidth: 180 }}>
          <Link className="tab" href="/login">Family login</Link>
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

        {(!games || games.length === 0) && (
          <div className="small">No games yet. Add one in the Admin page.</div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quick links</h2>
        <div className="tabs">
          <Link className="tab" href="/submit">Submit a result</Link>
          <Link className="tab" href="/admin">Admin</Link>
        </div>
      </div>
    </div>
  );
}
