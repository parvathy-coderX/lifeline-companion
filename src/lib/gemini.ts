import { type Task, type Habit, type CalendarEvent, type DailyPlan, type Decision, type MeetingPrepData, type WorkMood } from "../types";

async function postToApi<T>(endpoint: string, body: any): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error calling ${endpoint}`);
  }
  return res.json() as Promise<T>;
}

export async function aiPrioritizeTasks(tasks: Task[]): Promise<{
  nextTaskSuggestion: { taskId: string; motivation: string };
  prioritizedTasks: { taskId: string; matrixQuadrant: Task["matrixQuadrant"]; estimatedStressReduction: number }[];
}> {
  return postToApi("/api/gemini/task-prioritize", { tasks });
}

export async function aiBreakTask(taskTitle: string, taskDescription?: string): Promise<{
  icebreaker: string;
  steps: { title: string; description: string; durationMinutes: number }[];
}> {
  return postToApi("/api/gemini/break-task", { taskTitle, taskDescription });
}

export async function aiPlanDay(
  tasks: Task[],
  calendarEvents: CalendarEvent[],
  habits: Habit[],
  currentMood: WorkMood
): Promise<DailyPlan> {
  return postToApi("/api/gemini/plan-day", { tasks, calendarEvents, habits, currentMood });
}

export async function aiGetProcrastinationHelp(
  avoidedTask: Task,
  mood: WorkMood
): Promise<{
  psychologicalInsight: string;
  microAction: string;
  motivationQuote: string;
  playlistSuggestion: string;
}> {
  return postToApi("/api/gemini/procrastination-help", { avoidedTask, mood });
}

export async function aiAnalyzeDecision(decision: string): Promise<Decision> {
  const data = await postToApi<Omit<Decision, "id" | "date">>("/api/gemini/decision-maker", { decision });
  return {
    ...data,
    id: Math.random().toString(36).substring(7),
    question: decision,
    date: new Date().toLocaleDateString()
  };
}

export async function aiSummarizeNotes(notes: string): Promise<{
  summary: string;
  actionItems: string[];
  tags: string[];
}> {
  return postToApi("/api/gemini/note-summary", { notes });
}

export async function aiPrepareMeeting(eventTitle: string, eventDescription?: string): Promise<MeetingPrepData> {
  const data = await postToApi<Omit<MeetingPrepData, "eventTitle">>("/api/gemini/meeting-prep", {
    eventTitle,
    eventDescription
  });
  return {
    ...data,
    eventTitle
  };
}

export async function aiParseVoiceTask(text: string): Promise<{
  title: string;
  description: string;
  dueDate: string;
  importance: "high" | "low";
  urgency: "high" | "low";
  duration: number;
}> {
  return postToApi("/api/gemini/parse-voice-task", { text });
}
