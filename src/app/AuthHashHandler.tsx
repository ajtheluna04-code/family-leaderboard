"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function parseHash(hash: string) {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export default function AuthHashHandler() {
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    (async () => {
      const { access_token, refresh_token, type } = parseHash(window.location.hash);

      // Only handle Supabase auth links
      if (!access_token || !refresh_token) return;

      // Clear the hash immediately (so tokens aren't left in the URL)
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

      // Store the session
      await supabase.auth.setSession({ access_token, refresh_token });

      // Where to go after confirm/invite/recovery
      if (type === "recovery") {
        window.location.href = "/submit";
      } else {
        window.location.href = "/submit";
      }
    })();
  }, []);

  return null;
}
