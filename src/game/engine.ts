export const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type Rank = (typeof RANKS)[number];
export const SUITS = ["s", "h", "d", "c"] as const;
export type Suit = (typeof SUITS)[number];
export type Side = "fox" | "pig";
export type Difficulty = "easy" | "normal" | "sly";
export type Stake = "trinket" | "medal";

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface Table {
  deck: Card[];
  hands: Record<Side, Card[]>;
  books: Record<Side, Rank[]>;
}

export interface Memory {
  foxHas: Partial<Record<Rank, number>>;
  foxLacks: Rank[];
}

export interface AskMeta {
  table: Table;
  transferred: Card[];
  drawn: Card | null;
  booksMade: Rank[];
  extraTurn: boolean;
  over: boolean;
  refilled: Card[];
}

export const RANK_WORD: Record<Rank, string> = {
  A: "тузи",
  "2": "двійки",
  "3": "трійки",
  "4": "четвірки",
  "5": "п'ятірки",
  "6": "шістки",
  "7": "сімки",
  "8": "вісімки",
  "9": "дев'ятки",
  "10": "десятки",
  J: "валети",
  Q: "дами",
  K: "королі",
};

export const RANK_ONE: Record<Rank, string> = {
  A: "туз",
  "2": "двійка",
  "3": "трійка",
  "4": "четвірка",
  "5": "п'ятірка",
  "6": "шістка",
  "7": "сімка",
  "8": "вісімка",
  "9": "дев'ятка",
  "10": "десятка",
  J: "валет",
  Q: "дама",
  K: "король",
};

export function emptyMemory(): Memory {
  return { foxHas: {}, foxLacks: [] };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
  }
  return next;
}

export function deal(rng: () => number): Table {
  const deck = shuffle(
    SUITS.flatMap((suit) =>
      RANKS.map((rank) => ({ id: `${rank}${suit}`, rank, suit })),
    ),
    rng,
  );
  return {
    deck: deck.slice(14),
    hands: { fox: deck.slice(0, 7), pig: deck.slice(7, 14) },
    books: { fox: [], pig: [] },
  };
}

export function gameOver(table: Table): boolean {
  const books = table.books.fox.length + table.books.pig.length;
  if (books >= 13) return true;
  if (
    table.deck.length === 0 &&
    (table.hands.fox.length === 0 || table.hands.pig.length === 0)
  ) {
    return true;
  }
  return false;
}

export function winnerOf(table: Table): Side | "tie" {
  if (table.books.fox.length > table.books.pig.length) return "fox";
  if (table.books.pig.length > table.books.fox.length) return "pig";
  return "tie";
}

function takeBooks(hand: Card[]): { hand: Card[]; made: Rank[] } {
  const made: Rank[] = [];
  let next = hand;
  for (const rank of RANKS) {
    if (next.filter((card) => card.rank === rank).length >= 4) {
      made.push(rank);
      next = next.filter((card) => card.rank !== rank);
    }
  }
  return { hand: next, made };
}

function replenish(table: Table, who: Side): { table: Table; drawn: Card | null } {
  if (table.hands[who].length > 0 || table.deck.length === 0) {
    return { table, drawn: null };
  }
  const drawn = table.deck[0]!;
  return {
    drawn,
    table: {
      ...table,
      deck: table.deck.slice(1),
      hands: { ...table.hands, [who]: [drawn] },
    },
  };
}

export function ask(table: Table, who: Side, rank: Rank): AskMeta {
  if (!table.hands[who].some((card) => card.rank === rank)) {
    throw new Error("Можна питати лише ранг, який є в руці");
  }
  const other: Side = who === "fox" ? "pig" : "fox";
  const give = table.hands[other].filter((card) => card.rank === rank);
  let hands: Record<Side, Card[]> = {
    fox: [...table.hands.fox],
    pig: [...table.hands.pig],
  };
  let deck = table.deck;
  let drawn: Card | null = null;
  const transferred: Card[] = [];
  let matched = false;

  if (give.length > 0) {
    transferred.push(...give);
    hands[other] = hands[other].filter((card) => card.rank !== rank);
    hands[who] = [...hands[who], ...give];
    matched = true;
  } else if (deck.length > 0) {
    drawn = deck[0]!;
    deck = deck.slice(1);
    hands[who] = [...hands[who], drawn];
    matched = drawn.rank === rank;
  }

  const books = { fox: [...table.books.fox], pig: [...table.books.pig] };
  const extracted = takeBooks(hands[who]);
  hands[who] = extracted.hand;
  books[who] = [...books[who], ...extracted.made];

  let next: Table = { deck, hands, books };
  const refilled: Card[] = [];
  const foxFill = replenish(next, "fox");
  next = foxFill.table;
  if (foxFill.drawn) refilled.push(foxFill.drawn);
  const pigFill = replenish(next, "pig");
  next = pigFill.table;
  if (pigFill.drawn) refilled.push(pigFill.drawn);

  const over = gameOver(next);
  return {
    table: next,
    transferred,
    drawn,
    booksMade: extracted.made,
    extraTurn: matched && next.hands[who].length > 0 && !over,
    over,
    refilled,
  };
}

export function rememberFoxAsk(memory: Memory, rank: Rank): Memory {
  return {
    foxHas: { ...memory.foxHas, [rank]: Math.max(memory.foxHas[rank] ?? 0, 1) },
    foxLacks: memory.foxLacks.filter((item) => item !== rank),
  };
}

export function rememberGive(
  memory: Memory,
  who: Side,
  rank: Rank,
  count: number,
  booksMade: Rank[],
): Memory {
  const foxHas = { ...memory.foxHas };
  let foxLacks = [...memory.foxLacks];
  if (who === "fox" && count > 0) {
    foxHas[rank] = (foxHas[rank] ?? 0) + count;
  }
  if (who === "pig" && count === 0) {
    if (!foxLacks.includes(rank)) foxLacks.push(rank);
    delete foxHas[rank];
  }
  if (who === "pig" && count > 0) {
    delete foxHas[rank];
  }
  for (const book of booksMade) {
    delete foxHas[book];
    foxLacks = foxLacks.filter((item) => item !== book);
  }
  return { foxHas, foxLacks };
}

export function pigChoose(
  hand: Card[],
  memory: Memory,
  difficulty: Difficulty,
  rng: () => number,
): Rank {
  const ranks = [...new Set(hand.map((card) => card.rank))];
  if (ranks.length === 0) throw new Error("Немає карт для ходу");
  if (difficulty === "easy") return ranks[Math.floor(rng() * ranks.length)]!;

  let best = ranks[0]!;
  let bestScore = -Infinity;
  for (const rank of ranks) {
    const held = hand.filter((card) => card.rank === rank).length;
    let score = held * 4;
    const known = memory.foxHas[rank] ?? 0;
    if (known > 0) score += 7 + known * (difficulty === "sly" ? 4 : 2);
    if (memory.foxLacks.includes(rank)) score -= difficulty === "sly" ? 10 : 4;
    score += rng() * (difficulty === "sly" ? 0.7 : 3.2);
    if (score > bestScore) {
      bestScore = score;
      best = rank;
    }
  }
  return best;
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const byRank = RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
    if (byRank !== 0) return byRank;
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}
