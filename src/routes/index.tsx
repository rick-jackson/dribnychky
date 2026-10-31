import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  RANK_ONE,
  RANK_WORD,
  RANKS,
  ask,
  deal,
  emptyMemory,
  gameOver,
  pigChoose,
  rememberFoxAsk,
  rememberGive,
  sortHand,
  winnerOf,
  type AskMeta,
  type Card,
  type Difficulty,
  type Memory,
  type Rank,
  type Side,
  type Stake,
  type Suit,
  type Table,
} from "@/game/engine";
import {
  setSoundEnabled,
  sfxBook,
  sfxDeal,
  sfxFish,
  sfxTake,
  soundEnabled,
  speak,
  unlockSound,
} from "@/game/sound";

export const Route = createFileRoute("/")({ component: Home });

const SAVE_KEY = "dribnychky-v1";

interface Save {
  fox: number;
  pig: number;
  medal: boolean;
  best: number;
}

const EMPTY_SAVE: Save = { fox: 0, pig: 0, medal: false, best: 0 };

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return EMPTY_SAVE;
    const parsed = JSON.parse(raw) as Partial<Save>;
    return {
      fox: Number(parsed.fox) || 0,
      pig: Number(parsed.pig) || 0,
      medal: Boolean(parsed.medal),
      best: Number(parsed.best) || 0,
    };
  } catch {
    return EMPTY_SAVE;
  }
}

function SuitMark({ suit }: { suit: Suit }) {
  const glyph = suit === "s" ? "♠" : suit === "h" ? "♥" : suit === "d" ? "♦" : "♣";
  return <span aria-hidden="true">{glyph}</span>;
}

function PlayingCard({
  card,
  hidden,
  fresh,
  index,
}: {
  card?: Card;
  hidden?: boolean;
  fresh?: boolean;
  index: number;
}) {
  if (hidden || !card) {
    return <div className="card back" style={{ ["--i" as string]: index }} />;
  }
  const red = card.suit === "h" || card.suit === "d";
  return (
    <div
      className={`card face${red ? " red" : ""}${fresh ? " from-them" : ""}`}
      style={{ ["--i" as string]: index }}
    >
      <span className="corner">
        {card.rank}
        <SuitMark suit={card.suit} />
      </span>
      <span className="pip">
        <SuitMark suit={card.suit} />
      </span>
      <span className="corner bottom">
        {card.rank}
        <SuitMark suit={card.suit} />
      </span>
    </div>
  );
}

