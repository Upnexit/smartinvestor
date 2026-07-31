import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/shop")({
  component: () => <Outlet />,
});
