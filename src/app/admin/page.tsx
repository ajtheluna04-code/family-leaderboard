"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = { user_id: string; display_name: string; is_admin: boolean };
type Match = { id: string; played_at: string; winner_id: string; submitted_by: string; notes: string | null };
type Audit = { id: number; action: string; record_id: string; actor: string | null; created_at: string };

export default function AdminPage() {
  const supabase = createSupabaseBrowserClient();

  const [me, setMe] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [nameById, setNameById] = useState<Map<string, string>>(new Map());
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return (window.location.href = "/login");

      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id,display_name,is_admin")
        .eq("user_id", data.user.id)
        .single();

      if (!prof?.is_admin) return (window.location.href = "/");

      setMe(prof as any);

      const { data: profiles } = await supabase.from("profiles").select("user_id,display_name");
      setNameById(new Map((profiles ?? []).map((x: any) => [x.user_id, x.display_name])));

      await refresh();
    })();
  }, []);

  async function refresh() {
    const { data: m } = await supabase
      .from("matches")
      .select("id,played_at,winner_id,submitted_by,notes")
      .order("played_at", { ascending: false })
      .limit(50);
    setMatches((m as any) ?? []);

    const { data: a } = await supabase
      .from("audit_log")
      .select("id,action,record_id,actor,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setAudit((a as any) ?? []);
  }

  async function deleteMatch(id: string) {
    setMsg(null);
    if (!confirm("Delete this match? This cannot be undone.")) return;

    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) return setMsg(error.message);

    setMsg("Deleted.");
    await refresh();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <div className="header">
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <div className="small">Delete mistakes and review audit logs.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="tab" href="/">Back</Link>
          <button className="secondary" onClick={logout} style={{ width: 120 }}>
            Log out
          </button>
        </div>
      </div>

      {msg && <div className="card">{msg}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Recent matches (delete)</h2>
        {matches.map((m) => (
          <div key={m.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <strong>{nameById.get(m.winner_id) ?? "Unknown"}</strong> won •{" "}
              <span className="small">{new Date(m.played_at).toLocaleString()}</span>
            </div>
            <div className="small">Submitted by: {nameById.get(m.submitted_by) ?? "Unknown"}</div>
            {m.notes && <div className="small">Notes: {m.notes}</div>}
            <div style={{ marginTop: 6 }}>
              <button onClick={() => deleteMatch(m.id)} style={{ width: 140 }}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {matches.length === 0 && <div className="small">No matches yet.</div>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Audit log</h2>
        {audit.map((a) => (
          <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <strong>{a.action}</strong> • Match {a.record_id.slice(0, 8)}...
            </div>
            <div className="small">
              By: {a.actor ? (nameById.get(a.actor) ?? a.actor) : "Unknown"} •{" "}
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        ))}
        {audit.length === 0 && <div className="small">No audit entries yet.</div>}
      </div>
    </>
  );
}
