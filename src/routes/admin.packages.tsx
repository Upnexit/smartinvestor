import { createFileRoute } from "@tanstack/react-router";
import { AdminAdsControlPage } from "./admin.ads";

export const Route = createFileRoute("/admin/packages")({
  head: () => ({ meta: [{ title: "বিজ্ঞাপন (Ad) ও উইথড্র কন্ট্রোল — Smart Click BD" }] }),
  component: AdminAdsControlPage,
});
