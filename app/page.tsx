"use client";

import { useEffect, useMemo, useState } from "react";

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

type DayData = {
  date: string; // YYYY-MM-DD
  label: string;
  todos: Todo[];
};

type WeekData = {
  weekSummary: string;
  days: DayData[];
};

const STORAGE_PREFIX = "weeklyTodo:";
const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_JP[date.getDay()];
  return `${month}/${day}(${weekday})`;
};

const getWeekRange = (baseDate: Date) => {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = date.getDay(); // 0: Sun, 1: Mon
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
};

const buildDefaultWeek = (monday: Date): WeekData => {
  const days: DayData[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      date: formatDate(date),
      label: "",
      todos: [],
    };
  });
  return { weekSummary: "", days };
};

const getWeekId = (monday: Date, sunday: Date) =>
  `${formatDate(monday)}~${formatDate(sunday)}`;

const loadWeekData = (weekId: string, fallback: WeekData): WeekData => {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${weekId}`);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as WeekData;
    if (!parsed || !Array.isArray(parsed.days)) return fallback;
    return {
      weekSummary: parsed.weekSummary ?? "",
      days: parsed.days,
    };
  } catch {
    return fallback;
  }
};

const saveWeekData = (weekId: string, data: WeekData) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_PREFIX}${weekId}`, JSON.stringify(data));
};

const listStoredWeeks = () => {
  if (typeof window === "undefined") return [] as string[];
  const weeks: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      weeks.push(key.replace(STORAGE_PREFIX, ""));
    }
  }
  return weeks.sort((a, b) => (a < b ? 1 : -1));
};

