// Bearer attacher — waits briefly for the session to hydrate before firing
// the server function. This avoids "Unauthorized: No authorization header"
// race errors when a page calls a protected server fn during cold load.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

async function getSessionWithWait(maxMs = 2000): Promise<string | null> {
  const start = Date.now();
  // Fast path
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;

  // Wait for INITIAL_SESSION / SIGNED_IN before giving up
  return new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      try { sub.data.subscription.unsubscribe(); } catch { /* noop */ }
      clearInterval(poll);
      clearTimeout(timer);
      resolve(token);
    };
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) finish(session.access_token);
    });
    // Re-poll as a safety net (storage races on hard refresh)
    const poll = setInterval(async () => {
      const { data: d } = await supabase.auth.getSession();
      if (d.session?.access_token) finish(d.session.access_token);
      else if (Date.now() - start > maxMs) finish(null);
    }, 150);
    const timer = setTimeout(() => finish(null), maxMs);
  });
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getSessionWithWait();
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
