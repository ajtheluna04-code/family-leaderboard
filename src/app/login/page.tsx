"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function logIn() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    window.location.href = "/submit";
  }

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Family login</h1>
      <div className="small" style={{ marginBottom: 10 }}>
        Accounts are invite-only. Ask the admin to invite your email.
      </div>

      <div className="grid2">
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={logIn}>Log in</button>
      </div>

      {msg && <div style={{ marginTop: 10 }} className="error">{msg}</div>}
    </div>
  );
}
