import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/distributor/support")({
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="সাপোর্ট চ্যাট" subtitle="আপনার ইউজারদের সাথে যোগাযোগ" Icon={MessagesSquare} accent="fuchsia" />
      <EmptyState
        Icon={MessagesSquare}
        title="চ্যাট শীঘ্রই আসছে"
        hint="আমরা ইন-অ্যাপ চ্যাট তৈরি করছি। এই সময়ে অ্যাডমিনের মাধ্যমে যোগাযোগ করুন।"
        accent="fuchsia"
      />
    </div>
  );
}
