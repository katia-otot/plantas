export const dynamic = "force-dynamic";

export default function RainInfoPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-sky-950">
          Información de lluvias
        </h1>
      </header>

      <section className="space-y-3 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sky-950">
          Cómo se cuentan las lluvias
        </h2>
        <p className="text-sm leading-relaxed text-sky-950/90">
          Las lluvias solo ajustan el riego de las plantas de exterior. El
          calendario cambia cuando elegís <strong>Lluvia moderada</strong> o{" "}
          <strong>Lluvia fuerte</strong>. Si llovió poco, no hace falta
          seleccionar ninguna.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-sky-950/90">
          <li>
            <strong>Moderada:</strong> suma hasta un tercio del intervalo
            habitual, redondeado hacia arriba.
          </li>
          <li>
            <strong>Fuerte:</strong> cuenta como un riego completo y empieza un
            nuevo intervalo.
          </li>
        </ul>

        <h3 className="pt-2 font-semibold text-sky-950">
          Fórmula para lluvia moderada
        </h3>
        <p className="rounded-xl bg-sky-50 px-3 py-2 font-mono text-sm text-sky-950">
          Días hasta regar = min(I, max(0, R) + ceil(I / 3))
        </p>
        <p className="text-sm leading-relaxed text-sky-950/90">
          <code>I</code> es el intervalo habitual y <code>R</code> los días que
          faltaban para regar. <code>ceil</code> redondea hacia arriba;{" "}
          <code>min</code> elige el menor valor y <code>max</code>, el mayor. Si
          el riego estaba vencido, se parte de cero días restantes.
        </p>
        <p className="text-sm leading-relaxed text-sky-950/90">
          El límite evita contar más de un ciclo completo desde la lluvia. Por
          eso, si llueve poco después de regar, se suman menos días. Con un
          intervalo de 14 días, una lluvia moderada el día 2 posterga la fecha 2
          días; el día 13 la posterga 5 y quedan 6 días hasta regar.
        </p>
        <p className="text-sm leading-relaxed text-sky-950/90">
          Es una estimación para organizar los recordatorios. Podés corregir
          cualquier lluvia registrada desde el historial; las fechas se
          recalculan con los datos corregidos.
        </p>
      </section>
    </main>
  );
}
