import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  RANK_WORD,
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
  playable,
  wanted,
  onAsk,
}: {
  card?: Card;
  hidden?: boolean;
  fresh?: boolean;
  index: number;
  playable?: boolean;
  wanted?: boolean;
  onAsk?: () => void;
}) {
  const marks = `card${hidden || !card ? " back" : ` face${card.suit === "h" || card.suit === "d" ? " red" : ""}`}${fresh ? " from-them" : ""}${playable ? " playable" : ""}${wanted ? " wanted" : ""}`;
  const style = { ["--i" as string]: index };
  if (hidden || !card) return <div className={marks} style={style} />;
  const body = (
    <>
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
    </>
  );
  if (playable) {
    return (
      <button
        type="button"
        className={marks}
        style={style}
        onClick={onAsk}
        aria-label={`Запитати: ${RANK_WORD[card.rank]}`}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={marks} style={style}>
      {body}
    </div>
  );
}

function Home() {
  const [save, setSave] = useState<Save>(EMPTY_SAVE);
  const [difficulty, setDifficulty] = useState<Difficulty>("sly");
  const [stake, setStake] = useState<Stake>("trinket");
  const [status, setStatus] = useState<"menu" | "play" | "over">("menu");
  const [table, setTable] = useState<Table | null>(null);
  const [turn, setTurn] = useState<Side>("fox");
  const [locked, setLocked] = useState(false);
  const [line, setLine] = useState("Вітаю. Зіграємо в рибалку на дрібнички?");
  const [wanted, setWanted] = useState<Rank | null>(null);
  const [mood, setMood] = useState<"calm" | "smug" | "worry">("calm");
  const [fresh, setFresh] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);
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
    setMood(delta >= 1 ? "worry" : delta <= -1 ? "smug" : "calm");
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
    setStatus("over");
    setLocked(true);
    tuneMood(finalTable);
    const current = loadSave();
    if (who === "fox" && stakeRef.current === "medal") {
      setLine("Підкова ваша. Чесна гра.");
      speak("/voice/pig-medal.mp3");
      persist({ ...current, medal: true, fox: current.fox + 1, best: current.best + 1 });
    } else if (who === "fox") {
      setLine("Комплектів більше у вас. Клацніть підкову, якщо хочете підняти ставку.");
      speak("/voice/pig-youwin.mp3");
      persist({ ...current, fox: current.fox + 1, best: current.best + 1 });
    } else if (who === "pig") {
      setLine("Партія моя. Я в цьому доволі вправний.");
      speak("/voice/pig-sorry.mp3");
      persist({ ...current, pig: current.pig + 1, best: 0 });
    } else {
      setLine("Схоже, цього разу нічия. Дрібнички лишаються на столі.");
      speak("/voice/pig-draw.mp3");
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
      setLine(who === "fox" ? "Пан Глек: Забирай. Вони твої." : "Рудько віддає карти.");
      speak(who === "fox" ? "/voice/pig-take.mp3" : "/voice/fox-give.mp3");
    } else if (meta.drawn && meta.drawn.rank === rank) {
      sfxTake();
      setLine(who === "fox" ? "Саме те. Хід лишається за вами." : "Йому випало те, що просив.");
      speak(who === "fox" ? "/voice/pig-pleasant.mp3" : "/voice/pig-skilled.mp3");
    } else if (meta.drawn) {
      sfxFish();
      setLine(who === "fox" ? "Пан Глек: Гарна спроба. Бери карту." : "Бери карту, пане Глек.");
      speak(who === "fox" ? "/voice/pig-nicetry.mp3" : "/voice/pig-gofish.mp3");
    } else {
      sfxFish();
      setLine("Колода вже порожня.");
    }
    setWanted(null);
    if (!(await sleep(760, id))) return;
    if (meta.booksMade.length > 0) {
      sfxBook();
      setLine("Один комплект готовий.");
      speak(who === "pig" && meta.table.books.pig.length > meta.table.books.fox.length ? "/voice/pig-sorry.mp3" : "/voice/pig-set.mp3");
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
        setLine("Ваш хід. Клацніть карту того рангу, який питаєте.");
        speak("/voice/pig-turn.mp3");
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
    if (Math.random() < 0.35) {
      setLine(diffRef.current === "sly" ? "Хм. Я це запам’ятав." : "Хм. Дай подумаю.");
      speak("/voice/pig-think.mp3");
    }
    const think = diffRef.current === "easy" ? 520 : diffRef.current === "sly" ? 980 : 760;
    if (!(await sleep(think, id))) return;
    const current = tableRef.current;
    if (!current || current.hands.pig.length === 0) return;
    const rank = pigChoose(current.hands.pig, memRef.current, diffRef.current, Math.random);
    setLine(`Пан Глек: А чи є ${RANK_WORD[rank]}?`);
    setWanted(rank);
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
    setWanted(null);
    setMood("calm");
    setStatus("play");
    setTurn("fox");
    setLocked(false);
    setLine(nextStake === "medal" ? "Гаразд. Піднімаємо ставку на підкову." : "Гарна дрібничка. Граю ось цією.");
    speak(nextStake === "medal" ? "/voice/pig-raise.mp3" : "/voice/pig-lovely.mp3");
    sfxDeal();
    void id;
  }

  function onAsk(rank: Rank) {
    if (locked || turn !== "fox" || status !== "play") return;
    unlockSound();
    void playAsk("fox", rank, life.current, false);
  }

  const pigSrc =
    mood === "worry" ? "/art/pig-worry.jpg" : mood === "smug" ? "/art/pig-smug.jpg" : "/art/pig.jpg";
  const canRaise = save.fox >= 1 && !save.medal && status !== "play";
  const yourTurn = status === "play" && turn === "fox" && !locked;

  return (
    <main className="lounge">
      <header className="topbar">
        <div className="brand">
          <h1>Дрібнички</h1>
          <p>Рибалка в кантині</p>
        </div>
        <div className="scoreline">
          <span className="pill">Рудько {save.fox}</span>
          <span className="pill">Глек {save.pig}</span>
          <span className="pill">{save.medal ? "Підкова у вас" : "Підкова в Глека"}</span>
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

      <section className="stage" aria-live="polite">
        <div className={`actor${mood === "worry" ? " worry" : ""}`}>
          <div className={`portrait-wrap${turn === "pig" && status === "play" ? " is-turn" : ""}`}>
            <img src={pigSrc} alt="Пан Глек за столом у кантині" />
          </div>
          <div>
            <p className="bubble">{line}</p>
            <p className="quiet">
              {status === "play"
                ? yourTurn
                  ? "Ваш хід. Клацніть одну зі своїх карт."
                  : "Хід пана Глека."
                : "Спершу дрібничка. Підкову можна поставити лише після перемоги."}
            </p>
          </div>
        </div>

        {table && status !== "menu" ? (
          <div className="hand hidden-hand" aria-label="Карти пана Глека">
            {sortHand(table.hands.pig).map((card, index) => (
              <PlayingCard key={card.id} hidden index={index} />
            ))}
          </div>
        ) : (
          <div className="hand hidden-hand" />
        )}

        <div className="felt">
          <div className="sets" aria-label="Ваші комплекти">
            {(table?.books.fox ?? []).map((rank) => (
              <span className="book" key={rank}>
                {rank}
              </span>
            ))}
          </div>
          <div className="deck" aria-label={`У колоді ${table?.deck.length ?? 52}`}>
            <span>{table?.deck.length ?? 52}</span>
          </div>
          <button
            type="button"
            className={`charm${canRaise ? " live" : ""}`}
            disabled={!canRaise}
            onClick={() => begin("medal")}
            aria-label={save.medal ? "Підкова вже ваша" : "Поставити щасливу підкову"}
          >
            <img src="/art/horseshoe.jpg" alt="" />
          </button>
          <div className="sets his" aria-label="Комплекти пана Глека">
            {(table?.books.pig ?? []).map((rank) => (
              <span className="book" key={rank}>
                {rank}
              </span>
            ))}
          </div>
        </div>

        {status === "menu" ? (
          <div className="dock-actions">
            <div className="choices" role="group" aria-label="Наскільки добре він пам’ятає">
              {(
                [
                  ["easy", "Забудькуватий"],
                  ["normal", "Звичайний"],
                  ["sly", "Як у кантині"],
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
                Покласти дрібничку на стіл
              </button>
            </div>
          </div>
        ) : table ? (
          <>
            <div className="hand" aria-label="Ваші карти">
              {sortHand(table.hands.fox).map((card, index) => (
                <PlayingCard
                  key={card.id}
                  card={card}
                  index={index}
                  fresh={fresh.includes(card.id)}
                  playable={yourTurn}
                  wanted={wanted === card.rank}
                  onAsk={() => onAsk(card.rank)}
                />
              ))}
            </div>
            <div className="actor fox">
              <p className="quiet">
                Комплекти {table.books.fox.length}:{table.books.pig.length}. Перемагає той, у кого їх більше.
              </p>
              <div className={`portrait-wrap${yourTurn ? " is-turn" : ""}`}>
                <img src="/art/fox.jpg" alt="Рудько" />
              </div>
            </div>
          </>
        ) : null}

        {status === "over" && (
          <div className="actions">
            <button type="button" className="primary" onClick={() => begin("trinket")}>
              Ще дрібничка
            </button>
            {canRaise ? (
              <button type="button" className="ghost" onClick={() => begin("medal")}>
                Ставка: підкова
              </button>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
