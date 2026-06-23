import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Firebase Config endpoint
app.get("/api/firebase-config", (req, res) => {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      return res.json(JSON.parse(content));
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to read Firebase config", details: err.message });
    }
  }
  // Return null if not yet created so the client can handle this gracefully
  return res.json(null);
});

// 2. AI suggestion & Eisenhower Matrix auto-sorting
app.post("/api/gemini/task-prioritize", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Tasks array is required" });
    }

    const ai = getGemini();
    const prompt = `You are the core prioritization engine of "Project Lifeline" (The Last-Minute Life Saver productivity app).
Analyze these tasks and return the following as JSON:
1. "nextTaskSuggestion": ID of the task the user should tackle next, with a short, compelling 1-sentence motivation of why (referencing urgency/importance).
2. "prioritizedTasks": An array of objects containing the taskId and its suggested "matrixQuadrant" ("urgent-important", "not-urgent-important", "urgent-not-important", "not-urgent-not-important") and an "estimatedStressReduction" value (1-100 score).

Here is the task list:
${JSON.stringify(tasks, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nextTaskSuggestion: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.STRING, description: "ID of the suggested task" },
                motivation: { type: Type.STRING, description: "Compassionate, high-impact 1-sentence motivation" }
              },
              required: ["taskId", "motivation"]
            },
            prioritizedTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  matrixQuadrant: { type: Type.STRING, description: "One of the 4 Eisenhower Quadrants" },
                  estimatedStressReduction: { type: Type.INTEGER, description: "Potential stress relief on completion (1-100)" }
                },
                required: ["taskId", "matrixQuadrant", "estimatedStressReduction"]
              }
            }
          },
          required: ["nextTaskSuggestion", "prioritizedTasks"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Prioritize Tasks Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Break large tasks into steps (Procrastination "Break the Ice")
app.post("/api/gemini/break-task", async (req, res) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const ai = getGemini();
    const prompt = `The user is struggling to start the task: "${taskTitle}". Description: "${taskDescription || "None"}".
