// Type surface for the vendored phase-rs wasm-bindgen glue (engine_wasm.js).
// Covers only the exports we call. `unknown`/`any` at the boundary — the
// engine's JSON shapes are validated in our adapter, not by these types.

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function init(module_or_path?: any): Promise<any>;
export function initSync(module?: any): any;
export function init_panic_hook(): void;

export function load_card_database(json_str: string): number;
export function getFormatRegistry(): any;

export function initialize_game(
  deck_data: any,
  seed: number | undefined,
  format_config: any,
  match_config: any,
  player_count: number | undefined,
  first_player: number | undefined,
): any;

export function get_game_state(): any;
export function get_filtered_game_state(viewer: number): any;
export function get_legal_actions_js(): any;
export function submit_action(actor: number, action: any): any;

export function get_ai_action_proposal(difficulty: string, player_id: number): any;
export function submit_ai_action_proposal(token: string, actor: number, action: any): any;
