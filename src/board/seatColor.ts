// A stable identity color per seat, used to tell opponents apart at a glance —
// especially when several share a deck name or commander. Seat 0 is the human.
const SEAT_COLORS = [
  "#c9a26b", // you — muted copper
  "#5cb3ff", // sky blue
  "#f47fb5", // pink
  "#b98cff", // violet
];

export function seatColor(seat: number): string {
  return SEAT_COLORS[seat % SEAT_COLORS.length];
}
