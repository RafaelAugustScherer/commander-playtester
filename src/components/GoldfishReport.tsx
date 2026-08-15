import type { GoldfishResult } from "../lib/goldfish";
import { useI18n } from "../i18n/I18nContext";

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
  const { t } = useI18n();
  const { composition: c } = result;
  const maxMana = Math.max(...result.avgManaByTurn, 1);
  const maxCurve = Math.max(...c.curve, 1);

  return (
    <div>
      <div className="panel">
        <h2>{t("goldfish.title")}</h2>
        <p className="hint">
          {t("goldfish.subtitle", {
            iters: result.iterations.toLocaleString(),
            turns: result.turns,
          })}
        </p>
        <div className="stat-grid">
          <Stat
            label={t("goldfish.openingLands")}
            value={result.avgOpeningLands.toFixed(2)}
            className={tone(result.avgOpeningLands, 3.2, 2.4)}
          />
          <Stat
            label={t("goldfish.mulliganRate")}
            value={pct(result.mulliganRate)}
            className={tone(result.mulliganRate, 0.2, 0.4)}
          />
          <Stat
            label={t("goldfish.screw")}
            value={pct(result.screwRate)}
            className={tone(result.screwRate, 0.05, 0.15)}
          />
          <Stat
            label={t("goldfish.flood")}
            value={pct(result.floodRate)}
            className={tone(result.floodRate, 0.03, 0.1)}
          />
          <Stat
            label={t("goldfish.rampT3")}
            value={pct(result.rampByTurn3Rate)}
            className={tone(result.rampByTurn3Rate, 0.6, 0.35)}
          />
          <Stat
            label={t("goldfish.avgMull")}
            value={result.avgMulligans.toFixed(2)}
            className={tone(result.avgMulligans, 0.3, 0.7)}
          />
        </div>
      </div>

      <div className="panel">
        <h3>{t("goldfish.manaPerTurn")}</h3>
        <table>
          <thead>
            <tr>
              <th>{t("goldfish.colTurn")}</th>
              <th>{t("goldfish.colAvgMana")}</th>
              <th>{t("goldfish.colLandDrop")}</th>
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
        <h3>{t("goldfish.composition")}</h3>
        <div className="stat-grid">
          <Stat label={t("goldfish.compCards")} value={String(c.librarySize)} />
          <Stat label={t("goldfish.compLands")} value={String(c.lands)} />
          <Stat label={t("goldfish.compRamp")} value={String(c.ramp)} />
          <Stat label={t("goldfish.compDraw")} value={String(c.draw)} />
          <Stat label={t("goldfish.compRemoval")} value={String(c.removal)} />
          <Stat
            label={t("goldfish.compAvgMv")}
            value={c.avgNonlandManaValue.toFixed(2)}
          />
        </div>

        <h3 style={{ marginTop: "1.25rem" }}>{t("goldfish.curve")}</h3>
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
