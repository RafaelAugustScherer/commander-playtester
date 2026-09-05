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
  "settings.title": { pt: "Configurações", en: "Settings" },
  "settings.manualMana": {
    pt: "Tocar mana manualmente",
    en: "Tap mana manually",
  },
  "settings.manualManaDesc": {
    pt: "Escolha quais permanentes tocar ao pagar mágicas.",
    en: "Choose which permanents to tap when paying for spells.",
  },
  "win.reportTitle": {
    pt: "{name} — consistência",
    en: "{name} — consistency",
  },

  "play.empty.title": { pt: "Testar deck em partida", en: "Test a deck in a match" },
  "play.empty.body": {
    pt: "Crie um deck na aba Decks para começar uma partida.",
    en: "Create a deck in the Decks tab to start a match.",
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
  "deck.partial": { pt: "Incompleto", en: "Partial" },

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
  "editor.needHundredWarning": {
    pt: "Um deck de Commander precisa de exatamente 100 cartas (comandante + 99). Este tem {n} — pode salvar como rascunho, mas não poderá ser jogado até completar.",
    en: "A Commander deck needs exactly 100 cards (commander + 99). This one has {n} — you can save it as a draft, but it can't be played until it's complete.",
  },
  "editor.untitled": { pt: "Deck sem nome", en: "Untitled deck" },
  "editor.save": { pt: "Salvar deck", en: "Save deck" },
  "editor.cancel": { pt: "Cancelar", en: "Cancel" },
  "editor.loadSample": { pt: "Carregar exemplo", en: "Load example" },
  "editor.draftFromDeck": {
    pt: "Draft a partir deste deck",
    en: "Draft from this deck",
  },

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
  "detail.partialReason": {
    pt: "Este deck está incompleto e não pode ser jogado até ter exatamente 100 cartas.",
    en: "This deck is partial and can't be played until it has exactly 100 cards.",
  },

  "setup.title": { pt: "Configurar partida", en: "Match setup" },
  "setup.yourDeck": { pt: "Seu deck", en: "Your deck" },
  "setup.podSize": { pt: "Jogadores no pod", en: "Players in the pod" },
  "setup.players": { pt: "{n} jogadores", en: "{n} players" },
  "setup.opponents": { pt: "Oponentes (IA)", en: "Opponents (AI)" },
  "setup.opponentN": { pt: "Oponente {n}", en: "Opponent {n}" },
  "setup.needOpponent": { pt: "Crie outro deck para usar como oponente.", en: "Create another deck to use as an opponent." },
  "setup.partialSuffix": { pt: " (incompleto)", en: " (partial)" },
  "setup.partialChosen": {
    pt: "Um dos decks escolhidos está incompleto e não pode ser jogado. Complete-o ou escolha outro.",
    en: "One of the chosen decks is partial and can't be played. Complete it or choose another.",
  },
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
  "turn.passShort": { pt: "Passar", en: "Pass" },
  "turn.passTurnShort": { pt: "Passar turno", en: "Pass turn" },
  "turn.letAi": { pt: "IA joga por mim", en: "Let the AI play" },
  "turn.nothingToPlay": { pt: "Nada para jogar agora — passe a vez.", en: "Nothing to play right now — pass." },
  "turn.abilityHint": {
    pt: "Clique em uma permanente destacada para ativar uma habilidade.",
    en: "Click a highlighted permanent to activate an ability.",
  },
  "turn.abilityN": { pt: "Habilidade {n}", en: "Ability {n}" },
  "turn.floatManaHint": {
    pt: "Toque suas fontes para gerar mana; depois lance uma mágica que você já pode pagar.",
    en: "Tap your sources to make mana, then cast a spell you can already pay for.",
  },
  "turn.ninjutsuHint": {
    pt: "Clique em um ninja destacado (na mão ou na zona de comando) para usar ninjutsu.",
    en: "Click a highlighted ninja (in hand or the command zone) to use ninjutsu.",
  },
  "turn.ninjutsuReturnHint": {
    pt: "Agora clique no atacante não bloqueado que voltará para a mão.",
    en: "Now click the unblocked attacker to return to hand.",
  },
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
    pt: "Selecione um atacante e clique em um oponente destacado para direcioná-lo.",
    en: "Select an attacker, then click a highlighted opponent to aim it.",
  },
  "attack.noTarget": { pt: "sem alvo", en: "no target" },
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

  "resolutionOptionalPayment.title": {
    pt: "Pagamento opcional",
    en: "Optional payment",
  },
  "resolutionOptionalPayment.source": {
    pt: "{name} oferece um pagamento opcional.",
    en: "{name} offers an optional payment.",
  },
  "resolutionOptionalPayment.pay": { pt: "Pagar {cost}", en: "Pay {cost}" },
  "resolutionOptionalPayment.decline": { pt: "Recusar", en: "Decline" },
  "resolutionOptionalPayment.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "optionalCost.title": { pt: "Custo adicional", en: "Optional cost" },
  "optionalCost.prompt": {
    pt: "Pagar um custo adicional de {name}?",
    en: "Pay an additional cost for {name}?",
  },
  "optionalCost.spellFallback": { pt: "esta mágica", en: "this spell" },
  "optionalCost.timesPaid": {
    pt: "Já pago {count}x nesta conjuração.",
    en: "Already paid {count}× on this cast.",
  },
  "optionalCost.pay": { pt: "Pagar", en: "Pay" },
  "optionalCost.decline": { pt: "Não pagar", en: "Don't pay" },
  "optionalCost.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "commanderZone.title": { pt: "Zona do comandante", en: "Commander zone" },
  "commanderZone.prompt": {
    pt: "Enviar {name} para a zona de comando em vez do {zone}?",
    en: "Send {name} to the command zone instead of the {zone}?",
  },
  "commanderZone.commanderFallback": {
    pt: "seu comandante",
    en: "your commander",
  },
  "commanderZone.commandZone": { pt: "Zona de comando", en: "Command zone" },
  "commanderZone.leave": {
    pt: "Deixar no {zone}",
    en: "Leave in {zone}",
  },
  "commanderZone.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "xValue.title": { pt: "Escolher X", en: "Choose X" },
  "xValue.source": {
    pt: "{name} pede um valor para X.",
    en: "{name} asks for a value for X.",
  },
  "xValue.spellFallback": { pt: "Esta mágica", en: "This spell" },
  "xValue.range": {
    pt: "X pode ser {min}–{max}.",
    en: "X can be {min}–{max}.",
  },
  "xValue.confirm": { pt: "Confirmar", en: "Confirm" },
  "xValue.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "orderTriggers.title": {
    pt: "Ordenar seus gatilhos",
    en: "Order your triggers",
  },
  "orderTriggers.resolvesLast": {
    pt: "O topo da lista é colocado na pilha primeiro, então resolve por último.",
    en: "The top of the list is placed on the stack first, so it resolves last.",
  },
  "orderTriggers.triggerFallback": {
    pt: "Gatilho {number}",
    en: "Trigger {number}",
  },
  "orderTriggers.moveUp": { pt: "Mover para cima", en: "Move up" },
  "orderTriggers.moveDown": { pt: "Mover para baixo", en: "Move down" },
  "orderTriggers.confirm": { pt: "Confirmar", en: "Confirm" },
  "orderTriggers.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "search.title": { pt: "Buscar no grimório", en: "Search your library" },
  "search.partitionTitle": {
    pt: "Buscar e dividir entre {primary} e {rest}",
    en: "Search and split between {primary} and {rest}",
  },
  "search.outsideTitle": {
    pt: "Escolher fora do jogo",
    en: "Choose from outside the game",
  },
  "search.selected": { pt: "Selecionadas: {n} / {max}", en: "Selected: {n} / {max}" },
  "search.confirm": { pt: "Confirmar", en: "Confirm" },
  "search.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "dig.title": {
    pt: "Escolher quais cartas manter",
    en: "Choose which card(s) to keep",
  },
  "dig.hintExact": {
    pt: "Mantenha {n} carta(s): as mantidas vão para {kept}; o resto vai para {rest}.",
    en: "Keep {n} card(s): kept cards go to {kept}; the rest go to {rest}.",
  },
  "dig.hintUpTo": {
    pt: "Mantenha até {n} carta(s): as mantidas vão para {kept}; o resto vai para {rest}.",
    en: "Keep up to {n} card(s): kept cards go to {kept}; the rest go to {rest}.",
  },
  "dig.kept": { pt: "Mantidas: {picked} / {n}", en: "Kept {picked} of {n}" },
  "dig.confirm": { pt: "Confirmar", en: "Confirm" },
  "dig.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "exploreReveal.exploreTitle": {
    pt: "Escolher uma criatura para explorar",
    en: "Choose a creature to explore",
  },
  "exploreReveal.exploreHint": {
    pt: "{name} está explorando. Escolha qual criatura explora.",
    en: "{name} is exploring. Choose which creature explores.",
  },
  "exploreReveal.revealTitle": {
    pt: "Revelar até encontrar",
    en: "Reveal until you find one",
  },
  "exploreReveal.revealHint": {
    pt: "{name} revelou cartas até encontrar {card}. Manter {card}?",
    en: "{name} revealed cards until it found {card}. Keep {card}?",
  },
  "exploreReveal.keep": { pt: "Manter ({zone})", en: "Keep ({zone})" },
  "exploreReveal.decline": { pt: "Colocar em {zone}", en: "Put in {zone}" },
  "exploreReveal.sourceFallback": {
    pt: "sua criatura",
    en: "your creature",
  },
  "exploreReveal.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "phyrexian.title": { pt: "Pagar mana phyrexiana", en: "Pay Phyrexian mana" },
  "phyrexian.prompt": {
    pt: "{name} tem símbolos de mana phyrexiana. Escolha como pagar cada um.",
    en: "{name} has Phyrexian mana symbols. Choose how to pay each one.",
  },
  "phyrexian.spellFallback": { pt: "esta mágica", en: "this spell" },
  "phyrexian.colorWhite": { pt: "Branco", en: "White" },
  "phyrexian.colorBlue": { pt: "Azul", en: "Blue" },
  "phyrexian.colorBlack": { pt: "Preto", en: "Black" },
  "phyrexian.colorRed": { pt: "Vermelho", en: "Red" },
  "phyrexian.colorGreen": { pt: "Verde", en: "Green" },
  "phyrexian.manaOption": { pt: "Mana {color}", en: "{color} mana" },
  "phyrexian.lifeOption": { pt: "2 de vida", en: "2 life" },
  "phyrexian.lifeTotal": {
    pt: "Vida total a pagar: {n}",
    en: "Total life to pay: {n}",
  },
  "phyrexian.confirm": { pt: "Confirmar", en: "Confirm" },
  "phyrexian.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "coinFlipLife.coinFlipTitle": {
    pt: "Manter resultados de moeda",
    en: "Keep coin-flip results",
  },
  "coinFlipLife.coinFlipHint": {
    pt: "Mantenha {n} resultado(s).",
    en: "Keep {n} result(s).",
  },
  "coinFlipLife.kept": {
    pt: "Mantidos: {picked} / {n}",
    en: "Kept {picked} of {n}",
  },
  "coinFlipLife.heads": { pt: "Cara", en: "Heads" },
  "coinFlipLife.tails": { pt: "Coroa", en: "Tails" },
  "coinFlipLife.confirm": { pt: "Confirmar", en: "Confirm" },
  "coinFlipLife.lifeTitle": {
    pt: "Redistribuir totais de vida",
    en: "Redistribute life totals",
  },
  "coinFlipLife.lifeEntry": { pt: "{seat}: {life}", en: "{seat}: {life}" },
  "coinFlipLife.you": { pt: "Você", en: "You" },
  "coinFlipLife.seat": { pt: "Assento {n}", en: "Seat {n}" },
  "coinFlipLife.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "equipCrew.sourceFallback": { pt: "isto", en: "this" },
  "equipCrew.equipTitle": { pt: "Equipar {name}", en: "Equip {name}" },
  "equipCrew.stationTitle": { pt: "Guarnecer {name}", en: "Station {name}" },
  "equipCrew.crewTitle": { pt: "Tripular {name}", en: "Crew {name}" },
  "equipCrew.saddleTitle": { pt: "Selar {name}", en: "Saddle {name}" },
  "equipCrew.creaturePt": {
    pt: "{name} ({power}/{toughness})",
    en: "{name} ({power}/{toughness})",
  },
  "equipCrew.powerRequired": {
    pt: "Poder necessário: {n}",
    en: "Power required: {n}",
  },
  "equipCrew.powerProgress": {
    pt: "Poder selecionado: {sum} / {n}",
    en: "Power selected: {sum} / {n}",
  },
  "equipCrew.creaturePower": {
    pt: "{name} (poder {power})",
    en: "{name} (power {power})",
  },
  "equipCrew.confirm": { pt: "Confirmar", en: "Confirm" },
  "equipCrew.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "wardUnless.discardTitle": {
    pt: "Escolha uma carta para descartar",
    en: "Choose a card to discard",
  },
  "wardUnless.bounceTitle": {
    pt: "Escolha um permanente para devolver à mão",
    en: "Choose a permanent to return to hand",
  },
  "wardUnless.sacrificeTitle": {
    pt: "Escolha um permanente para sacrificar",
    en: "Choose a permanent to sacrifice",
  },
  "wardUnless.powerRequired": {
    pt: "Poder necessário: {n}",
    en: "Power required: {n}",
  },
  "wardUnless.powerProgress": {
    pt: "Poder selecionado: {sum} / {n}",
    en: "Power selected: {sum} / {n}",
  },
  "wardUnless.confirm": { pt: "Confirmar", en: "Confirm" },
  "wardUnless.costTitle": {
    pt: "Escolha como pagar",
    en: "Choose how to pay",
  },
  "wardUnless.costFixed": { pt: "Pagar custo de mana", en: "Pay mana cost" },
  "wardUnless.costGeneric": {
    pt: "Pagar mana genérica",
    en: "Pay generic mana",
  },
  "wardUnless.costPayLife": {
    pt: "Pagar {amount} de vida",
    en: "Pay {amount} life",
  },
  "wardUnless.costDiscard": {
    pt: "Descartar uma carta",
    en: "Discard a card",
  },
  "wardUnless.costSacrifice": {
    pt: "Sacrificar {count}",
    en: "Sacrifice {count}",
  },
  "wardUnless.costReturnToHand": {
    pt: "Devolver {count} à mão",
    en: "Return {count} to hand",
  },
  "wardUnless.decline": { pt: "Não pagar", en: "Don't pay" },
  "wardUnless.letAi": { pt: "IA decide", en: "Let the AI decide" },

  "modes.title": { pt: "Escolher modo", en: "Choose a mode" },
  "modes.source": {
    pt: "{name} pede uma escolha de modo.",
    en: "{name} asks for a mode.",
  },
  "modes.instructionOne": {
    pt: "Escolha um modo.",
    en: "Choose one mode.",
  },
  "modes.instructionExact": {
    pt: "Escolha {n} modos.",
    en: "Choose {n} modes.",
  },
  "modes.instructionRange": {
    pt: "Escolha de {min} a {max} modos.",
    en: "Choose {min}–{max} modes.",
  },
  "modes.progress": { pt: "Selecionados: {n} / {max}", en: "Selected: {n} / {max}" },
  "modes.confirm": { pt: "Confirmar", en: "Confirm" },
  "modes.letAi": { pt: "IA decide", en: "Let the AI decide" },
  "modes.peek": { pt: "Espiar o tabuleiro", en: "Peek at the board" },
  "modes.hide": { pt: "Ocultar e escolher", en: "Hide and choose" },
  "modes.addOne": { pt: "Escolher este modo de novo", en: "Pick this mode again" },
  "modes.removeOne": { pt: "Remover uma escolha", en: "Remove one pick" },

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

  "discard.title": { pt: "Descartar cartas", en: "Discard cards" },
  "discard.instruction": {
    pt: "Escolha {n} carta(s) para descartar.",
    en: "Choose {n} card(s) to discard.",
  },
  "discard.progress": { pt: "Selecionadas: {n} / {max}", en: "Selected: {n} / {max}" },
  "discard.confirm": { pt: "Descartar", en: "Discard" },

  "scry.title": { pt: "Vidência", en: "Scry" },
  "surveil.title": { pt: "Vigília", en: "Surveil" },
  "scry.progress": { pt: "Carta {n} de {max}", en: "Card {n} of {max}" },
  "scry.keepTop": { pt: "Manter no topo", en: "Keep on top" },
  "scry.toBottom": { pt: "Enviar ao fundo", en: "Put on bottom" },
  "surveil.toGrave": { pt: "Enviar ao cemitério", en: "Put into graveyard" },
  "scry.letAi": { pt: "IA decide", en: "Let the AI decide" },

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
  "board.graveyardOpen": { pt: "Abrir cemitério", en: "Open graveyard" },
  "board.graveyardOf": {
    pt: "Cemitério de {name}",
    en: "{name}'s graveyard",
  },
  "board.exileOpen": { pt: "Abrir exílio", en: "Open exile" },
  "board.exileOf": {
    pt: "Exílio de {name}",
    en: "{name}'s exile",
  },
  "common.close": { pt: "Fechar", en: "Close" },

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

  "library.draft": { pt: "+ Draft de deck", en: "+ Draft a deck" },

  "draft.windowTitle": { pt: "Draft de deck", en: "Deck draft" },

  "draft.entry.title": { pt: "Draft de deck", en: "Draft a deck" },
  "draft.entry.subtitle": {
    pt: "Informe três ou mais cartas para dar o tema do deck. Você pode marcar uma delas como comandante.",
    en: "Enter three or more cards to seed the deck's theme. You can flag one of them as the commander.",
  },
  "draft.entry.baseCardsLabel": { pt: "Cartas base", en: "Base cards" },
  "draft.entry.baseCardPlaceholder": { pt: "Nome da carta", en: "Card name" },
  "draft.entry.modeRows": { pt: "Uma a uma", en: "One by one" },
  "draft.entry.modePaste": { pt: "Colar lista", en: "Paste a list" },
  "draft.entry.commanderLabel": {
    pt: "Comandante (opcional)",
    en: "Commander (optional)",
  },
  "draft.entry.commanderNone": {
    pt: "Nenhum comandante elegível nesta lista",
    en: "No eligible commander in this list",
  },
  "draft.entry.commanderSearchPlaceholder": {
    pt: "Escolher comandante…",
    en: "Pick a commander…",
  },
  "draft.entry.commanderNoMatch": {
    pt: "Nenhuma carta corresponde",
    en: "No matching card",
  },
  "draft.entry.commanderFlag": { pt: "Comandante", en: "Commander" },
  "draft.entry.unflag": { pt: "Remover", en: "Unflag" },
  "draft.entry.clearCommander": { pt: "Limpar comandante", en: "Clear commander" },
  "draft.entry.removeCard": { pt: "Remover carta", en: "Remove card" },
  "draft.entry.addCard": { pt: "+ Adicionar carta", en: "+ Add another card" },
  "draft.entry.bracketLabel": { pt: "Bracket alvo", en: "Bracket target" },
  "draft.entry.start": { pt: "Iniciar draft", en: "Start draft" },
  "draft.entry.checking": { pt: "Verificando cartas…", en: "Checking cards…" },
  "draft.entry.starting": {
    pt: "Iniciando — carregando o motor e o banco de cartas (pode demorar na primeira vez)…",
    en: "Starting — loading the engine and card database (may take a while the first time)…",
  },
  "draft.entry.cancel": { pt: "Cancelar", en: "Cancel" },
  "draft.entry.tooFew": {
    pt: "Informe pelo menos três cartas (faltam {n}).",
    en: "Enter at least three cards ({n} more needed).",
  },
  "draft.entry.tooFewResolved": {
    pt: "Pelo menos três cartas precisam ser encontradas no Scryfall para iniciar.",
    en: "At least three cards need to resolve on Scryfall to start.",
  },
  "draft.entry.unresolved": { pt: "Não encontradas: {list}", en: "Not found: {list}" },
  "draft.entry.notFoundCards": {
    pt: "Não existem no banco de cartas: {list}",
    en: "Not in the card database: {list}",
  },
  "draft.entry.notLegalCards": {
    pt: "Não permitidas em Commander: {list}",
    en: "Not legal in Commander: {list}",
  },
  "draft.entry.startFailed": {
    pt: "Não foi possível iniciar o draft.",
    en: "Couldn't start the draft.",
  },

  "draft.commander.title": { pt: "Escolha o comandante", en: "Choose your commander" },
  "draft.commander.hint": {
    pt: "Nenhuma carta base foi marcada como comandante — escolha uma abaixo para fixar a identidade de cor do deck.",
    en: "No base card was flagged as commander — pick one below to fix the deck's color identity.",
  },
  "draft.commander.choose": { pt: "Escolher", en: "Choose" },
  "draft.commander.empty": {
    pt: "Nenhum candidato a comandante encontrado para essas cartas.",
    en: "No commander candidates found for these cards.",
  },

  "draft.summary.cards": { pt: "{n}/100 cartas", en: "{n}/100 cards" },
  "draft.summary.commander": { pt: "Comandante: {name}", en: "Commander: {name}" },
  "draft.summary.colorIdentity": { pt: "Identidade: {list}", en: "Identity: {list}" },
  "draft.summary.archetype": { pt: "Arquétipo: {name}", en: "Archetype: {name}" },
  "draft.summary.bracket": { pt: "Bracket: {tier}", en: "Bracket: {tier}" },
  "draft.summary.bracketTarget": { pt: "Bracket alvo", en: "Bracket target" },
  "draft.summary.targetHint": {
    pt: "Vale a partir da próxima rodada de sugestões.",
    en: "Applies starting with the next round of suggestions.",
  },

  "draft.round.title": { pt: "Sugestões", en: "Suggestions" },
  "draft.round.loadingNext": {
    pt: "Buscando a próxima rodada…",
    en: "Fetching the next round…",
  },
  "draft.round.empty": {
    pt: "Nenhuma sugestão disponível agora. Tente atualizar ou mudar o bracket alvo.",
    en: "No suggestions available right now. Try refreshing or changing the bracket target.",
  },
  "draft.round.add": { pt: "Adicionar", en: "Add" },
  "draft.round.refresh": { pt: "Atualizar", en: "Refresh" },
  "draft.round.tiltNote": {
    pt: "Passaria do bracket alvo — por isso rankeada mais abaixo.",
    en: "Would push past the bracket target — ranked lower for it.",
  },
  "draft.round.actionFailed": {
    pt: "Não foi possível completar a ação. Tente novamente.",
    en: "Couldn't complete that action. Try again.",
  },

  "draft.leave.title": { pt: "Sair do draft", en: "Leave the draft" },
  "draft.leave.copy": { pt: "Copiar lista", en: "Copy list" },
  "draft.leave.copied": { pt: "Copiado!", en: "Copied!" },
  "draft.leave.nameLabel": { pt: "Nome do deck", en: "Deck name" },
  "draft.leave.save": { pt: "Salvar na biblioteca", en: "Save to library" },
  "draft.leave.back": { pt: "← Voltar para a biblioteca", en: "← Back to library" },
  "draft.leave.partialHint": {
    pt: "Ainda não tem 100 cartas — será salvo como incompleto e marcado até ser completado.",
    en: "Not yet 100 cards — this will save as partial and stay flagged until it's complete.",
  },

  "draft.bracket.exhibition": { pt: "Exibição", en: "Exhibition" },
  "draft.bracket.core": { pt: "Essencial", en: "Core" },
  "draft.bracket.focused": { pt: "Focado", en: "Focused" },
  "draft.bracket.optimized": { pt: "Otimizado", en: "Optimized" },
  "draft.bracket.cedh": { pt: "cEDH", en: "cEDH" },
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
