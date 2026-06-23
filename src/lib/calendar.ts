import { type CalendarEvent } from "../types";

// Dynamic dates relative to now to make the experience look real out-of-the-box
const now = new Date();
const getRelativeISOString = (hoursOffset: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursOffset);
  d.setMinutes(0);
  return d.toISOString();
};

export const LOCAL_FALLBACK_EVENTS: CalendarEvent[] = [
  {
    id: "local-1",
    title: "⚡ Product Launch Prep",
    start: getRelativeISOString(-1),
    end: getRelativeISOString(0.5),
    description: "Weekly sync to coordinate marketing and development push.",
    location: "Zoom - Link in Invite"
  },
  {
    id: "local-2",
    title: "💡 Brainstorming Session",
    start: getRelativeISOString(3),
    end: getRelativeISOString(4),
    description: "AI architecture alignment and planning for the hackathon.",
    location: "Virtual HQ"
  },
  {
    id: "local-3",
    title: "🎓 Midterm Project Deliverable",
    start: getRelativeISOString(24),
    end: getRelativeISOString(25),
    description: "Submit final source code and documentation.",
    location: "Online Campus Portal"
  }
];

export async function fetchGoogleCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const timeMin = new Date();
  timeMin.setHours(0, 0, 0, 0); // Start of today

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin.toISOString()
  )}&singleEvents=true&orderBy=startTime&maxResults=15`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.summary || "Untitled Event",
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
      description: item.description || "",
      location: item.location || "",
      isSynced: true
    }));
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    throw error;
  }
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: Omit<CalendarEvent, "id">
): Promise<CalendarEvent> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  const body = {
    summary: event.title,
    description: event.description || "Created automatically by Project Lifeline",
    location: event.location || "",
    start: {
      dateTime: event.start
    },
    end: {
      dateTime: event.end
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      title: data.summary,
      start: data.start?.dateTime || "",
      end: data.end?.dateTime || "",
      description: data.description || "",
      location: data.location || "",
      isSynced: true
    };
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
    throw error;
  }
}
