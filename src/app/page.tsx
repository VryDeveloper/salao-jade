export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div
        aria-hidden="true"
        className="flex size-40 items-center justify-center rounded-full border border-gold"
      >
        <div className="flex size-34 items-center justify-center rounded-full bg-cinnabar font-han text-7xl text-[#fbf3e6]">
          茶
        </div>
      </div>
      <h1 className="font-display text-5xl font-semibold">Salão Jade</h1>
      <p className="max-w-md font-display text-2xl italic text-muted">
        Uma pausa para o chá, reservada no seu horário.
      </p>
    </main>
  );
}
