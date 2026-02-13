export type Todo = {
  id: string;
  text: string;
  done: boolean;
};

export type DayData = {
  date: string; // YYYY-MM-DD
  label: string;
  todos: Todo[];
};

export type WeekData = {
  weekSummary: string;
  days: DayData[];
};

const STORAGE_PREFIX = "weeklyTodo:";
const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

export const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (date: Date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_JP[date.getDay()];
  return `${month}/${day}(${weekday})`;
};

export const getWeekRange = (baseDate: Date) => {
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

export const buildDefaultWeek = (monday: Date): WeekData => {
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

export const getWeekId = (monday: Date, sunday: Date) =>
  `${formatDate(monday)}~${formatDate(sunday)}`;

export const loadWeekData = (weekId: string, fallback: WeekData): WeekData => {
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

export const saveWeekData = (weekId: string, data: WeekData) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_PREFIX}${weekId}`, JSON.stringify(data));
};

export const listStoredWeeks = () => {
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

export const formatWeekRangeLabel = (weekId: string) => {
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

export const generateNotionText = (
  data: WeekData,
  monday: Date,
  sunday: Date,
) => {
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

export const generateNotionHtml = (
  data: WeekData,
  monday: Date,
  sunday: Date,
) => {
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

