"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DayData, Todo, WeekData } from "./utils";
import {
  buildDefaultWeek,
  formatDisplayDate,
  formatWeekRangeLabel,
  generateNotionHtml,
  generateNotionText,
  getWeekId,
  getWeekRange,
  listStoredWeeks,
  loadWeekData,
  saveWeekData,
} from "./utils";

type WeekHeaderProps = {
  weekRangeLabel: string;
  weekSummary: string;
  isCurrentWeek: boolean;
  isReadOnly: boolean;
  onBackToCurrent: () => void;
  onGenerateNotion: () => void;
  onSummaryChange: (value: string) => void;
};

const WeekHeader = ({
  weekRangeLabel,
  weekSummary,
  isCurrentWeek,
  isReadOnly,
  onBackToCurrent,
  onGenerateNotion,
  onSummaryChange,
}: WeekHeaderProps) => (
  <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-500">今週の範囲</p>
          <h1 className="text-2xl font-semibold">{weekRangeLabel}</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={onBackToCurrent}
            className="rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isCurrentWeek}
          >
            今週に戻る
          </button>
          <button
            type="button"
            onClick={onGenerateNotion}
            disabled={!isCurrentWeek}
            className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Notion用テキスト生成
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <label className="text-sm font-semibold text-zinc-500">週サマリー</label>
        <input
          type="text"
          value={weekSummary}
          onChange={(event) => onSummaryChange(event.target.value)}
          disabled={isReadOnly}
          placeholder="今週のフォーカスやテーマ"
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-600 disabled:bg-zinc-100"
        />
      </div>
    </div>
  </header>
);

type StoredWeeksListProps = {
  storedWeeks: string[];
  selectedWeekId: string;
  onSelect: (weekId: string) => void;
};

const StoredWeeksList = ({
  storedWeeks,
  selectedWeekId,
  onSelect,
}: StoredWeeksListProps) => (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <h2 className="text-sm font-semibold text-zinc-500">保存済みの週一覧</h2>
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      {storedWeeks.length === 0 && (
        <span className="text-zinc-400">まだ保存がありません。</span>
      )}
      {storedWeeks.map((weekId) => (
        <button
          key={weekId}
          type="button"
          onClick={() => onSelect(weekId)}
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
);

type DayCardProps = {
  day: DayData;
  displayDate: string;
  newTodoText: string;
  isReadOnly: boolean;
  onLabelChange: (date: string, value: string) => void;
  onTodoTextChange: (date: string, value: string) => void;
  onAddTodo: (date: string) => void;
  onToggleTodo: (date: string, todoId: string) => void;
  onDeleteTodo: (date: string, todoId: string) => void;
};

const DayCard = ({
  day,
  displayDate,
  newTodoText,
  isReadOnly,
  onLabelChange,
  onTodoTextChange,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: DayCardProps) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">{displayDate}</h3>
        <input
          type="text"
          value={day.label}
          onChange={(event) => onLabelChange(day.date, event.target.value)}
          disabled={isReadOnly}
          placeholder="ラベル（例: 会議 / 仕込み / 休み）"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-600 disabled:bg-zinc-100 sm:max-w-xs"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newTodoText}
            onChange={(event) => onTodoTextChange(day.date, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddTodo(day.date);
              }
            }}
            disabled={isReadOnly}
            placeholder="タスクを追加"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-600 disabled:bg-zinc-100"
          />
          <button
            type="button"
            onClick={() => onAddTodo(day.date)}
            disabled={isReadOnly}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            追加
          </button>
        </div>

        <div className="space-y-2">
          {day.todos.length === 0 && (
            <p className="text-sm text-zinc-400">まだタスクがありません。</p>
          )}
          {day.todos.map((todo: Todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => onToggleTodo(day.date, todo.id)}
                disabled={isReadOnly}
                className="h-4 w-4 accent-zinc-900"
              />
              <span
                className={`flex-1 text-sm ${
                  todo.done ? "text-zinc-400 line-through" : "text-zinc-800"
                }`}
              >
                {todo.text}
              </span>
              <button
                type="button"
                onClick={() => onDeleteTodo(day.date, todo.id)}
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

type NotionOutputProps = {
  notionText: string;
  copyStatus: string;
};

const NotionOutput = ({ notionText, copyStatus }: NotionOutputProps) => (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-zinc-500">Notion用テキスト</h2>
        <span className="text-xs text-zinc-500">{copyStatus}</span>
      </div>
      <textarea
        value={notionText}
        readOnly
        rows={8}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none"
        placeholder="「Notion用テキスト生成」を押すとここに表示されます。"
      />
    </div>
  </section>
);

export default function WeeklyTodoApp() {
  const [baseDate, setBaseDate] = useState(() => new Date());
  const { monday, sunday } = useMemo(
    () => getWeekRange(baseDate),
    [baseDate],
  );
  const currentWeekId = useMemo(
    () => getWeekId(monday, sunday),
    [monday, sunday],
  );
  const previousCurrentWeekId = useRef(currentWeekId);

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
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    const timeoutMs = nextMidnight.getTime() - now.getTime();
    const timeoutId = window.setTimeout(() => {
      const nextDate = new Date();
      const nextRange = getWeekRange(nextDate);
      const nextWeekId = getWeekId(nextRange.monday, nextRange.sunday);
      setBaseDate(nextDate);
      setSelectedWeekId((prev) =>
        prev === previousCurrentWeekId.current ? nextWeekId : prev,
      );
      previousCurrentWeekId.current = nextWeekId;
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [baseDate]);

  useEffect(() => {
    // eslint-disable-next-line
    setIsHydrated(true);
    const defaultWeek = buildDefaultWeek(monday);
    const data = loadWeekData(selectedWeekId, defaultWeek);
    setWeekData(data);
    setStoredWeeks(listStoredWeeks());
    setNewTodoTexts({});
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

  const handleGenerateNotion = async () => {
    if (!isCurrentWeek) return;
    const text = generateNotionText(weekData, monday, sunday);
    const html = generateNotionHtml(weekData, monday, sunday);
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
        <WeekHeader
          weekRangeLabel={formatWeekRangeLabel(selectedWeekId)}
          weekSummary={weekData.weekSummary}
          isCurrentWeek={isCurrentWeek}
          isReadOnly={isReadOnly}
          onBackToCurrent={() => setSelectedWeekId(currentWeekId)}
          onGenerateNotion={handleGenerateNotion}
          onSummaryChange={handleSummaryChange}
        />

        <StoredWeeksList
          storedWeeks={storedWeeks}
          selectedWeekId={selectedWeekId}
          onSelect={setSelectedWeekId}
        />

        <section className="flex flex-col gap-4">
          {weekData.days.map((day) => {
            const date = new Date(`${day.date}T00:00:00`);
            const displayDate = formatDisplayDate(date);
            return (
              <DayCard
                key={day.date}
                day={day}
                displayDate={displayDate}
                newTodoText={newTodoTexts[day.date] || ""}
                isReadOnly={isReadOnly}
                onLabelChange={handleLabelChange}
                onTodoTextChange={(dayDate, value) =>
                  setNewTodoTexts((prev) => ({
                    ...prev,
                    [dayDate]: value,
                  }))
                }
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
              />
            );
          })}
        </section>

        <NotionOutput notionText={notionText} copyStatus={copyStatus} />
      </div>
    </div>
  );
}

