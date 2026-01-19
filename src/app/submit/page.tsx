"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Game = { id: number; slug: string; name: string };
type Version = { id: number; game_id: number; name: string };
type Profile = { user_id: string; display_name: string; is_admin: boolean };

export default function SubmitPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  const [games, setGames] = useState<Game[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [gameSlug, setGameSlug] = useState("catan");
  const selectedGame = useMemo(() => games.find((g) => g.slug === gameSlug), [games, gameSlug]);
  const [versionId, setVersionId] = useState<number | null>(null);

  const [winnerId, setWinnerId] = useState<string>("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.user.id);

      const [{ data: prof }, { data: g }, { data: v }, { data: p }] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,is_admin").eq("user_id", data.user.id).single(),
        supabase.from("games").select("id,slug,name").order("name"),
        supabase.from("game_versions").select("id,game_id,name"),
        supabase.from("profiles").select("user_id,display_name,is_admin").order("display_name"),
      ]);

      setMyProfile((prof as any) ?? null);
      setGames((g as any) ?? []);
      setVersions((v as any) ?? []);
      setProfiles((p as any) ?? []);

      // Defaults
      setWinnerId(data.user.id);
      setParticipants([data.user.id]);
    })();
  }, []);

  // Update default version when switching games
  useEffect(() => {
    if (!selectedGame) return;
    const gameVersions = versions.filter((x) => x.game_id === selectedGame.id);
    const base = gameVersions.find((x) => x.name === "Base") ?? gameVersions[0];
    setVersionId(base?.id ?? null);
  }, [selectedGame, versions]);

  const gameVersions = selectedGame ? versions.filter((x) => x.game_id === selectedGame.id) : [];

  function toggleParticipant(pid: string) {
    setParticipants((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  }

  async function submit() {
    setMsg(null);
    if (!userId) return;

    if (!selectedGame) return setMsg("No game selected.");
    if (!winnerId) return setMsg("Pick a winner.");
    if (participants.length < 2) return setMsg("Pick at least 2 participants.");
    if (!participants.includes(winnerId)) return setMsg("Winner must be included in participants.");

    // Create match (played_at defaults to now in DB)
    const { data: match, error: mErr } = await supabase
      .from("matches")
      .insert({
        game_id: selectedGame.id,
        version_id: versionId,
        winner_id: winnerId,
        submitted_by: userId,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (mErr) return setMsg(mErr.message);

    // Add participants
    const rows = participants.map((pid) => ({ match_id: match.id, player_id: pid }));
    const { error: pErr } = await supabase.from("match_participants").insert(rows);
    if (pErr) return setMsg(pErr.message);

    setNotes("");
    setMsg("Saved. Leaderboard updated.");
    setTimeout(() => (window.location.href = "/"), 700);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <div className="header">
        <div>
          <h1 style={{ margin: 0 }}>Submit a result</h1>
          <div className="small">
            Logged in as <strong>{myProfile?.display_name ?? "..."}</strong>
          </div>
        </div>
        <div style={{ minWidth: 160 }}>
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="card">
        <div className="grid2">
          <div>
            <label>Game</label>
            <select value={gameSlug} onChange={(e) => setGameSlug(e.target.value)}>
              {games.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Version</label>
            <select
              value={versionId ?? ""}
              onChange={(e) => setVersionId(e.target.value ? Number(e.target.value) : null)}
            >
              {gameVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
              {gameVersions.length === 0 && <option value="">(No versions)</option>}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Winner</label>
          <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.display_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Participants (tap to select)</label>
          <div className="tabs" style={{ marginTop: 6 }}>
            {profiles.map((p) => {
              const active = participants.includes(p.user_id);
              return (
                <button
                  key={p.user_id}
                  className={active ? "" : "secondary"}
                  onClick={() => toggleParticipant(p.user_id)}
                  style={{ width: "auto", padding: "8px 10px" }}
                  type="button"
                >
                  {p.display_name}
                </button>
              );
            })}
          </div>
          <div className="small">Date/time defaults to when you press Save.</div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything notable..." />
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={submit}>Save result</button>
        </div>

        {msg && (
          <div style={{ marginTop: 10 }} className={msg.startsWith("Saved") ? "success" : "error"}>
            {msg}
          </div>
        )}
      </div>

      {myProfile?.is_admin && (
  <div className="card">
    <a className="tab" href="/admin">Go to Admin</a>
  </div>
)}

    </>
  );
}
