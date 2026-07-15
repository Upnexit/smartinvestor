import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Sensible defaults so a warm cache is actually reused between navigations
  // and rapid hover-preloads don't turn into a network storm under load.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,          // 30s: reuse warm data across mounts
        gcTime: 5 * 60_000,         // keep evicted entries around for 5m
        refetchOnWindowFocus: false, // don't re-hammer API on tab focus
        refetchOnReconnect: "always",
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // Reuse loader data for 30s so hover-preloading is (near-)free.
    defaultPreloadStaleTime: 30_000,
    defaultPreloadGcTime: 5 * 60_000,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  return router;
};
