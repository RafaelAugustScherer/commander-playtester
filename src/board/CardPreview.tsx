export interface Preview {
  url?: string;
  name: string;
  power?: number | null;
  toughness?: number | null;
  isCreature: boolean;
  rect: DOMRect;
}

/** Fixed-position enlarged card shown beside the hovered card. */
export function CardPreview({ preview }: { preview: Preview }) {
  const width = 312;
  const height = Math.round(width / 0.716);
  const { rect } = preview;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const gap = 12;
  const fitsRight = rect.right + gap + width <= vw;
  const left = fitsRight
    ? rect.right + gap
    : Math.max(8, rect.left - gap - width);
  const top = Math.min(Math.max(8, rect.top - 20), Math.max(8, vh - height - 8));

  return (
    <div className="card-preview" style={{ left, top, width }}>
      {preview.url ? (
        <img src={preview.url} alt={preview.name} className="card-preview__img" />
      ) : (
        <div className="card-preview__text">
          <div className="card-preview__name">{preview.name}</div>
          {preview.isCreature && (
            <div className="card-preview__pt">
              {preview.power ?? 0}/{preview.toughness ?? 0}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
