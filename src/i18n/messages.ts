export type Lang = "pt" | "en";

export const LANGS: Lang[] = ["pt", "en"];

export const LANG_LABEL: Record<Lang, string> = { pt: "PT", en: "EN" };

type Entry = Record<Lang, string>;

/** Prose and UI strings. Enum-like sets (phases, difficulties…) live below. */
export const messages = {
  "app.subtitle": {
    pt: "Monte decks, meça a consistência e jogue partidas contra a IA.",
    en: "Build decks, measure consistency, and play matches against the AI.",
  },
  "nav.decks": { pt: "Decks", en: "Decks" },
  "nav.play": { pt: "Testar", en: "Play" },
  "lang.aria": { pt: "Idioma", en: "Language" },

  "play.empty.title": { pt: "Testar deck em partida", en: "Test a deck in a match" },
  "play.empty.body": {
    pt: "Escolha um deck na aba Decks e clique em Testar em partida.",
    en: "Pick a deck in the Decks tab and click Test in a match.",
  },

  "library.title": { pt: "Meus decks", en: "My decks" },
  "library.new": { pt: "+ Novo deck", en: "+ New deck" },
  "library.empty": {
    pt: "Nenhum deck salvo ainda. Crie o seu ou adicione decks de exemplo (precons válidos) para testar na hora.",
    en: "No decks saved yet. Create your own or add example decks (valid precons) to test right away.",
  },
  "library.addStarters": { pt: "Adicionar {n} decks de exemplo", en: "Add {n} example decks" },
  "library.edit": { pt: "Editar", en: "Edit" },
  "library.delete": { pt: "Excluir", en: "Delete" },
  "library.confirmDelete": { pt: 'Excluir "{name}"?', en: 'Delete "{name}"?' },

  "deck.noCommander": { pt: "sem comandante", en: "no commander" },
  "deck.cards": { pt: "{n} cartas", en: "{n} cards" },

  "editor.editTitle": { pt: "Editar deck", en: "Edit deck" },
  "editor.newTitle": { pt: "Novo deck", en: "New deck" },
  "editor.nameLabel": { pt: "Nome do deck", en: "Deck name" },
  "editor.namePlaceholder": { pt: "ex.: Atraxa Superfriends", en: "e.g. Atraxa Superfriends" },
  "editor.decklistLabel": { pt: "Decklist", en: "Decklist" },
  "editor.decklistHint": {
    pt: "Cole no formato Moxfield/Archidekt (ex.: 1 Sol Ring). Marque o comandante com uma seção Commander.",
    en: "Paste in Moxfield/Archidekt format (e.g. 1 Sol Ring). Mark the commander with a Commander section.",
  },
  "editor.linesUnread": { pt: "{n} linhas não lidas", en: "{n} lines not read" },
  "editor.unread": { pt: "Não lidas: {list}", en: "Not read: {list}" },
  "editor.needHundred": {
    pt: "Um deck de Commander precisa de exatamente 100 cartas (comandante + 99). Este tem {n}.",
    en: "A Commander deck needs exactly 100 cards (commander + 99). This one has {n}.",
  },
  "editor.untitled": { pt: "Deck sem nome", en: "Untitled deck" },
  "editor.save": { pt: "Salvar deck", en: "Save deck" },
  "editor.cancel": { pt: "Cancelar", en: "Cancel" },
  "editor.loadSample": { pt: "Carregar exemplo", en: "Load example" },

  "import.label": { pt: "Importar de uma URL", en: "Import from a URL" },
  "import.placeholder": {
    pt: "Cole uma URL de deck do Moxfield ou Archidekt",
    en: "Paste a Moxfield or Archidekt deck URL",
  },
  "import.button": { pt: "Importar", en: "Import" },
  "import.importing": { pt: "Importando…", en: "Importing…" },
  "import.hint": {
    pt: "Decks públicos ou não listados do Moxfield e Archidekt.",
    en: "Public or unlisted decks from Moxfield and Archidekt.",
  },
  "import.done": {
    pt: 'Importado "{name}" — revise e salve.',
    en: 'Imported "{name}" — review and save.',
  },
  "import.errNotAUrl": {
    pt: "Isso não é uma URL do Moxfield, Archidekt ou Ligamagic.",
    en: "That's not a Moxfield, Archidekt, or Ligamagic URL.",
  },
  "import.errUnsupported": {
    pt: "Decks do Ligamagic não podem ser importados automaticamente — abra o deck, exporte a lista e cole acima.",
    en: "Ligamagic decks can't be imported automatically — open the deck, export the list, and paste it above.",
  },
  "import.errNoId": {
    pt: "Não encontrei o id do deck nessa URL.",
    en: "Couldn't find a deck id in that URL.",
  },
  "import.errNetwork": {
    pt: "Não consegui acessar o deck. O proxy de importação pode estar fora do ar (veja deck-proxy/README).",
    en: "Couldn't reach the deck. The import proxy may be down (see deck-proxy/README).",
  },
  "import.errNotFound": {
    pt: "Deck não encontrado. Verifique se é público ou não listado.",
    en: "Deck not found. Make sure it's public or unlisted.",
  },
  "import.errEmpty": {
    pt: "Nenhuma carta encontrada nesse deck.",
    en: "No cards found in that deck.",
  },

  "detail.resolving": { pt: "Resolvendo cartas no Scryfall…", en: "Resolving cards on Scryfall…" },
  "detail.noneResolved": { pt: "Nenhuma carta resolvida. Confira a lista.", en: "No cards resolved. Check the list." },
  "detail.simulating": { pt: "Simulando aberturas…", en: "Simulating opening hands…" },
  "detail.unexpected": { pt: "Falha inesperada.", en: "Unexpected failure." },
  "detail.back": { pt: "← Voltar", en: "← Back" },
  "detail.play": { pt: "Testar em partida →", en: "Test in a match →" },
  "detail.notFound": { pt: "{n} não encontradas", en: "{n} not found" },

  "setup.title": { pt: "Configurar partida", en: "Match setup" },
  "setup.yourDeck": { pt: "Seu deck", en: "Your deck" },
  "setup.podSize": { pt: "Jogadores no pod", en: "Players in the pod" },
  "setup.players": { pt: "{n} jogadores", en: "{n} players" },
  "setup.opponents": { pt: "Oponentes (IA)", en: "Opponents (AI)" },
  "setup.needOpponent": { pt: "Crie outro deck para usar como oponente.", en: "Create another deck to use as an opponent." },
  "setup.mode": { pt: "Modo", en: "Mode" },
  "setup.modePlay": { pt: "Jogar (você pilota)", en: "Play (you pilot)" },
  "setup.modeWatch": { pt: "Assistir (IA joga)", en: "Watch (AI plays)" },
  "setup.modePlayHint": {
    pt: "Você avança as fases com espaço; a IA responde às suas ações.",
    en: "You advance phases with space; the AI responds to your actions.",
  },
  "setup.modeWatchHint": {
    pt: "Todos os assentos jogam sozinhos — você assiste seu deck em ação.",
    en: "Every seat plays itself — watch your deck in action.",
  },
  "setup.difficulty": { pt: "Dificuldade da IA", en: "AI difficulty" },
  "setup.matches": { pt: "Partidas ({min}–{max})", en: "Matches ({min}–{max})" },
  "setup.seed": { pt: "Seed", en: "Seed" },
  "setup.reveal": { pt: "Revelar as mãos da IA durante o jogo", en: "Reveal the AI's hands during the game" },
  "setup.timeHint": {
    pt: "Cada partida completa leva alguns minutos de simulação. O motor roda em segundo plano e o tabuleiro é atualizado ao vivo.",
    en: "Each full match takes a few minutes to simulate. The engine runs in the background and the board updates live.",
  },
  "setup.startN": { pt: "Iniciar {n} partidas →", en: "Start {n} matches →" },
  "setup.startOne": { pt: "Iniciar partida →", en: "Start match →" },

  "run.preparing": { pt: "Preparando o motor…", en: "Preparing the engine…" },
  "run.loading": {
    pt: "Carregando o motor e o banco de cartas (~95 MiB na 1ª vez)…",
    en: "Loading the engine and card database (~95 MiB the first time)…",
  },
  "run.resolvingImages": { pt: "Resolvendo imagens das cartas…", en: "Resolving card images…" },
  "run.invalidDeck": { pt: "Deck inválido: {reasons}", en: "Invalid deck: {reasons}" },
  "run.matchOf": { pt: "Partida {i} de {n}", en: "Match {i} of {n}" },
  "run.match": { pt: "Partida", en: "Match" },
  "run.pause": { pt: "Pausar", en: "Pause" },
  "run.resume": { pt: "Retomar", en: "Resume" },
  "run.exit": { pt: "Sair", en: "Exit" },
  "run.yourWins": { pt: "Vitórias suas: {w}/{n}", en: "Your wins: {w}/{n}" },
  "run.winRate": { pt: "Win rate: {p}%", en: "Win rate: {p}%" },
  "run.ci95": { pt: "IC 95%: {a}–{b}%", en: "95% CI: {a}–{b}%" },

  "turn.title": { pt: "Sua vez", en: "Your turn" },
  "turn.dragHint": {
    pt: "Arraste uma carta da mão até um espaço — ou toque na carta e depois no espaço — para jogá-la.",
    en: "Drag a hand card onto a slot — or tap the card, then a slot — to play it.",
  },
  "turn.spaceHint": { pt: "Espaço = passar prioridade", en: "Space = pass priority" },
  "turn.pass": { pt: "Passar (espaço)", en: "Pass (space)" },
  "turn.letAi": { pt: "IA joga por mim", en: "Let the AI play" },
  "turn.nothingToPlay": { pt: "Nada para jogar agora — passe a vez.", en: "Nothing to play right now — pass." },
  "turn.abilityHint": {
    pt: "Clique em uma permanente destacada para ativar uma habilidade.",
    en: "Click a highlighted permanent to activate an ability.",
  },
  "turn.abilityN": { pt: "Habilidade {n}", en: "Ability {n}" },
  "turn.cancel": { pt: "Cancelar", en: "Cancel" },
  "turn.keyHints": {
    pt: "Espaço = prioridade · Enter = passar turno",
    en: "Space = priority · Enter = pass turn",
  },
  "turn.passTurn": { pt: "Passar turno (Enter)", en: "Pass turn (Enter)" },
  "turn.passingTurn": {
    pt: "Passando o turno… (Esc para parar)",
    en: "Passing turn… (Esc to stop)",
  },
  "turn.stopPass": { pt: "Parar", en: "Stop" },

  "target.title": { pt: "Escolha o alvo", en: "Choose a target" },
  "target.generic": { pt: "Selecione um alvo válido.", en: "Select a valid target." },
  "target.instruction": {
    pt: "Clique em um alvo destacado no tabuleiro.",
    en: "Click a highlighted target on the board.",
  },
  "target.progress": { pt: "Selecionados: {n} (mín {min}, máx {max})", en: "Selected: {n} (min {min}, max {max})" },
  "target.confirm": { pt: "Confirmar alvos", en: "Confirm targets" },
  "target.none": { pt: "Sem alvo", en: "No target" },
  "target.letAi": { pt: "IA escolhe por mim", en: "Let the AI choose" },

  "attack.title": { pt: "Declarar atacantes", en: "Declare attackers" },
  "attack.count": { pt: "{n} atacando", en: "{n} attacking" },
  "attack.instruction": {
    pt: "Clique nas suas criaturas destacadas para atacar.",
    en: "Click your highlighted creatures to attack.",
  },
  "attack.defenderHint": {
    pt: "Clique em um oponente destacado para direcionar os atacantes.",
    en: "Click a highlighted opponent to aim your attackers.",
  },
  "attack.confirm": { pt: "Confirmar ataque", en: "Confirm attack" },
  "attack.none": { pt: "Sem ataque", en: "No attack" },
  "attack.letAi": { pt: "IA decide o combate", en: "Let the AI attack" },

  "block.title": { pt: "Declarar bloqueadores", en: "Declare blockers" },
  "block.count": { pt: "{n} bloqueando", en: "{n} blocking" },
  "block.chooseBlocker": {
    pt: "Clique em uma criatura sua para bloquear.",
    en: "Click one of your creatures to block with.",
  },
  "block.chooseAttacker": {
    pt: "Agora clique no atacante que ela vai bloquear.",
    en: "Now click the attacker it will block.",
  },
  "block.confirm": { pt: "Confirmar bloqueios", en: "Confirm blocks" },
  "block.none": { pt: "Não bloquear", en: "No blocks" },
  "block.letAi": { pt: "IA decide o combate", en: "Let the AI block" },

  "mana.title": { pt: "Pagamento de mana", en: "Mana payment" },
  "mana.chooseColor": {
    pt: "Escolha a cor de mana a produzir.",
    en: "Choose which color of mana to produce.",
  },
  "mana.chooseSource": {
    pt: "Clique em uma fonte destacada para tocá-la.",
    en: "Click a highlighted source to tap it.",
  },
  "mana.letAi": { pt: "IA paga por mim", en: "Let the AI pay" },
  "mana.color.White": { pt: "Branco", en: "White" },
  "mana.color.Blue": { pt: "Azul", en: "Blue" },
  "mana.color.Black": { pt: "Preto", en: "Black" },
  "mana.color.Red": { pt: "Vermelho", en: "Red" },
  "mana.color.Green": { pt: "Verde", en: "Green" },
  "mana.color.Colorless": { pt: "Incolor", en: "Colorless" },

  "creatureType.title": {
    pt: "Escolher tipo de criatura",
    en: "Choose a creature type",
  },
  "creatureType.source": {
    pt: "{name} pede um tipo de criatura.",
    en: "{name} asks for a creature type.",
  },
  "creatureType.aiHint": { pt: "Sugestão da IA: {choice}", en: "AI suggestion: {choice}" },
  "creatureType.search": { pt: "Buscar tipo de criatura…", en: "Search creature type…" },
  "creatureType.confirm": { pt: "Confirmar", en: "Confirm" },
  "creatureType.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "mulligan.title": { pt: "Mão inicial", en: "Opening hand" },
  "mulligan.keepCount": { pt: "Ficar com {n}", en: "Keep {n}" },
  "mulligan.keepAll": { pt: "Ficar com a mão", en: "Keep hand" },
  "mulligan.free": { pt: "Mulligan grátis", en: "Free mulligan" },
  "mulligan.take": { pt: "Mulligan (ficar com {n})", en: "Mulligan (keep {n})" },
  "mulligan.freeHint": {
    pt: "O primeiro mulligan é grátis — você continua com {n} cartas.",
    en: "Your first mulligan is free — you still keep {n} cards.",
  },
  "mulligan.takenHint": {
    pt: "Mulligans usados: {n}. Ao ficar, você mantém {keep} cartas.",
    en: "Mulligans taken: {n}. Keeping now holds {keep} cards.",
  },
  "mulligan.bottomTitle": { pt: "Devolver ao fundo", en: "Put on the bottom" },
  "mulligan.bottomInstruction": {
    pt: "Escolha {n} carta(s) para colocar no fundo do grimório.",
    en: "Choose {n} card(s) to put on the bottom of your library.",
  },
  "mulligan.bottomProgress": { pt: "Selecionadas: {n} / {max}", en: "Selected: {n} / {max}" },
  "mulligan.bottomConfirm": { pt: "Devolver e ficar", en: "Bottom & keep" },
  "mulligan.letAi": { pt: "IA decide o mulligan", en: "Let the AI decide" },

  "select.noResults": { pt: "Nenhum resultado", en: "No matches" },

  "sidebar.title": { pt: "Pilha e registro", en: "Stack & log" },
  "sidebar.stack": { pt: "Pilha", en: "Stack" },
  "sidebar.stackEmpty": { pt: "A pilha está vazia.", en: "The stack is empty." },
  "sidebar.stackTop": { pt: "topo", en: "top" },
  "sidebar.log": { pt: "Registro", en: "Game log" },
  "sidebar.logEmpty": { pt: "Nada ainda.", en: "Nothing yet." },
  "sidebar.detailed": { pt: "Detalhado", en: "Detailed" },
  "sidebar.show": { pt: "Mostrar registro", en: "Show log" },
  "sidebar.hide": { pt: "Ocultar", en: "Hide" },

  "report.title": { pt: "Resultado da série", en: "Series result" },
  "report.newSetup": { pt: "Nova configuração", en: "New setup" },
  "report.winRateDeck": { pt: "Win rate (seu deck)", en: "Win rate (your deck)" },
  "report.interval95": { pt: "Intervalo 95%", en: "95% interval" },
  "report.decided": { pt: "Partidas decididas", en: "Decided matches" },
  "report.draws": { pt: "Empates", en: "Draws" },
  "report.avgTurns": { pt: "Turnos médios", en: "Average turns" },
  "report.avgTime": { pt: "Tempo médio/partida", en: "Average time/match" },
  "report.winsBySeat": { pt: "Vitórias por assento", en: "Wins by seat" },
  "report.noResult": { pt: "{n} sem resultado", en: "{n} no result" },
  "report.matches": { pt: "Partidas", en: "Matches" },
  "report.colWinner": { pt: "Vencedor", en: "Winner" },
  "report.colTurns": { pt: "Turnos", en: "Turns" },
  "report.colTime": { pt: "Tempo", en: "Time" },

  "board.turn": { pt: "Turno {n}", en: "Turn {n}" },
  "board.activeTurn": { pt: "vez de {name}", en: "{name}'s turn" },
  "board.draw": { pt: "Empate", en: "Draw" },
  "board.winner": { pt: "Vitória: {name}", en: "Winner: {name}" },
  "board.you": { pt: "você", en: "you" },
  "board.player": { pt: "Jogador {n}", en: "Player {n}" },
  "board.rowCreatures": { pt: "Criaturas", en: "Creatures" },
  "board.rowOthers": { pt: "Outros", en: "Other" },
  "board.rowLands": { pt: "Terrenos", en: "Lands" },
  "board.rowHand": { pt: "Mão", en: "Hand" },

  "goldfish.title": { pt: "Consistência (goldfishing)", en: "Consistency (goldfishing)" },
  "goldfish.subtitle": {
    pt: "{iters} partidas simuladas · {turns} turnos cada · mão inicial com mulligan de Londres.",
    en: "{iters} simulated games · {turns} turns each · opening hand with London mulligan.",
  },
  "goldfish.openingLands": { pt: "Terrenos na mão inicial", en: "Lands in opening hand" },
  "goldfish.mulliganRate": { pt: "Taxa de mulligan", en: "Mulligan rate" },
  "goldfish.screw": { pt: "Mana screw (≤1 terreno)", en: "Mana screw (≤1 land)" },
  "goldfish.flood": { pt: "Flood (≥6 terrenos)", en: "Flood (≥6 lands)" },
  "goldfish.rampT3": { pt: "Ramp até o turno 3", en: "Ramp by turn 3" },
  "goldfish.avgMull": { pt: "Mulligans médios", en: "Average mulligans" },
  "goldfish.manaPerTurn": { pt: "Mana disponível por turno", en: "Available mana per turn" },
  "goldfish.colTurn": { pt: "Turno", en: "Turn" },
  "goldfish.colAvgMana": { pt: "Mana média", en: "Average mana" },
  "goldfish.colLandDrop": { pt: "Land drop", en: "Land drop" },
  "goldfish.composition": { pt: "Composição do deck", en: "Deck composition" },
  "goldfish.compCards": { pt: "Cartas (99)", en: "Cards (99)" },
  "goldfish.compLands": { pt: "Terrenos", en: "Lands" },
  "goldfish.compRamp": { pt: "Ramp", en: "Ramp" },
  "goldfish.compDraw": { pt: "Card draw", en: "Card draw" },
  "goldfish.compRemoval": { pt: "Interação/removal", en: "Interaction/removal" },
  "goldfish.compAvgMv": { pt: "MV médio (não-terreno)", en: "Average MV (nonland)" },
  "goldfish.curve": { pt: "Curva de mana", en: "Mana curve" },
} satisfies Record<string, Entry>;

