// A stable identity color per seat, used to tell opponents apart at a glance —
// especially when several share a deck name or commander. Seat 0 is the human.
const SEAT_COLORS = [
  "#0a246a", // you — navy (matches the theme)
  "#00695c", // teal
  "#c2185b", // magenta
  "#6a1b9a", // violet
];

export function seatColor(seat: number): string {
  return SEAT_COLORS[seat % SEAT_COLORS.length];
}
