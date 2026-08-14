import type { GoldfishResult } from "../lib/goldfish";

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

/** Pick a semantic color class for a metric based on simple thresholds. */
function tone(value: number, good: number, bad: number): string {
  // Higher is better when good > bad; lower is better when good < bad.
  if (good > bad) {
    if (value >= good) return "stat__value--good";
    if (value <= bad) return "stat__value--bad";
  } else {
    if (value <= good) return "stat__value--good";
    if (value >= bad) return "stat__value--bad";
  }
  return "stat__value--warn";
}

export function GoldfishReport({ result }: { result: GoldfishResult }) {
  const { composition: c } = result;
  const maxMana = Math.max(...result.avgManaByTurn, 1);
  const maxCurve = Math.max(...c.curve, 1);

  return (
    <div>
      <div className="panel">
        <h2>Consistência (goldfishing)</h2>
        <p className="hint">
          {result.iterations.toLocaleString()} partidas simuladas · {result.turns}{" "}
          turnos cada · mão inicial com mulligan de Londres.
        </p>
        <div className="stat-grid">
          <Stat
            label="Terrenos na mão inicial"
            value={result.avgOpeningLands.toFixed(2)}
            className={tone(result.avgOpeningLands, 3.2, 2.4)}
          />
          <Stat
            label="Taxa de mulligan"
            value={pct(result.mulliganRate)}
            className={tone(result.mulliganRate, 0.2, 0.4)}
          />
          <Stat
            label="Mana screw (≤1 terreno)"
            value={pct(result.screwRate)}
            className={tone(result.screwRate, 0.05, 0.15)}
          />
          <Stat
            label="Flood (≥6 terrenos)"
            value={pct(result.floodRate)}
            className={tone(result.floodRate, 0.03, 0.1)}
          />
          <Stat
            label="Ramp até o turno 3"
            value={pct(result.rampByTurn3Rate)}
            className={tone(result.rampByTurn3Rate, 0.6, 0.35)}
          />
          <Stat
            label="Mulligans médios"
            value={result.avgMulligans.toFixed(2)}
            className={tone(result.avgMulligans, 0.3, 0.7)}
          />
        </div>
      </div>

      <div className="panel">
        <h3>Mana disponível por turno</h3>
        <table>
          <thead>
            <tr>
              <th>Turno</th>
              <th>Mana média</th>
              <th>Land drop</th>
              <th style={{ width: "40%" }} />
            </tr>
          </thead>
          <tbody>
            {result.avgManaByTurn.map((mana, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{mana.toFixed(2)}</td>
                <td>{pct(result.landDropRate[i])}</td>
                <td>
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{ width: `${(mana / maxMana) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Composição do deck</h3>
        <div className="stat-grid">
          <Stat label="Cartas (99)" value={String(c.librarySize)} />
          <Stat label="Terrenos" value={String(c.lands)} />
          <Stat label="Ramp" value={String(c.ramp)} />
          <Stat label="Card draw" value={String(c.draw)} />
          <Stat label="Interação/removal" value={String(c.removal)} />
          <Stat
            label="MV médio (não-terreno)"
            value={c.avgNonlandManaValue.toFixed(2)}
          />
        </div>

        <h3 style={{ marginTop: "1.25rem" }}>Curva de mana</h3>
        <table>
          <tbody>
            {c.curve.map((count, mv) => (
              <tr key={mv}>
                <td style={{ width: 40 }}>{mv === 7 ? "7+" : mv}</td>
                <td style={{ width: 40 }}>{count}</td>
                <td>
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{ width: `${(count / maxCurve) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={`stat__value ${className ?? ""}`}>{value}</div>
    </div>
  );
}