Help them "break the ice" by creating a low-friction, small-step action plan.
Suggest exactly 3 to 5 small, non-intimidating steps.
Make the very first step absurdly simple (e.g. "Open your notebook and write down the title" or "Search for the file on your desktop") to bypass resistance.
Each step should have an estimated duration in minutes.
Return a JSON object with:
1. "icebreaker": A short 1-sentence encouragement.
2. "steps": An array of objects with "title", "description", and "durationMinutes".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            icebreaker: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER }
                },
                required: ["title", "description", "durationMinutes"]
              }
            }
          },
          required: ["icebreaker", "steps"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Break Task Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. "Plan My Day" morning agent planner
app.post("/api/gemini/plan-day", async (req, res) => {
  try {
    const { tasks, calendarEvents, habits, currentMood } = req.body;

    const ai = getGemini();
    const prompt = `You are the Daily Planning Coordinator of "Project Lifeline".
Construct an hour-by-hour dynamic daily plan for today, starting from 8:00 AM to 8:00 PM.
You should integrate the tasks that are most urgent/important, avoid conflicts with calendar events, schedule habit blocks, and insert optimal breaks/downtime tailored to the user's current mood (${currentMood || "neutral"}).
If the user is feeling stressed, schedule more breaks. If highly focused, schedule solid deep work blocks.
Return a JSON object containing:
1. "morningEncouragement": A supportive morning welcome message (1-2 sentences).
2. "hourlySchedule": An array of objects, each containing "time" (e.g., "09:00 AM"), "activityTitle", "durationMinutes", "type" ("deep-work", "break", "habit", "calendar-event", "routine"), and a short "tip" (quick strategy for success).
3. "predictedStressScore": An estimated user stress score (1-100) at the end of this day if they stick to the plan.

Input Data:
Tasks: ${JSON.stringify(tasks || [])}
Calendar Events: ${JSON.stringify(calendarEvents || [])}
Habits: ${JSON.stringify(habits || [])}
Current Mood: ${currentMood || "neutral"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            morningEncouragement: { type: Type.STRING },
            hourlySchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  activityTitle: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                  type: { type: Type.STRING, description: "deep-work, break, habit, calendar-event, or routine" },
                  tip: { type: Type.STRING }
                },
                required: ["time", "activityTitle", "durationMinutes", "type", "tip"]
              }
            },
            predictedStressScore: { type: Type.INTEGER }
          },
          required: ["morningEncouragement", "hourlySchedule", "predictedStressScore"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Plan Day Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Procrastination Intervention
app.post("/api/gemini/procrastination-help", async (req, res) => {
  try {
    const { avoidedTask, mood } = req.body;
    if (!avoidedTask) {
      return res.status(400).json({ error: "Avoided task is required" });
    }

    const ai = getGemini();
    const prompt = `The user is procrastinating on: "${avoidedTask.title}".
Their self-reported mood is: "${mood || "overwhelmed"}".
Provide a psychological intervention designed to bypass perfectionism or anxiety.
Return a JSON object containing:
1. "psychologicalInsight": 1-2 sentences explaining why they might be avoiding this task (compassionate, validating tone).
2. "microAction": A concrete task they can do in under 2 minutes (e.g. "Just format the document header" or "Write down three bad ideas").
3. "motivationQuote": A highly engaging, bold, motivational prompt or quote.
4. "playlistSuggestion": A genre/concept suggestion for focus (e.g. "Binaural Beats for Cognitive Flow", "Lofi Rain Beats", "Synthwave Drive").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            psychologicalInsight: { type: Type.STRING },
            microAction: { type: Type.STRING },
            motivationQuote: { type: Type.STRING },
            playlistSuggestion: { type: Type.STRING }
          },
          required: ["psychologicalInsight", "microAction", "motivationQuote", "playlistSuggestion"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Procrastination Help Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Decision Maker Tool (Pros/Cons)
app.post("/api/gemini/decision-maker", async (req, res) => {
  try {
    const { decision } = req.body;
    if (!decision) {
      return res.status(400).json({ error: "Decision statement is required" });
    }

    const ai = getGemini();
    const prompt = `Help the user analyze the decision: "${decision}".
Provide an objective Pros and Cons analysis and a final AI recommendation with a confidence percentage.
Return a JSON object containing:
1. "pros": Array of strings (3 items).
2. "cons": Array of strings (3 items).
3. "recommendation": A detailed recommendation (2 sentences).
4. "confidenceScore": Integer between 1 and 100 representing recommendation confidence.
5. "priorityQuadrant": String suggesting where this decision fits (e.g. "High Impact / Low Effort", "High Impact / High Effort", "Low Impact / Low Effort").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
            priorityQuadrant: { type: Type.STRING }
          },
          required: ["pros", "cons", "recommendation", "confidenceScore", "priorityQuadrant"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Decision Maker Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Smart Note-Taking (Summaries & Auto-Tagging)
app.post("/api/gemini/note-summary", async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) {
      return res.status(400).json({ error: "Notes content is required" });
    }

    const ai = getGemini();
    const prompt = `Summarize these raw task notes or thoughts and suggest auto-tags:
Notes: "${notes}"
Return a JSON object containing:
1. "summary": A concise bulleted summary of key points (in markdown/text format).
2. "actionItems": Array of identified action items.
3. "tags": Array of 3-4 suggested single-word tags.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "actionItems", "tags"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Note Summary Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Smart Meeting Prep
app.post("/api/gemini/meeting-prep", async (req, res) => {
  try {
    const { eventTitle, eventDescription } = req.body;
    if (!eventTitle) {
      return res.status(400).json({ error: "Event title is required" });
    }

    const ai = getGemini();
    const prompt = `You are the executive prep agent for "Project Lifeline".
The user has a meeting coming up on their calendar: "${eventTitle}".
Description/Context: "${eventDescription || "No detailed description provided"}".
Generate structured, hyper-useful preparation notes to ensure they walk in fully confident and prepared.
Return a JSON object containing:
1. "agenda": Array of suggested agenda items (3-4 items).
2. "talkingPoints": Array of critical speaking/talking points or questions the user should ask (3 items).
3. "emailDraft": A professional follow-up or pre-meeting brief email template ready to copy-paste.
4. "estimatedDuration": An estimated review/prep duration in minutes.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            agenda: { type: Type.ARRAY, items: { type: Type.STRING } },
            talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            emailDraft: { type: Type.STRING, description: "Copypastable pre/post email template" },
            estimatedDuration: { type: Type.INTEGER }
          },
          required: ["agenda", "talkingPoints", "emailDraft", "estimatedDuration"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Meeting Prep Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Natural Voice Command Task Parser (Voice Assistant)
app.post("/api/gemini/parse-voice-task", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Transcribed text is required" });
    }

    const ai = getGemini();
    const prompt = `A user spoke a natural language command to add a task.
Command: "${text}"
Current Date/Time reference: ${new Date().toISOString()} (User local: ${new Date().toLocaleString()})
Parse this command and return a structured JSON task object containing:
1. "title": A clean, concise title of the task.
2. "description": Any extra detail or description, or empty string.
3. "dueDate": Estimated ISO 8601 string of when it's due (default to 24 hours from now if not specified).
4. "importance": "high" or "low" (estimate based on tone/words).
5. "urgency": "high" or "low" (estimate based on time/deadline words).
6. "duration": Estimated duration in minutes to complete.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            dueDate: { type: Type.STRING },
            importance: { type: Type.STRING },
            urgency: { type: Type.STRING },
            duration: { type: Type.INTEGER }
          },
          required: ["title", "description", "dueDate", "importance", "urgency", "duration"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Voice Task Parse Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 10. AI Brain Dump Task Organizer
app.post("/api/gemini/brain-dump", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Brain dump text is required" });
    }

    const ai = getGemini();
    const prompt = `A user has provided a disorganized "brain dump" text consisting of multiple tasks, ideas, or reminders they need to get out of their head.
Brain Dump: "${text}"
Current Reference Date: ${new Date().toISOString()} (User local: ${new Date().toLocaleString()})

Analyze this text, filter out noise, extract the actionable tasks, and organize them into structured objects.
For each extracted task, estimate its importance ("high" or "low"), urgency ("high" or "low"), and estimated duration in minutes to complete.
Also guess an appropriate title and write a helpful short description.

Return a JSON object containing:
1. "encouragement": A supportive 1-sentence message (e.g. "We've sorted your brain dump. You got this!").
2. "tasks": An array of organized task objects, each containing:
   - "title": Clean, concise title
   - "description": Extra context or details
   - "importance": "high" or "low"
   - "urgency": "high" or "low"
   - "duration": Estimated duration in minutes (integer)
   - "dueDate": An estimated ISO 8601 string or a date string representing when it should be done based on text (or default to 1 day from now if not mentioned)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            encouragement: { type: Type.STRING },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  importance: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                  duration: { type: Type.INTEGER },
                  dueDate: { type: Type.STRING }
                },
                required: ["title", "description", "importance", "urgency", "duration", "dueDate"]
              }
            }
          },
          required: ["encouragement", "tasks"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Brain Dump Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 11. AI Weekly Review Generator
app.post("/api/gemini/weekly-review", async (req, res) => {
  try {
    const { completedTasks, habits, goals } = req.body;

    const ai = getGemini();
    const prompt = `You are the Personal Growth Coach of "Project Lifeline".
Analyze the user's completed achievements and stats for this week and write a concise, highly encouraging, and insightful review report.

Completed Tasks: ${JSON.stringify(completedTasks || [])}
Habits tracked: ${JSON.stringify(habits || [])}
Goals active: ${JSON.stringify(goals || [])}

Return a JSON object containing:
1. "summary": A warm, inspiring 3-sentence summary of their accomplishment.
2. "strengths": Array of 3 short bullet points celebrating specific positive behavior or consistency patterns.
3. "recommendation": A detailed recommendation for maintaining focus and reducing stress next week (1-2 sentences).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING }
          },
          required: ["summary", "strengths", "recommendation"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Weekly Review Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite Setup for Development and static build for Production
if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fallback index.html route for SPA routing
    app.use("*", (req, res, next) => {
      const htmlPath = path.join(process.cwd(), "index.html");
      fs.readFile(htmlPath, "utf-8", (err, data) => {
        if (err) return next(err);
        vite.transformIndexHtml(req.originalUrl, data)
          .then((html) => res.status(200).set({ "Content-Type": "text/html" }).end(html))
          .catch(next);
      });
    });
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  // Static route for serving config if exists inside build
  app.get("/firebase-applet-config.json", (req, res) => {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      res.sendFile(configPath);
    } else {
      res.status(404).json({ error: "Not configured yet" });
    }
  });

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Project Lifeline] Full-stack server running on http://localhost:${PORT}`);
});
