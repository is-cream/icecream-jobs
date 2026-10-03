import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
Accordion,
ActionIcon,
Badge,
Button,
CloseButton,
Group,
Modal,
Paper,
Select,
Stack,
Tabs,
Text,
Textarea,
TextInput,
Title,
} from "@mantine/core";
import { DateInput, DatePicker } from "@mantine/dates";
import { api, type ApiResponse } from "./api";

type AppRow = ApiResponse<typeof api, "listApplications">["applications"][number];
type QuestionRow = ApiResponse<typeof api, "listQuestions">["questions"][number];
type Match = AppRow["match"];

const MATCH_LABEL: Record<Match, string> = {
  great: "Great match",
  ok: "OK match",
  weak: "Weak match",
  unrated: "Not rated",
};
const MATCH_VAR: Record<Match, string> = {
  great: "var(--great)",
  ok: "var(--ok)",
  weak: "var(--weak)",
  unrated: "var(--dim)",
};
const MATCH_ORDER: Match[] = ["great", "ok", "weak", "unrated"];

/* ---------- date helpers (plain YYYY-MM-DD calendar dates) ---------- */

function fmtDay(dateStr: string): string {
  const [y = 1970, m = 1, d = 1] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtShort(dateStr: string): string {
  const [y = 1970, m = 1, d = 1] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function localToday(): string {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}
function shiftDate(dateStr: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}
function applicationSearchText(r: AppRow): string {
  const parts: (string | null | undefined)[] = [
    r.title,
    r.company,
    r.reqId,
    r.location,
    r.status,
    r.statusRaw,
    r.status === "blocked" ? "blocked not submitted" : "applied submitted",
    r.match,
    MATCH_LABEL[r.match],
    r.date,
    r.notes,
    r.letterNote,
    r.url,
  ];
  if (r.date) {
    parts.push(fmtShort(r.date), fmtDay(r.date));
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", color: "var(--dim)" }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = out.get(k);
    if (arr) arr.push(item);
    else out.set(k, [item]);
  }
  return out;
}

/* ---------- in-app document viewer (cover letters + resume) ----------
 * Full-screen overlay inside the app: the document text renders as
 * readable paragraphs and scrolls; a Back control returns to the list.
 * Never a download, never an external app. */

type DocView = { title: string; subtitle?: string; text: string };

/** Render a markdown-ish source (.md letters / resume) as clean blocks:
 * headings, bullet/numbered lists, and paragraphs, with **bold** kept. */
function renderInline(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i}>{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function DocumentBody({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const first = lines[0] ?? "";
        if (/^#{1,6}\s/.test(first) && lines.length === 1) {
          const level = (first.match(/^#+/)?.[0] ?? "#").length;
          const content = first.replace(/^#+\s*/, "");
          if (level === 1) {
            return (
              <h2 key={i} className="font-display text-3xl mt-2 mb-3">
                {renderInline(content)}
              </h2>
            );
          }
          if (level === 2) {
            return (
              <h3 key={i} className="font-display text-2xl mt-7 mb-2">
                {renderInline(content)}
              </h3>
            );
          }
          return (
            <h4 key={i} className="font-display text-xl mt-6 mb-2">
              {renderInline(content)}
            </h4>
          );
        }
        if (lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc pl-6 my-3 space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(l.replace(/^([-*•]|\d+[.)])\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-3 leading-relaxed whitespace-pre-line">
            {renderInline(lines.join("\n"))}
          </p>
        );
      })}
    </div>
  );
}

function DocumentViewer({
  doc,
  onClose,
}: {
  doc: DocView;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--bg)", color: "var(--text)" }}
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <Button
          variant="default"
          radius="xl"
          size="sm"
          onClick={onClose}
          aria-label="Back to applications"
        >
          ← Back
        </Button>
        <div className="min-w-0">
          <div className="font-medium truncate">{doc.title}</div>
          {doc.subtitle && (
            <div className="text-xs truncate" style={{ color: "var(--dim)" }}>
              {doc.subtitle}
            </div>
          )}
        </div>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          radius="xl"
          ml="auto"
          onClick={onClose}
          aria-label="Close document"
        >
          ✕
        </ActionIcon>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 pb-20">
          <DocumentBody text={doc.text} />
        </div>
      </div>
    </div>
  );
}

/* ---------- small pieces (Mantine design-system components) ---------- */

/* Match is the assistant's determination — read-only in the UI.
 * Displayed as a static badge, never an editor. The assistant sets it
 * through the setMatch action. */
function MatchBadge({ row }: { row: AppRow }) {
  return (
    <Badge
      variant="outline"
      radius="xl"
      size="sm"
      aria-label={`Match rating for ${row.title} at ${row.company}: ${MATCH_LABEL[row.match]}`}
      style={{
        color: MATCH_VAR[row.match],
        borderColor: MATCH_VAR[row.match],
      }}
    >
      {MATCH_LABEL[row.match]}
    </Badge>
  );
}

function MatchLabel({ match }: { match: Match }) {
  return (
    <Badge
      variant="outline"
      radius="xl"
      size="sm"
      style={{
        color: MATCH_VAR[match],
        borderColor: MATCH_VAR[match],
      }}
    >
      {MATCH_LABEL[match]}
    </Badge>
  );
}

function StatusChip({ row }: { row: AppRow }) {
  if (row.status === "blocked") {
    return (
      <Badge variant="outline" color="red" radius="xl" size="sm">
        Blocked — not submitted
      </Badge>
    );
  }
  return (
    <Badge variant="outline" color="gray" radius="xl" size="sm">
      {row.statusRaw || "Applied"}
    </Badge>
  );
}

function ApplicationLine({
  row,
  onEdit,
  onViewLetter,
  showDate,
}: {
  row: AppRow;
  onEdit: (row: AppRow) => void;
  onViewLetter: (row: AppRow) => void;
  showDate?: boolean;
}) {
  return (
    <li className="py-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {row.url ? (
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline decoration-dotted underline-offset-2 break-words"
            >
              {row.title}
            </a>
          ) : (
            <span className="font-medium break-words">{row.title}</span>
          )}
          <div className="text-sm" style={{ color: "var(--dim)" }}>
            {row.company}
            {row.location ? ` · ${row.location}` : ""}
            {showDate ? ` · ${row.date ? fmtShort(row.date) : "no date in log"}` : ""}
          </div>
          {row.reqId && (
            <div className="text-xs" style={{ color: "var(--dim)" }}>
              Req {row.reqId}
            </div>
          )}
          {row.status === "blocked" && row.statusRaw && (
            <div className="text-xs" style={{ color: "var(--weak)" }}>
              {row.statusRaw}
            </div>
          )}
          {row.notes && row.status !== "blocked" && (
            <div className="text-xs" style={{ color: "var(--dim)" }}>
              {row.notes}
            </div>
          )}
        </div>
        <ActionIcon
          variant="subtle"
          color="gray"
          size={44}
          radius="xl"
          onClick={() => onEdit(row)}
          aria-label={`Edit application: ${row.title} at ${row.company}`}
          title="Edit application"
          style={{ flexShrink: 0, marginTop: -6 }}
        >
          <PencilIcon />
        </ActionIcon>
      </div>
      <Group gap="xs">
        <StatusChip row={row} />
        <MatchBadge row={row} />
        {row.coverLetter && (
          <button
            type="button"
            onClick={() => onViewLetter(row)}
            aria-label={`View cover letter for ${row.title} at ${row.company}`}
            className="text-xs underline decoration-dotted underline-offset-4"
            style={{ color: "var(--dim)", background: "none", border: "none", padding: "2px 2px", cursor: "pointer" }}
          >
            Cover letter
          </button>
        )}
      </Group>
    </li>
  );
}

/* ---------- edit form (Mantine Modal + inputs) ----------
 * Editing existing applications only. New applications are added by the
 * assistant through the addApplication action — there is no manual-add
 * form in the UI. */

type FormState = {
  company: string;
  title: string;
  reqId: string;
  date: string;
  statusRaw: string;
  status: "applied" | "blocked";
  location: string;
  url: string;
  match: Match;
  notes: string;
};

function ApplicationForm({
  initial,
  onClose,
  onSave,
  onDelete,
  busy,
}: {
  initial: FormState;
  onClose: () => void;
  onSave: (f: FormState) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (v: string) =>
    setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal
      opened
      onClose={onClose}
      title="Edit application"
      centered
      size="lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(f);
        }}
      >
        <Stack gap="sm">
          <TextInput
            label="Company"
            required
            value={f.company}
            onChange={(e) => set("company")(e.target.value)}
          />
          <TextInput
            label="Job title"
            required
            value={f.title}
            onChange={(e) => set("title")(e.target.value)}
          />
          <Group grow align="flex-start">
            <TextInput
              label="Req ID"
              value={f.reqId}
              onChange={(e) => set("reqId")(e.target.value)}
            />
            <DateInput
              label="Date applied"
              value={f.date || null}
              onChange={(v) => set("date")(v ? String(v) : "")}
              valueFormat="YYYY-MM-DD"
              clearable
            />
          </Group>
          <Group grow align="flex-start">
            <Select
              label="Outcome"
              value={f.status}
              onChange={(v) => set("status")(v ?? "applied")}
              data={[
                { value: "applied", label: "Applied / submitted" },
                { value: "blocked", label: "Blocked — not submitted" },
              ]}
              allowDeselect={false}
            />
            <TextInput
              label="Status text"
              value={f.statusRaw}
              onChange={(e) => set("statusRaw")(e.target.value)}
            />
          </Group>
          <Group grow align="flex-start">
            <TextInput
              label="Location"
              value={f.location}
              onChange={(e) => set("location")(e.target.value)}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>
                Match rating
              </Text>
              <MatchLabel match={f.match} />
              <Text size="xs" c="dimmed" mt={4}>
                Set by your assistant — not editable here.
              </Text>
            </div>
          </Group>
          <TextInput
            label="Posting / confirmation URL"
            type="url"
            value={f.url}
            onChange={(e) => set("url")(e.target.value)}
          />
          <Textarea
            label="Notes"
            value={f.notes}
            onChange={(e) => set("notes")(e.target.value)}
            rows={2}
          />
          <Group mt="sm">
            <Button type="submit" loading={busy} radius="xl">
              Save changes
            </Button>
            <Button type="button" variant="default" radius="xl" onClick={onClose}>
              Cancel
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                color="red"
                radius="xl"
                ml="auto"
                loading={busy}
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/* ---------- questionnaire ---------- */

function QuestionCard({
  q,
  draft,
  onDraft,
  onSubmit,
  busy,
}: {
  q: QuestionRow;
  draft: string;
  onDraft: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const canSubmit = draft.trim().length > 0;
  return (
    <Paper withBorder radius="md" p="md" component="li">
      <Stack gap="xs">
        {q.context && (
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {q.context}
          </Text>
        )}
        <Text fw={600}>{q.question}</Text>
        <Text size="xs" c="dimmed">
          Asked {fmtWhen(q.createdAt)} · blocks this application until answered
        </Text>
        {q.kind === "choice" ? (
          <Select
            aria-label={`Answer for: ${q.question}`}
            placeholder="Select an answer"
            value={draft || null}
            onChange={(v) => onDraft(v ?? "")}
            data={q.options}
            allowDeselect={false}
          />
        ) : (
          <Textarea
            aria-label={`Answer for: ${q.question}`}
            placeholder="Type your answer"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            rows={3}
            autosize
            minRows={2}
          />
        )}
        <Group>
          <Button
            radius="xl"
            disabled={!canSubmit}
            loading={busy}
            onClick={onSubmit}
            aria-label={`Submit answer for: ${q.question}`}
          >
            Submit answer
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

/* ---------- main app ---------- */

export function App() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>("dashboard");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [matchFilter, setMatchFilter] = useState<"all" | Match>("all");
  const [form, setForm] = useState<{ initial: FormState; id: number } | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [docView, setDocView] = useState<DocView | null>(null);
  const syncStarted = useRef(false);

  const query = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.listApplications({}),
  });
  const rows = useMemo(() => query.data?.applications ?? [], [query.data]);

  const questionsQuery = useQuery({
    queryKey: ["questions"],
    queryFn: () => api.listQuestions({}),
  });
  const questions = useMemo(
    () => questionsQuery.data?.questions ?? [],
    [questionsQuery.data],
  );
  const pendingQuestions = useMemo(
    () => questions.filter((q) => q.status === "pending"),
    [questions],
  );

  const resumeQuery = useQuery({
    queryKey: ["resume"],
    queryFn: () => api.getResume({}),
  });
  const answeredQuestions = useMemo(
    () => questions.filter((q) => q.status === "answered"),
    [questions],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  const invalidateQuestions = () =>
    queryClient.invalidateQueries({ queryKey: ["questions"] });
  const importMut = useMutation({
    mutationFn: () => api.importApplications({}),
    onSuccess: invalidate,
  });
  const updateMut = useMutation({
    mutationFn: (a: Parameters<typeof api.updateApplication>[0]) =>
      api.updateApplication(a),
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (a: { id: number }) => api.deleteApplication(a),
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
  });
  const answerMut = useMutation({
    mutationFn: (a: { id: number; answer: string }) => api.answerQuestion(a),
    onSuccess: (_d, vars) => {
      invalidateQuestions();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
    },
  });

  // Sync automatically on every app load. importApplications is deduped
  // and non-destructive: it only inserts applications that are missing
  // and backfills cover-letter text onto existing rows — it never
  // overwrites ratings, edits, or statuses. No manual sync button.
  useEffect(() => {
    if (syncStarted.current) return;
    syncStarted.current = true;
    importMut.mutate();
  }, [importMut]);

  /* ----- derived stats ----- */
  const today = localToday();
  const applied = useMemo(() => rows.filter((r) => r.status === "applied"), [rows]);
  const blocked = useMemo(() => rows.filter((r) => r.status === "blocked"), [rows]);
  const undated = useMemo(() => rows.filter((r) => !r.date), [rows]);
  const matchCounts = useMemo(() => {
    const c: Record<Match, number> = { great: 0, ok: 0, weak: 0, unrated: 0 };
    for (const r of applied) c[r.match] += 1;
    return c;
  }, [applied]);
  const byDate = useMemo(
    () => groupBy(rows.filter((r) => r.date), (r) => r.date as string),
    [rows],
  );
  const latestDate = useMemo(() => {
    let max: string | null = null;
    for (const r of rows) if (r.date && (!max || r.date > max)) max = r.date;
    return max;
  }, [rows]);
  const weekStart = shiftDate(today, -6);
  const thisWeek = applied.filter((r) => r.date && r.date >= weekStart && r.date <= today).length;
  const thisMonth = applied.filter((r) => r.date && r.date.slice(0, 7) === today.slice(0, 7)).length;
  const busiest = useMemo(() => {
    let best: { date: string; count: number } | null = null;
    for (const [d, rs] of byDate) {
      const c = rs.filter((r) => r.status === "applied").length;
      if (c > 0 && (!best || c > best.count)) best = { date: d, count: c };
    }
    return best;
  }, [byDate]);
  const byCompany = useMemo(() => {
    const g = groupBy(rows, (r) => r.company);
    return [...g.entries()]
      .map(([company, rs]) => ({
        company,
        total: rs.length,
        appliedCount: rs.filter((r) => r.status === "applied").length,
        blockedCount: rs.filter((r) => r.status === "blocked").length,
        great: rs.filter((r) => r.match === "great").length,
        ok: rs.filter((r) => r.match === "ok").length,
        latest: rs.reduce<string | null>(
          (acc, r) => (r.date && (!acc || r.date > acc) ? r.date : acc),
          null,
        ),
      }))
      .sort((a, b) => b.appliedCount - a.appliedCount || a.company.localeCompare(b.company));
  }, [rows]);
  const byStatus = useMemo(() => {
    const g = groupBy(rows, (r) =>
      r.status === "blocked" ? "Blocked — not submitted" : r.statusRaw || "Applied",
    );
    return [...g.entries()]
      .map(([label, rs]) => ({ label, count: rs.length }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);
  const recent = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.date && b.date) return b.date.localeCompare(a.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return a.company.localeCompare(b.company);
      }).slice(0, 8),
    [rows],
  );

  /* ----- calendar state ----- */
  useEffect(() => {
    if (latestDate && !selectedDate) {
      setSelectedDate(latestDate);
      setCalMonth(latestDate);
    }
  }, [latestDate, selectedDate]);

  const dayRows = selectedDate ? (byDate.get(selectedDate) ?? []) : [];
  const dayByCompany = useMemo(
    () =>
      [...groupBy(dayRows, (r) => r.company).entries()].sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
    [dayRows],
  );
  const dayMatch = useMemo(() => {
    const c: Record<Match, number> = { great: 0, ok: 0, weak: 0, unrated: 0 };
    for (const r of dayRows) if (r.status === "applied") c[r.match] += 1;
    return c;
  }, [dayRows]);

  /* ----- filtered full list (dashboard) — plain text search over EVERYTHING ----- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    return rows.filter((r) => {
      if (matchFilter !== "all" && r.match !== matchFilter) return false;
      if (tokens.length === 0) return true;
      const haystack = applicationSearchText(r);
      // Every typed word must appear somewhere in the application's fields:
      // title, company, req ID, location, status, match tier, date, notes…
      // This keeps single-word search a simple case-insensitive substring
      // match while letting "great seattle" or "blocked october" work too.
      return tokens.every((t) => haystack.includes(t));
    });
  }, [rows, search, matchFilter]);
  const filteredByCompany = useMemo(
    () =>
      [...groupBy(filtered, (r) => r.company).entries()].sort(
        (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
      ),
    [filtered],
  );

  /* ----- form handling (edit only — new applications arrive via the
   * assistant's addApplication action, not a manual form) ----- */
  const openEdit = (row: AppRow) =>
    setForm({
      id: row.id,
      initial: {
        company: row.company,
        title: row.title,
        reqId: row.reqId,
        date: row.date ?? "",
        statusRaw: row.statusRaw,
        status: row.status,
        location: row.location ?? "",
        url: row.url ?? "",
        match: row.match,
        notes: row.notes ?? "",
      },
    });
  const saveForm = (f: FormState) => {
    const payload = {
      company: f.company.trim(),
      title: f.title.trim(),
      reqId: f.reqId.trim(),
      date: f.date ? f.date : null,
      statusRaw: f.statusRaw.trim(),
      status: f.status,
      location: f.location.trim() ? f.location.trim() : null,
      url: f.url.trim() ? f.url.trim() : null,
      match: f.match,
      notes: f.notes.trim() ? f.notes.trim() : null,
    };
    if (form) updateMut.mutate({ id: form.id, ...payload });
  };

  /* ----- document viewer (cover letters + resume, in-app) ----- */
  const openLetter = (row: AppRow) => {
    if (!row.coverLetter) return;
    setDocView({
      title: `Cover letter — ${row.company}`,
      subtitle: row.title,
      text: row.coverLetter,
    });
  };
  const openResume = () => {
    if (resumeQuery.data) {
      setDocView({ title: resumeQuery.data.title, text: resumeQuery.data.text });
    } else {
      resumeQuery.refetch().then((r) => {
        if (r.data) setDocView({ title: r.data.title, text: r.data.text });
      });
    }
  };

  const divider = { borderColor: "var(--border)" };
  const loading = query.isPending || (rows.length === 0 && importMut.isPending);

  return (
    <div
      className="min-h-screen px-4 pt-5 pb-16 max-w-3xl mx-auto"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm" c="dimmed">
          {applied.length} applied · {byCompany.length} companies
          {pendingQuestions.length > 0
            ? ` · ${pendingQuestions.length} question${pendingQuestions.length === 1 ? "" : "s"} waiting`
            : ""}
        </Text>
        <Button
          variant="subtle"
          color="gray"
          radius="xl"
          size="sm"
          onClick={openResume}
          aria-label="View resume"
        >
          Resume
        </Button>
      </Group>
      {importMut.data && importMut.data.inserted > 0 && (
        <p className="text-sm mt-3" style={{ color: "var(--great)" }}>
          Added {importMut.data.inserted} new application
          {importMut.data.inserted === 1 ? "" : "s"}.
        </p>
      )}

      <Tabs value={tab} onChange={(v) => setTab(v ?? "dashboard")} mt="md">
        <Tabs.List
          aria-label="Views"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "var(--bg)",
            paddingTop: 8,
          }}
        >
          <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
          <Tabs.Tab value="calendar">Calendar</Tabs.Tab>
          <Tabs.Tab
            value="questionnaire"
            rightSection={
              pendingQuestions.length > 0 ? (
                <Badge size="sm" circle color="orange">
                  {pendingQuestions.length}
                </Badge>
              ) : undefined
            }
          >
            Questionnaire
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard" pt="md">
          {loading ? (
            <p className="mt-16 text-center" style={{ color: "var(--dim)" }}>
              Loading your application log…
            </p>
          ) : query.error ? (
            <p className="mt-16 text-center" style={{ color: "var(--weak)" }}>
              Couldn&apos;t load your applications. Please try again in a moment.
            </p>
          ) : rows.length === 0 ? (
            <div className="mt-16 text-center flex flex-col items-center gap-4">
              <p style={{ color: "var(--dim)" }}>
                No applications yet. New applications will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              {/* hero tally */}
              <section className="mt-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <span className="font-display leading-none" style={{ fontSize: 76 }}>
                    {applied.length}
                  </span>
                  <div className="pb-2">
                    <div className="font-display text-2xl">jobs applied</div>
                    <div className="text-sm" style={{ color: "var(--dim)" }}>
                      across {byCompany.length} companies
                      {blocked.length > 0
                        ? ` · ${blocked.length} blocked before submitting`
                        : ""}
                      {undated.length > 0 ? ` · ${undated.length} with no date in the log` : ""}
                    </div>
                  </div>
                </div>
                <div
                  className="flex h-3.5 rounded-full overflow-hidden mt-5 border"
                  style={divider}
                  role="img"
                  aria-label={`Match breakdown: ${matchCounts.great} great, ${matchCounts.ok} OK, ${matchCounts.weak} weak, ${matchCounts.unrated} not yet rated`}
                >
                  {MATCH_ORDER.map((m) =>
                    matchCounts[m] > 0 ? (
                      <div
                        key={m}
                        style={{
                          width: `${(matchCounts[m] / Math.max(applied.length, 1)) * 100}%`,
                          background: m === "unrated" ? "var(--surface-alt)" : MATCH_VAR[m],
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="flex gap-x-5 gap-y-1.5 flex-wrap mt-3 text-sm">
                  {MATCH_ORDER.map((m) => (
                    <span key={m} className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{
                          background: m === "unrated" ? "var(--surface-alt)" : MATCH_VAR[m],
                          border: "1px solid var(--border)",
                        }}
                      />
                      <span style={{ color: MATCH_VAR[m] }} className="font-medium">
                        {matchCounts[m]}
                      </span>{" "}
                      {MATCH_LABEL[m]}
                    </span>
                  ))}
                </div>
                <p className="text-sm mt-2" style={{ color: "var(--dim)" }}>
                  Match ratings are your assistant&apos;s assessment of fit — shown here for reference.
                </p>
              </section>

              {/* stat tiles */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
                {[
                  { label: "Applied this week", value: String(thisWeek) },
                  { label: "Applied this month", value: String(thisMonth) },
                  {
                    label: "Busiest day",
                    value: busiest ? `${busiest.count}` : "—",
                    sub: busiest ? fmtShort(busiest.date) : undefined,
                  },
                  { label: "Companies", value: String(byCompany.length) },
                ].map((s) => (
                  <Paper key={s.label} withBorder radius="md" p="sm">
                    <div className="font-display text-3xl">{s.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>
                      {s.label}
                      {s.sub ? ` · ${s.sub}` : ""}
                    </div>
                  </Paper>
                ))}
              </section>

              {/* by company */}
              <section className="mt-10">
                <h2 className="font-display text-2xl mb-1">By company</h2>
                <ul>
                  {byCompany.map((c) => (
                    <li
                      key={c.company}
                      className="py-3 border-b flex items-center gap-3"
                      style={divider}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{c.company}</div>
                        <div className="text-xs" style={{ color: "var(--dim)" }}>
                          {c.great > 0 ? `${c.great} great · ` : ""}
                          {c.ok > 0 ? `${c.ok} OK · ` : ""}
                          {c.blockedCount > 0 ? `${c.blockedCount} blocked · ` : ""}
                          {c.latest ? `last applied ${fmtShort(c.latest)}` : "no dated applications"}
                        </div>
                      </div>
                      <div
                        className="hidden sm:block h-2 rounded-full flex-1 max-w-40"
                        style={{ background: "var(--surface-alt)" }}
                      >
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(c.appliedCount / Math.max(applied.length, 1)) * 100}%`,
                            background: "var(--accent)",
                          }}
                        />
                      </div>
                      <span className="font-display text-2xl w-10 text-right">
                        {c.appliedCount}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* by status */}
              <section className="mt-10">
                <h2 className="font-display text-2xl mb-3">By status</h2>
                <Group gap="xs">
                  {byStatus.map((s) => (
                    <Badge
                      key={s.label}
                      variant="light"
                      color="gray"
                      size="lg"
                      radius="xl"
                    >
                      {s.count} {s.label}
                    </Badge>
                  ))}
                </Group>
              </section>

              {/* recent */}
              <section className="mt-10">
                <h2 className="font-display text-2xl mb-1">Most recent</h2>
                <ul className="divide-y" style={divider}>
                  {recent.map((r) => (
                    <ApplicationLine
                      key={r.id}
                      row={r}
                      onEdit={openEdit}
                      onViewLetter={openLetter}
                      showDate
                    />
                  ))}
                </ul>
              </section>

              {/* all applications */}
              <section className="mt-10">
                <h2 className="font-display text-2xl mb-3">All applications</h2>
                <TextInput
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  placeholder="Search anything — job title, company, location, status, date…"
                  aria-label="Search applications"
                  size="lg"
                  radius="md"
                  leftSection={<SearchIcon />}
                  leftSectionWidth={42}
                  rightSection={
                    search ? (
                      <CloseButton
                        aria-label="Clear search"
                        title="Clear search"
                        onClick={() => setSearch("")}
                        size="md"
                      />
                    ) : undefined
                  }
                  rightSectionWidth={search ? 42 : undefined}
                  description="Filters instantly as you type — no Enter needed. Searches title, company, req ID, location, status, match and date."
                />
                <Group justify="space-between" align="center" mt="sm" wrap="wrap" gap="xs">
                  <Group gap="xs" role="group" aria-label="Filter by match rating">
                    {(["all", ...MATCH_ORDER] as const).map((m) => (
                      <Button
                        key={m}
                        size="xs"
                        radius="xl"
                        variant={matchFilter === m ? "filled" : "outline"}
                        color={matchFilter === m ? undefined : "gray"}
                        onClick={() => setMatchFilter(m)}
                        aria-pressed={matchFilter === m}
                      >
                        {m === "all" ? "All" : MATCH_LABEL[m]}
                      </Button>
                    ))}
                  </Group>
                  <Text
                    size="sm"
                    c="dimmed"
                    role="status"
                    aria-live="polite"
                    aria-label={`${filtered.length} applications shown`}
                  >
                    {search.trim() || matchFilter !== "all"
                      ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}`
                      : `${filtered.length} applications`}
                    {search.trim()
                      ? ` for “${search.trim()}”`
                      : ""}
                    {(search.trim() || matchFilter !== "all") && filtered.length !== rows.length
                      ? ` of ${rows.length}`
                      : ""}
                  </Text>
                </Group>
                {search.trim() && (
                  <Text size="xs" c="dimmed" mt="xs">
                    Not seeing it? Try a company, location, “great”, “blocked”, or a date like “2026-10-01”.
                  </Text>
                )}
                {filteredByCompany.length === 0 ? (
                  <div className="mt-6">
                    <p className="text-sm" style={{ color: "var(--dim)" }}>
                      {search.trim()
                        ? `Nothing matches “${search.trim()}”.`
                        : "Nothing matches that filter."}
                    </p>
                    {search.trim() && (
                      <Button
                        variant="light"
                        color="gray"
                        size="xs"
                        radius="xl"
                        mt="sm"
                        onClick={() => setSearch("")}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredByCompany.map(([company, rs]) => (
                    <div key={company} className="mt-6">
                      <h3 className="font-display text-xl">
                        {company}{" "}
                        <span className="text-base" style={{ color: "var(--dim)" }}>
                          · {rs.length}
                        </span>
                      </h3>
                      <ul className="divide-y" style={divider}>
                        {rs.map((r) => (
                          <ApplicationLine
                            key={r.id}
                            row={r}
                                  onEdit={openEdit}
                            onViewLetter={openLetter}
                            showDate
                          />
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="calendar" pt="md">
          {loading ? (
            <p className="mt-16 text-center" style={{ color: "var(--dim)" }}>
              Loading your application log…
            </p>
          ) : (
            <>
              {/* Calendar — Mantine DatePicker (design-system component).
                  Day cells show how many applications landed that day. */}
              <Paper withBorder radius="md" p="md">
                <Group justify="center">
                  <DatePicker
                    value={selectedDate}
                    onChange={(v) => setSelectedDate(v ? String(v) : null)}
                    date={calMonth ?? undefined}
                    onDateChange={(d) => setCalMonth(String(d))}
                    size="lg"
                    firstDayOfWeek={0}
                    highlightToday
                    previousLabel="Previous month"
                    nextLabel="Next month"
                    getDayAriaLabel={(date) => {
                      const rs = byDate.get(date) ?? [];
                      const a = rs.filter((r) => r.status === "applied").length;
                      const b = rs.length - a;
                      return `${fmtDay(date)}: ${a} applied${b ? `, ${b} blocked` : ""}`;
                    }}
                    renderDay={(date) => {
                      const rs = byDate.get(date) ?? [];
                      const a = rs.filter((r) => r.status === "applied").length;
                      const b = rs.length - a;
                      return (
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            lineHeight: 1.05,
                          }}
                        >
                          <span>{Number(date.slice(8))}</span>
                          {a > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--highlight)",
                              }}
                            >
                              {a}
                            </span>
                          )}
                          {a === 0 && b > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--weak)",
                              }}
                            >
                              {b}
                            </span>
                          )}
                        </span>
                      );
                    }}
                  />
                </Group>
                <Text size="xs" c="dimmed" ta="center" mt="sm">
                  Pick a day to see its applications below. Numbers show how many
                  applications landed that day.
                </Text>
              </Paper>

              {/* day detail */}
              {selectedDate && (
                <section className="mt-8">
                  <Title order={2} className="font-display">
                    {fmtDay(selectedDate)}
                  </Title>
                  {dayRows.length === 0 ? (
                    <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
                      No applications logged on this date.
                    </p>
                  ) : (
                    <>
                      <div className="flex gap-x-5 gap-y-1.5 flex-wrap mt-2 text-sm">
                        <span>
                          <span className="font-display text-xl mr-1">
                            {dayRows.filter((r) => r.status === "applied").length}
                          </span>
                          applied
                        </span>
                        <span>
                          <span className="font-display text-xl mr-1">{dayByCompany.length}</span>
                          {dayByCompany.length === 1 ? "company" : "companies"}
                        </span>
                        {MATCH_ORDER.map((m) =>
                          dayMatch[m] > 0 ? (
                            <span key={m}>
                              <span className="font-display text-xl mr-1" style={{ color: MATCH_VAR[m] }}>
                                {dayMatch[m]}
                              </span>
                              {MATCH_LABEL[m]}
                            </span>
                          ) : null,
                        )}
                        {dayRows.some((r) => r.status === "blocked") && (
                          <span style={{ color: "var(--weak)" }}>
                            <span className="font-display text-xl mr-1">
                              {dayRows.filter((r) => r.status === "blocked").length}
                            </span>
                            blocked
                          </span>
                        )}
                      </div>
                      {dayByCompany.map(([company, rs]) => (
                        <div key={company} className="mt-7">
                          <h3 className="font-display text-xl">
                            {company}{" "}
                            <span className="text-base" style={{ color: "var(--dim)" }}>
                              · {rs.length} application{rs.length === 1 ? "" : "s"}
                            </span>
                          </h3>
                          <ul className="divide-y" style={divider}>
                            {rs.map((r) => (
                              <ApplicationLine
                                key={r.id}
                                row={r}
                                          onEdit={openEdit}
                                onViewLetter={openLetter}
                              />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </>
                  )}
                </section>
              )}

              {undated.length > 0 && (
                <section className="mt-12">
                  <h2 className="font-display text-2xl">No date in the log</h2>
                  <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>
                    These rows in the application log have no date, so they can&apos;t sit
                    on the calendar. Edit one to add its date.
                  </p>
                  <ul className="divide-y" style={divider}>
                    {undated.map((r) => (
                      <ApplicationLine
                        key={r.id}
                        row={r}
                          onEdit={openEdit}
                        onViewLetter={openLetter}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="questionnaire" pt="md">
          <section className="mt-2">
            <h2 className="font-display text-2xl">Questions waiting for you</h2>
            <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>
              These are the questions blocking applications. Answer here and the
              application picks up from your answer — no need to hunt through chat.
              Answering in chat works too: the question then clears from this list.
            </p>
            {questionsQuery.isPending ? (
              <p className="mt-8" style={{ color: "var(--dim)" }}>
                Loading questions…
              </p>
            ) : questionsQuery.error ? (
              <p className="mt-8" style={{ color: "var(--weak)" }}>
                Couldn&apos;t load questions. Try again in a moment.
              </p>
            ) : pendingQuestions.length === 0 ? (
              <Paper withBorder radius="md" p="lg" mt="md">
                <Text fw={600}>Nothing waiting</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  No pending questions right now. When an application form needs
                  something only you can answer, it will show up here.
                </Text>
              </Paper>
            ) : (
              <Stack gap="md" mt="md" component="ul" style={{ listStyle: "none", padding: 0 }}>
                {pendingQuestions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    draft={drafts[q.id] ?? ""}
                    onDraft={(v) =>
                      setDrafts((prev) => ({ ...prev, [q.id]: v }))
                    }
                    onSubmit={() =>
                      answerMut.mutate({
                        id: q.id,
                        answer: (drafts[q.id] ?? "").trim(),
                      })
                    }
                    busy={answerMut.isPending && answerMut.variables?.id === q.id}
                  />
                ))}
              </Stack>
            )}
            {answerMut.isError && (
              <p className="text-sm mt-3" style={{ color: "var(--weak)" }}>
                That answer didn&apos;t save — please try again.
              </p>
            )}
          </section>

          {answeredQuestions.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl mb-3">Answered</h2>
              <Accordion variant="contained" radius="md">
                {answeredQuestions.map((q) => (
                  <Accordion.Item key={q.id} value={`q-${q.id}`}>
                    <Accordion.Control>
                      <Group gap="xs" wrap="nowrap">
                        <Badge color="teal" variant="light" radius="xl" size="sm">
                          Answered
                        </Badge>
                        <Text size="sm" fw={500} lineClamp={1}>
                          {q.question}
                        </Text>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={4}>
                        {q.context && (
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                            {q.context}
                          </Text>
                        )}
                        <Text size="sm">
                          <strong>Answer:</strong> {q.answer ?? "—"}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Asked {fmtWhen(q.createdAt)}
                          {q.answeredAt ? ` · answered ${fmtWhen(q.answeredAt)}` : ""}
                        </Text>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </section>
          )}
        </Tabs.Panel>
      </Tabs>

      {form && (
        <ApplicationForm
          key={form.id}
          initial={form.initial}
          onClose={() => setForm(null)}
          onSave={saveForm}
          onDelete={() => deleteMut.mutate({ id: form.id })}
          busy={updateMut.isPending || deleteMut.isPending}
        />
      )}

      {docView && (
        <DocumentViewer doc={docView} onClose={() => setDocView(null)} />
      )}
    </div>
  );
}
