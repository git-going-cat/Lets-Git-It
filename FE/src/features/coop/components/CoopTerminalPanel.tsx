export default function CoopTerminalPanel() {
  return (
    <section className="z-20 mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-lg border-4 border-gray-600 bg-[#1a1d2e] font-pixel text-white shadow-2xl">
      <div className="flex h-10 items-center gap-2 bg-[#0d1117] px-4">
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" />
      </div>

      <div className="flex min-h-32 flex-col justify-start p-6 font-mono text-xl text-green-400">
        <div>$ _</div>
      </div>
    </section>
  );
}
