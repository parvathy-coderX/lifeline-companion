export interface TaskStep {
  title: string;
  description: string;
  durationMinutes: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO String
  importance: "high" | "low";
  urgency: "high" | "low";
  completed: boolean;
  duration: number; // in minutes
  matrixQuadrant?: "urgent-important" | "not-urgent-important" | "urgent-not-important" | "not-urgent-not-important";
  progress: number; // 0 to 100
  steps?: TaskStep[];
  tags?: string[];
  stressReduction?: number; // 1-100 estimate
  notes?: string;
  aiNotesSummary?: string;
  predictionAlert?: {
    isAtRisk: boolean;
    reason: string;
    suggestion: string;
  };
}

export interface Goal {
  id: string;
  title: string;
  targetDate: string;
  progress: number; // 0 to 100
  completed: boolean;
  category: "academic" | "professional" | "personal" | "health";
}

export interface Habit {
  id: string;
  title: string;
  streak: number;
  lastCompleted?: string; // YYYY-MM-DD
  completedDates: string[]; // List of completed dates YYYY-MM-DD
}

export interface HourlyActivity {
  time: string;
  activityTitle: string;
  durationMinutes: number;
  type: "deep-work" | "break" | "habit" | "calendar-event" | "routine";
  tip: string;
}

export interface DailyPlan {
  morningEncouragement: string;
  hourlySchedule: HourlyActivity[];
  predictedStressScore: number;
  generatedDate?: string; // YYYY-MM-DD
}

export interface Decision {
  id: string;
  question: string;
  pros: string[];
  cons: string[];
  recommendation: string;
  confidenceScore: number;
  priorityQuadrant: string;
  date: string;
}

export interface MeetingPrepData {
  eventTitle: string;
  agenda: string[];
  talkingPoints: string[];
  emailDraft: string;
  estimatedDuration: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  description?: string;
  location?: string;
  isSynced?: boolean;
}

export type WorkMood = "focused" | "tired" | "stressed" | "overwhelmed" | "creative" | "neutral";

export interface ProductivityInsights {
  tasksCompleted: number;
  tasksMissed: number;
  timeSavedMinutes: number;
  productivityScore: number;
  stressReductionIndex: number; // 1-100 scale
}
