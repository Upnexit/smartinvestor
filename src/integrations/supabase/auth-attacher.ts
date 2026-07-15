// Bearer attacher — waits briefly for the session to hydrate before firing
// the server function. This avoids "Unauthorized: No authorization header"
// race errors when a page calls a protected server fn during cold load.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

async function readAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function getSessionWithWait(maxMs = 5000): Promise<string | null> {
  const start = Date.now();
  let token = await readAccessToken();
  if (token) return token;

  token = await refreshAccessToken();
  if (token) return token;

  // Wait for INITIAL_SESSION / SIGNED_IN before giving up
  return new Promise<string | null>((resolve) => {
    let done = false;
    let polling = false;
    let lastRefresh = Date.now();
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
      if (polling) return;
      polling = true;
      try {
        let token = await readAccessToken();
        if (!token && Date.now() - lastRefresh > 1500) {
          lastRefresh = Date.now();
          token = await refreshAccessToken();
        }
        if (token) finish(token);
        else if (Date.now() - start > maxMs) finish(null);
      } finally {
        polling = false;
      }
    }, 400);
    const timer = setTimeout(() => finish(null), maxMs);
  });
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getSessionWithWait();
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
