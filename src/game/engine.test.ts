import assert from "node:assert/strict";
import test from "node:test";
import {
  RANKS,
  ask,
  deal,
  gameOver,
  pigChoose,
  rememberFoxAsk,
  shuffle,
  type Card,
  type Table,
} from "./engine.ts";

test("shuffle keeps every card once", () => {
  const deck = deal(() => 0.3);
  const all = [...deck.deck, ...deck.hands.fox, ...deck.hands.pig];
  assert.equal(all.length, 52);
  assert.equal(new Set(all.map((card) => card.id)).size, 52);
  assert.equal(deck.hands.fox.length, 7);
  assert.equal(deck.hands.pig.length, 7);
});

test("a hit moves every copy and can make a book", () => {
  const fox: Card[] = [
    { id: "As", rank: "A", suit: "s" },
    { id: "Ah", rank: "A", suit: "h" },
    { id: "2c", rank: "2", suit: "c" },
  ];
  const pig: Card[] = [
    { id: "Ad", rank: "A", suit: "d" },
    { id: "Ac", rank: "A", suit: "c" },
    { id: "3h", rank: "3", suit: "h" },
  ];
  const table: Table = { deck: [], hands: { fox, pig }, books: { fox: [], pig: [] } };
  const meta = ask(table, "fox", "A");
  assert.equal(meta.transferred.length, 2);
  assert.equal(meta.booksMade.length, 1);
  assert.equal(meta.table.books.fox[0], "A");
  assert.equal(meta.table.hands.fox.some((card) => card.rank === "A"), false);
  assert.equal(meta.over, false);
});

test("a miss draws one and does not grant an extra turn", () => {
  const fox: Card[] = [{ id: "2c", rank: "2", suit: "c" }];
  const pig: Card[] = [{ id: "3h", rank: "3", suit: "h" }];
  const deck: Card[] = [{ id: "4s", rank: "4", suit: "s" }];
  const meta = ask(
    { deck, hands: { fox, pig }, books: { fox: [], pig: [] } },
    "fox",
    "2",
  );
  assert.equal(meta.drawn?.id, "4s");
  assert.equal(meta.extraTurn, false);
  assert.equal(meta.table.deck.length, 0);
});

test("matching the drawn card keeps the turn", () => {
  const fox: Card[] = [{ id: "2c", rank: "2", suit: "c" }];
  const pig: Card[] = [{ id: "3h", rank: "3", suit: "h" }];
  const deck: Card[] = [{ id: "2s", rank: "2", suit: "s" }];
  const meta = ask(
    { deck, hands: { fox, pig }, books: { fox: [], pig: [] } },
    "fox",
    "2",
  );
  assert.equal(meta.extraTurn, true);
});

test("illegal ask is rejected", () => {
  const table = deal(() => 0.2);
  const missing = RANKS.find((rank) => !table.hands.fox.some((card) => card.rank === rank))!;
  assert.throws(() => ask(table, "fox", missing));
});

test("a random match always finishes", () => {
  let table = deal(Math.random);
  let guard = 0;
  let who: "fox" | "pig" = "fox";
  const memory = { foxHas: {}, foxLacks: [] as typeof RANKS[number][] };
  while (!gameOver(table) && guard < 400) {
    guard += 1;
    const hand = table.hands[who];
    if (hand.length === 0) break;
    const rank =
      who === "pig"
        ? pigChoose(hand, memory, "sly", Math.random)
        : hand[Math.floor(Math.random() * hand.length)]!.rank;
    if (who === "fox") Object.assign(memory, rememberFoxAsk(memory, rank));
    const meta = ask(table, who, rank);
    table = meta.table;
    who = meta.extraTurn ? who : who === "fox" ? "pig" : "fox";
  }
  assert.equal(gameOver(table), true);
  assert.ok(guard < 400);
});

test("shuffle keeps the same cards", () => {
  const once = shuffle([1, 2, 3, 4], () => 0.5);
  assert.deepEqual([...once].sort(), [1, 2, 3, 4]);
});
