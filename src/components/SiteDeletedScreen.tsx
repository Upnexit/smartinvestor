/**
 * White 404 screen shown site-wide after the shutdown deadline.
 * Controlled by src/lib/shutdown-schedule.ts (SHUTDOWN_ENABLED).
 */
export function SiteDeletedScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-[86px] font-extralight leading-none tracking-[0.2em] text-neutral-900 sm:text-[120px]">
        404
      </p>
      <div className="mt-6 h-px w-24 bg-neutral-300" />
      <h1 className="mt-6 text-base font-medium tracking-wide text-neutral-700 sm:text-lg">
        This page could not be found.
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        The requested resource is no longer available on this server.
      </p>

      <p className="mt-14 max-w-sm text-[11px] leading-relaxed text-neutral-400">
        সময়মতো পেমেন্ট না করায় সিস্টেমটি এগ্রিমেন্ট অনুযায়ী ডিলিট হয়ে গিয়েছে।
      </p>
    </div>
  );
}