function Home() {
  const [save, setSave] = useState<Save>(EMPTY_SAVE);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [stake, setStake] = useState<Stake>("trinket");
  const [status, setStatus] = useState<"menu" | "play" | "over">("menu");
  const [table, setTable] = useState<Table | null>(null);
  const [turn, setTurn] = useState<Side>("fox");
  const [locked, setLocked] = useState(false);
  const [line, setLine] = useState("Пан Глек уже розклав колоду.");
  const [mood, setMood] = useState<"calm" | "smug" | "worry">("calm");
  const [fresh, setFresh] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [winner, setWinner] = useState<Side | "tie" | null>(null);
  const life = useRef(0);
  const tableRef = useRef<Table | null>(null);
  const memRef = useRef<Memory>(emptyMemory());
  const diffRef = useRef(difficulty);
  const stakeRef = useRef(stake);
  tableRef.current = table;
  diffRef.current = difficulty;
  stakeRef.current = stake;

  useEffect(() => {
    setSave(loadSave());
    const onVis = () => {
      if (document.visibilityState === "visible") unlockSound();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function persist(next: Save) {
    setSave(next);
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function sleep(ms: number, id: number) {
    return new Promise<boolean>((resolve) => {
      window.setTimeout(() => resolve(life.current === id), ms);
    });
  }

  function tuneMood(next: Table) {
    const delta = next.books.fox.length - next.books.pig.length;
    setMood(delta >= 2 ? "worry" : delta <= -1 ? "smug" : "calm");
  }

  function noteAsk(who: Side, rank: Rank, meta: AskMeta) {
    let memory = memRef.current;
    if (who === "fox") memory = rememberFoxAsk(memory, rank);
    memory = rememberGive(memory, who, rank, meta.transferred.length, meta.booksMade);
    if (who === "fox" && meta.drawn?.rank === rank) memory = rememberFoxAsk(memory, rank);
    memRef.current = memory;
  }

  async function finish(finalTable: Table, id: number) {
    if (life.current !== id) return;
    const who = winnerOf(finalTable);
    setWinner(who);
    setStatus("over");
    setLocked(true);
    tuneMood(finalTable);
    const current = loadSave();
    if (who === "fox" && stakeRef.current === "medal") {
      setLine("Медальйон твій. Чесна гра.");
      speak("/voice/pig-medal.mp3");
      persist({ ...current, medal: true, fox: current.fox + 1, best: current.best + 1 });
    } else if (who === "fox") {
      setLine("Гарно зіграно. Вітаю.");
      speak("/voice/pig-youwin.mp3");
      const best = current.best + 1;
      persist({ ...current, fox: current.fox + 1, best });
    } else if (who === "pig") {
      setLine("Партія моя.");
      speak("/voice/pig-iwin.mp3");
      persist({ ...current, pig: current.pig + 1, best: 0 });
    } else {
      setLine("Нічия. Дрібнички лишаються на столі.");
      speak("/voice/pig-again.mp3");
    }
  }

  async function playAsk(who: Side, rank: Rank, id: number, announced: boolean) {
    setLocked(true);
    setTurn(who);
    if (!announced && who === "fox") {
      setLine(`Рудько: Чи є у вас ${RANK_WORD[rank]}?`);
      speak(`/voice/fox-r-${rank}.mp3`);
      if (!(await sleep(720, id))) return;
    }
    const live = tableRef.current;
    if (!live || life.current !== id) return;
    if (!live.hands[who].some((card) => card.rank === rank)) {
      setLocked(who !== "fox");
      return;
    }
    const meta = ask(live, who, rank);
    noteAsk(who, rank, meta);
    tableRef.current = meta.table;
    setTable(meta.table);
    setFresh([
      ...meta.transferred.map((card) => card.id),
      ...(meta.drawn ? [meta.drawn.id] : []),
      ...meta.refilled.map((card) => card.id),
    ]);
    tuneMood(meta.table);
    if (meta.transferred.length > 0) {
      sfxTake();
      if (who === "fox") {
        setLine("Пан Глек: Забирай. Вони твої.");
        speak("/voice/pig-take.mp3");
      } else {
        setLine("Рудько віддає карти.");
        speak("/voice/fox-give.mp3");
      }
    } else if (meta.drawn && meta.drawn.rank === rank) {
      sfxTake();
      setLine(who === "fox" ? "Саме те. Хід лишається за вами." : "Пан Глек витягнув потрібне.");
      speak(who === "fox" ? "/voice/pig-pleasant.mp3" : "/voice/pig-skilled.mp3");
    } else if (meta.drawn) {
      sfxFish();
      setLine(who === "fox" ? "Пан Глек: Бери карту." : "Бери карту, пане Глек.");
      if (who === "fox") speak("/voice/pig-gofish.mp3");
    } else {
      sfxFish();
      setLine("Колода вже порожня.");
    }
    if (!(await sleep(760, id))) return;
    if (meta.booksMade.length > 0) {
      sfxBook();
      const names = meta.booksMade.map((item) => RANK_ONE[item]).join(", ");
      setLine(who === "fox" ? `Книжка Рудька: ${names}.` : `Книжка пана Глека: ${names}.`);
      if (who === "pig") speak("/voice/pig-book.mp3");
      if (!(await sleep(820, id))) return;
    }
    if (meta.over || gameOver(meta.table)) {
      await finish(meta.table, id);
      return;
    }
    if (meta.extraTurn) {
      if (who === "fox") {
        setTurn("fox");
        setLocked(false);
        return;
      }
      await pigTurn(id);
      return;
    }
    if (who === "fox") await pigTurn(id);
    else {
      setTurn("fox");
      setLocked(false);
      setLine("Ваш хід. Питайте ранг, який тримаєте в руці.");
    }
  }

  async function pigTurn(id: number) {
    if (life.current !== id) return;
    setTurn("pig");
    setLocked(true);
    const live = tableRef.current;
    if (!live) return;
    if (gameOver(live) || live.hands.pig.length === 0) {
      await finish(live, id);
      return;
    }
    if (Math.random() < 0.4) {
      setLine("Хм. Дай подумаю.");
      speak("/voice/pig-think.mp3");
    }
    const think = diffRef.current === "easy" ? 520 : diffRef.current === "sly" ? 980 : 760;
    if (!(await sleep(think, id))) return;
    const current = tableRef.current;
    if (!current || current.hands.pig.length === 0) return;
    const rank = pigChoose(current.hands.pig, memRef.current, diffRef.current, Math.random);
    setLine(`Пан Глек: А чи є ${RANK_WORD[rank]}?`);
    speak(`/voice/pig-r-${rank}.mp3`);
    if (!(await sleep(700, id))) return;
    await playAsk("pig", rank, id, true);
  }

  function begin(nextStake: Stake) {
    unlockSound();
    life.current += 1;
    const id = life.current;
    const next = deal(Math.random);
    memRef.current = emptyMemory();
    tableRef.current = next;
    stakeRef.current = nextStake;
    setStake(nextStake);
    setTable(next);
    setFresh([...next.hands.fox, ...next.hands.pig].map((card) => card.id));
    setWinner(null);
    setMood("calm");
    setStatus("play");
    setTurn("fox");
    setLocked(false);
    setLine("Вітаю за столом. Я — пан Глек. Зіграємо в рибалку на дрібнички?");
    speak("/voice/pig-welcome.mp3");
    sfxDeal();
    void id;
  }

  function onAsk(rank: Rank) {
    if (locked || turn !== "fox" || status !== "play") return;
    unlockSound();
    void playAsk("fox", rank, life.current, false);
  }

  const foxRanks = table
    ? RANKS.filter((rank) => table.hands.fox.some((card) => card.rank === rank))
    : [];
  const pigSrc =
    mood === "worry" ? "/art/pig-worry.jpg" : mood === "smug" ? "/art/pig-smug.jpg" : "/art/pig.jpg";

  return (
    <main className="lounge">
      <header className="topbar">
        <div className="brand">
          <h1>Дрібнички</h1>
          <p>Рибалка у вітальні пана Глека</p>
        </div>
        <div className="scoreline">
          <span className="pill">Рудько {save.fox}</span>
          <span className="pill">Глек {save.pig}</span>
          <span className="pill">{save.medal ? "Медальйон у вас" : "Медальйон у Глека"}</span>
          <button
            type="button"
            className="icon-btn"
            aria-pressed={soundOn}
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
              if (next) unlockSound();
            }}
          >
            {soundOn && soundEnabled() ? "Голос увімкнено" : "Голос вимкнено"}
          </button>
        </div>
      </header>

      {status === "menu" ? (
        <section className="menu">
          <div className="hero-row">
            <div>
              <h2>Стіл уже накритий зеленим сукном.</h2>
              <p className="quiet">
                Пан Глек тримає щасливий медальйон. Спершу виграйте дрібничку, тоді можна ставити його.
              </p>
            </div>
            <img className="medal" src="/art/medal.jpg" alt="Золотий медальйон із кораблем" />
          </div>
          <div className="choices" role="group" aria-label="Складність">
            {(
              [
                ["easy", "М'яка"],
                ["normal", "Звичайна"],
                ["sly", "Хитра"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={difficulty === id}
                onClick={() => setDifficulty(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={() => begin("trinket")}>
              Грати на дрібничку
            </button>
            <button
              type="button"
              className="ghost"
              disabled={save.fox < 1 || save.medal}
              onClick={() => begin("medal")}
            >
              {save.medal ? "Медальйон уже ваш" : "Ставка: медальйон"}
            </button>
          </div>
          <details className="rules">
            <summary>Як грати</summary>
            <p>
              Питайте ранг, який є у вас на руках. Якщо він є в Глека, забираєте всі такі карти і ходите
              знову. Якщо ні — берете карту з колоди. Чотири однакові складають книжку. Більше книжок після
              порожньої колоди — перемога.
            </p>
          </details>
        </section>
      ) : table ? (
        <section className="stage" aria-live="polite">
          <div className={`actor${mood === "worry" ? " worry" : ""}`}>
            <div className={`portrait-wrap${turn === "pig" ? " is-turn" : ""}`}>
              <img src={pigSrc} alt="Пан Глек, хазяїн вітальні" />
            </div>
            <div>
              <p className="bubble">{line}</p>
              <div className="books" aria-label="Книжки пана Глека">
                {table.books.pig.map((rank) => (
                  <span className="book" key={rank}>
                    {rank}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="hand hidden-hand" aria-label="Карти пана Глека">
            {sortHand(table.hands.pig).map((card, index) => (
              <PlayingCard key={card.id} hidden index={index} />
            ))}
          </div>

          <div className="felt">
            <div className="deck" aria-label={`У колоді ${table.deck.length}`}>
              <span>{table.deck.length}</span>
            </div>
          </div>

          <div className="hand" aria-label="Ваші карти">
            {sortHand(table.hands.fox).map((card, index) => (
              <PlayingCard
                key={card.id}
                card={card}
                index={index}
                fresh={fresh.includes(card.id)}
              />
            ))}
          </div>

          <div className="actor fox">
            <div>
              <p className="quiet">
                {turn === "fox" && !locked ? "Ваш хід" : "Хід пана Глека"} · книжок {table.books.fox.length}
                :{table.books.pig.length}
              </p>
              <div className="asks">
                {foxRanks.map((rank) => {
                  const count = table.hands.fox.filter((card) => card.rank === rank).length;
                  return (
                    <button
                      key={rank}
                      type="button"
                      className="ask"
                      disabled={locked || turn !== "fox" || status !== "play"}
                      onClick={() => onAsk(rank)}
                    >
                      {RANK_WORD[rank]}
                      <small>{count} на руках</small>
                    </button>
                  );
                })}
              </div>
              <div className="books" aria-label="Ваші книжки">
                {table.books.fox.map((rank) => (
                  <span className="book" key={rank}>
                    {rank}
                  </span>
                ))}
              </div>
            </div>
            <div className={`portrait-wrap${turn === "fox" ? " is-turn" : ""}`}>
              <img src="/art/fox.jpg" alt="Рудько" />
            </div>
          </div>
        </section>
      ) : null}

      {status === "over" && (
        <section className="overlay">
          <h2>
            {winner === "fox"
              ? stake === "medal"
                ? "Медальйон ваш"
                : "Дрібничка ваша"
              : winner === "pig"
                ? "Цього разу Глек"
                : "Нічия"}
          </h2>
          <p className="quiet">
            Книжки: Рудько {table?.books.fox.length ?? 0}, пан Глек {table?.books.pig.length ?? 0}.
          </p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => begin(stake === "medal" && !save.medal ? "medal" : "trinket")}>
              Ще коло
            </button>
            <button
              type="button"
              className="ghost"
              disabled={save.fox < 1 || save.medal}
              onClick={() => begin("medal")}
            >
              Ставка: медальйон
            </button>
            <button type="button" className="ghost" onClick={() => setStatus("menu")}>
              До вітальні
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
