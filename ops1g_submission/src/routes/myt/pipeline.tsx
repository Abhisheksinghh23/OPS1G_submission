import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import Pipeline from "@/myt/pages/Pipeline";

export const Route = createFileRoute("/myt/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — MYT" }] }),
  component: () => <AppShell><Pipeline /></AppShell>,
});
