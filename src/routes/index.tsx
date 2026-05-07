import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "NEON-X — Futuristic Scientific Calculator" },
      { name: "description", content: "A futuristic scientific calculator inspired by the Casio fx-82MS with full trig, log, powers, memory and more." },
    ],
  }),
});

function Index() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 md:p-8"
      style={{ background: "var(--gradient-bg)" }}
    >
      <div className="w-full">
        <h1 className="sr-only">NEON-X Scientific Calculator</h1>
        <Calculator />
      </div>
    </main>
  );
}