const formatWeekRangeLabel = (weekId: string) => {
  const [start, end] = weekId.split("~");
  if (!start || !end) return weekId;
  return `${start}〜${end}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function Home() {
  const { monday, sunday } = useMemo(() => getWeekRange(new Date()), []);
  const currentWeekId = useMemo(
    () => getWeekId(monday, sunday),
    [monday, sunday],
  );

  const [selectedWeekId, setSelectedWeekId] = useState<string>(currentWeekId);
  const [weekData, setWeekData] = useState<WeekData>(() => {
    const defaultWeek = buildDefaultWeek(monday);
    return loadWeekData(currentWeekId, defaultWeek);
  });
  const [storedWeeks, setStoredWeeks] = useState<string[]>(() =>
    listStoredWeeks(),
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [notionText, setNotionText] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<string>("");
  const [newTodoTexts, setNewTodoTexts] = useState<Record<string, string>>({});

  const isCurrentWeek = selectedWeekId === currentWeekId;
  const isReadOnly = !isCurrentWeek;

  useEffect(() => {
    // eslint-disable-next-line
    setIsHydrated(true);
    const defaultWeek = buildDefaultWeek(monday);
    const data = loadWeekData(selectedWeekId, defaultWeek);
    setWeekData(data);
    setStoredWeeks(listStoredWeeks());
  }, [monday, selectedWeekId]);

  const updateWeekData = (updater: (prev: WeekData) => WeekData) => {
    if (!isCurrentWeek) return;
    setWeekData((prev) => {
      const next = updater(prev);
      saveWeekData(currentWeekId, next);
      setStoredWeeks(listStoredWeeks());
      return next;
    });
  };

  const handleSelectWeek = (weekId: string) => {
    setSelectedWeekId(weekId);
  };

  const handleSummaryChange = (value: string) => {
    if (isReadOnly) return;
    updateWeekData((prev) => ({ ...prev, weekSummary: value }));
  };

  const handleLabelChange = (date: string, value: string) => {
    if (isReadOnly) return;
    updateWeekData((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.date === date ? { ...day, label: value } : day,
      ),
    }));
  };

  const handleToggleTodo = (date: string, todoId: string) => {
    if (isReadOnly) return;
    updateWeekData((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.date === date
          ? {
              ...day,
              todos: day.todos.map((todo) =>
                todo.id === todoId ? { ...todo, done: !todo.done } : todo,
              ),
            }
          : day,
      ),
    }));
  };

  const handleDeleteTodo = (date: string, todoId: string) => {
    if (isReadOnly) return;
    updateWeekData((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.date === date
          ? { ...day, todos: day.todos.filter((todo) => todo.id !== todoId) }
          : day,
      ),
    }));
  };

  const handleAddTodo = (date: string) => {
    if (isReadOnly) return;
    const text = (newTodoTexts[date] || "").trim();
    if (!text) return;
    updateWeekData((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.date === date
          ? {
              ...day,
              todos: [
                ...day.todos,
                { id: `${date}-${Date.now()}`, text, done: false },
              ],
            }
          : day,
      ),
    }));
    setNewTodoTexts((prev) => ({ ...prev, [date]: "" }));
  };

  const generateNotionText = (data: WeekData) => {
    const weekTitle = `${formatDisplayDate(monday)}〜${formatDisplayDate(
      sunday,
    )}：${data.weekSummary}`;
    const dayBlocks = data.days
      .map((day) => {
        if (day.todos.length === 0) return "";
        const date = new Date(`${day.date}T00:00:00`);
        const header = `  > ${formatDisplayDate(date)}｜${day.label}`;
        const tasks = day.todos
          .map((todo) => `    * [${todo.done ? "x" : " "}] ${todo.text}`)
          .join("\n");
        return `${header}\n${tasks}`;
      })
      .filter(Boolean);
    if (dayBlocks.length === 0) {
      return `> ${weekTitle}`;
    }
    return `> ${weekTitle}\n${dayBlocks.join("\n\n")}`;
  };

  const generateNotionHtml = (data: WeekData) => {
    const weekTitle = `${formatDisplayDate(monday)}〜${formatDisplayDate(
      sunday,
    )}：${data.weekSummary}`;
    const dayBlocks = data.days
      .map((day) => {
        if (day.todos.length === 0) return "";
        const date = new Date(`${day.date}T00:00:00`);
        const header = `${formatDisplayDate(date)}｜${day.label}`;
        const tasks = day.todos
          .map((todo) => {
            const checked = todo.done ? " checked" : "";
            return `<li><input type="checkbox"${checked} /> ${escapeHtml(
              todo.text,
            )}</li>`;
          })
          .join("");
        return `<details open><summary>${escapeHtml(
          header,
        )}</summary><ul>${tasks}</ul></details>`;
      })
      .filter(Boolean)
      .join("");
    return `<details open><summary>${escapeHtml(
      weekTitle,
    )}</summary>${dayBlocks}</details>`;
  };

  const handleGenerateNotion = async () => {
    if (!isCurrentWeek) return;
    const text = generateNotionText(weekData);
    const html = generateNotionHtml(weekData);
    setNotionText(text);
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("コピーに失敗しました。");
      return;
    }
    try {
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopyStatus("クリップボードにコピーしました。");
    } catch {
      setCopyStatus("コピーに失敗しました。");
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-500">
                  今週の範囲
                </p>
                <h1 className="text-2xl font-semibold">
                  {formatWeekRangeLabel(selectedWeekId)}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => handleSelectWeek(currentWeekId)}
                  className="rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isCurrentWeek}
                >
                  今週に戻る
                </button>
                <button
                  type="button"
                  onClick={handleGenerateNotion}
                  disabled={!isCurrentWeek}
                  className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  Notion用テキスト生成
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="text-sm font-semibold text-zinc-500">
                週サマリー
              </label>
              <input
                type="text"
                value={weekData.weekSummary}
                onChange={(event) => handleSummaryChange(event.target.value)}
                disabled={isReadOnly}
                placeholder="今週のフォーカスやテーマ"
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-600 disabled:bg-zinc-100"
              />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-500">
            保存済みの週一覧
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {storedWeeks.length === 0 && (
              <span className="text-zinc-400">まだ保存がありません。</span>
            )}
            {storedWeeks.map((weekId) => (
                <button
                key={weekId}
                type="button"
                  onClick={() => handleSelectWeek(weekId)}
                className={`rounded-full border px-3 py-1.5 transition ${
                  weekId === selectedWeekId
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
                }`}
              >
                {weekId}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {weekData.days.map((day) => {
            const date = new Date(`${day.date}T00:00:00`);
            const displayDate = formatDisplayDate(date);
            return (
              <div
                key={day.date}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold">{displayDate}</h3>
                    <input
                      type="text"
                      value={day.label}
                      onChange={(event) =>
                        handleLabelChange(day.date, event.target.value)
                      }
                      disabled={isReadOnly}
                      placeholder="ラベル（例: 会議 / 仕込み / 休み）"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-600 disabled:bg-zinc-100 sm:max-w-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={newTodoTexts[day.date] || ""}
                        onChange={(event) =>
                          setNewTodoTexts((prev) => ({
                            ...prev,
                            [day.date]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddTodo(day.date);
                          }
                        }}
                        disabled={isReadOnly}
                        placeholder="タスクを追加"
                        className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-600 disabled:bg-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTodo(day.date)}
                        disabled={isReadOnly}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                      >
                        追加
                      </button>
                    </div>

                    <div className="space-y-2">
                      {day.todos.length === 0 && (
                        <p className="text-sm text-zinc-400">
                          まだタスクがありません。
                        </p>
                      )}
                      {day.todos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={todo.done}
                            onChange={() =>
                              handleToggleTodo(day.date, todo.id)
                            }
                            disabled={isReadOnly}
                            className="h-4 w-4 accent-zinc-900"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              todo.done
                                ? "text-zinc-400 line-through"
                                : "text-zinc-800"
                            }`}
                          >
                            {todo.text}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteTodo(day.date, todo.id)
                            }
                            disabled={isReadOnly}
                            className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-zinc-500">
                Notion用テキスト
              </h2>
              <span className="text-xs text-zinc-500">{copyStatus}</span>
            </div>
            <textarea
              value={notionText}
              onChange={(event) => setNotionText(event.target.value)}
              readOnly
              rows={8}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none"
              placeholder="「Notion用テキスト生成」を押すとここに表示されます。"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