export type MsgKey = keyof typeof messages;

export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: MsgKey, vars?: Vars): string {
  let s = messages[key][lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/** Engine phase identifiers → localized labels. Falls back to the raw id. */
const PHASE: Record<string, Entry> = {
  Untap: { pt: "Desvirar", en: "Untap" },
  Upkeep: { pt: "Manutenção", en: "Upkeep" },
  Draw: { pt: "Compra", en: "Draw" },
  PreCombatMain: { pt: "Principal 1", en: "Main 1" },
  Main1: { pt: "Principal 1", en: "Main 1" },
  BeginCombat: { pt: "Início do combate", en: "Begin combat" },
  DeclareAttackers: { pt: "Atacantes", en: "Attackers" },
  DeclareBlockers: { pt: "Bloqueadores", en: "Blockers" },
  CombatDamage: { pt: "Dano de combate", en: "Combat damage" },
  EndCombat: { pt: "Fim do combate", en: "End of combat" },
  Combat: { pt: "Combate", en: "Combat" },
  PostCombatMain: { pt: "Principal 2", en: "Main 2" },
  Main2: { pt: "Principal 2", en: "Main 2" },
  End: { pt: "Final", en: "End" },
  EndStep: { pt: "Final", en: "End step" },
  Cleanup: { pt: "Limpeza", en: "Cleanup" },
};

export function phaseLabel(lang: Lang, phase: string): string {
  return PHASE[phase]?.[lang] ?? phase;
}

/** Battlefield drop-slot categories, in priority order for card matching. */
export const CATEGORY_LABEL: Record<string, Entry> = {
  Land: { pt: "Terreno", en: "Land" },
  Creature: { pt: "Criatura", en: "Creature" },
  Planeswalker: { pt: "Planeswalker", en: "Planeswalker" },
  Battle: { pt: "Batalha", en: "Battle" },
  Artifact: { pt: "Artefato", en: "Artifact" },
  Enchantment: { pt: "Encantamento", en: "Enchantment" },
  Spell: { pt: "Mágica", en: "Spell" },
};

export function categoryLabel(lang: Lang, cat: string): string {
  return CATEGORY_LABEL[cat]?.[lang] ?? cat;
}
