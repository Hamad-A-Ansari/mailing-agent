import { z } from "zod";
import type {
  CreateAssistantDTO,
  CreateApiRequestToolDTO,
  CreateEndCallToolDTO,
} from "@vapi-ai/web/dist/api";

// Widen the SDK type to include static parameters
type ApiRequestToolWithStaticParams = CreateApiRequestToolDTO & {
  parameters?: { key: string; value: unknown }[];
};

// Tech name → devicon slug mappings
export const techMappings: Record<string, string> = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  angular: "angular",
  nestjs: "nestjs",
  graphql: "graphql",
  webpack: "webpack",
  babel: "babel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  redis: "redis",
  jest: "jest",
  cypress: "cypress",
  python: "python",
  java: "java",
  go: "go",
  rust: "rust",
  swift: "swift",
  kotlin: "kotlin",
  dart: "dart",
  flutter: "flutter",
  django: "django",
  flask: "flask",
  spring: "spring",
  laravel: "laravel",
  php: "php",
  ruby: "ruby",
  rails: "rails",
  csharp: "csharp",
  "c#": "csharp",
  dotnet: "dot-net",
  ".net": "dot-net",
};

// Interview cover images are no longer used — we use Google Favicons (company)
// or UI Avatars (role fallback) dynamically. See interview-card.tsx.

// Feedback schema for Groq structured output
export const feedbackSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Communication Skills"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Technical Knowledge"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Problem Solving"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Cultural Fit"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Confidence and Clarity"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

// Vapi Interviewer Assistant config
export const interviewer: CreateAssistantDTO = {
  name: "Interviewer",
  firstMessage:
    "Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

Interview Guidelines:
Follow the structured question flow:
{{questions}}

Engage naturally & react appropriately:
Listen actively to responses and acknowledge them before moving forward.
Ask brief follow-up questions if a response is vague or requires more detail.
Keep the conversation flowing smoothly while maintaining control.
Be professional, yet warm and welcoming:

Use official yet friendly language.
Keep responses concise and to the point (like in a real voice interview).
Avoid robotic phrasing—sound natural and conversational.
Answer the candidate's questions professionally:

If asked about the role, company, or expectations, provide a clear and relevant answer.
If unsure, redirect the candidate to HR for more details.

Conclude the interview properly:
Thank the candidate for their time.
Inform them that the company will reach out soon with feedback.
End the conversation on a polite and positive note.

- Be sure to be professional and polite.
- Keep all your responses short and simple. Use official language, but be kind and welcoming.
- This is a voice conversation, so keep your responses short, like in a real conversation. Don't ramble for too long.`,
      },
    ],
  },
};

// Vapi Generator Assistant config (collects info → generates questions)
const generateInterviewTool: ApiRequestToolWithStaticParams = {
  type: "apiRequest",
  method: "POST",
  name: "getUserData",
  description:
    "Sends the collected interview preferences to the app to generate the interview questions.",
  url:
    process.env.NEXT_PUBLIC_VAPI_GENERATE_URL ??
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/vapi/generate`,
  body: {
    type: "object",
    required: ["role", "type", "level", "amount", "techstack"],
    properties: {
      role: {
        type: "string",
        description: "What role would you like to train for?",
      },
      company: {
        type: "string",
        description: "Which company are you targeting or preparing for?",
      },
      type: {
        type: "string",
        description:
          "Are you aiming for a technical, behavioral or mixed interview?",
      },
      level: {
        type: "string",
        description: "The job experience level.",
      },
      techstack: {
        type: "string",
        description: "List of technologies to cover during the job interview.",
      },
      amount: {
        type: "number",
        description: "How many questions would you like prepared?",
      },
    },
  },
  parameters: [{ key: "userid", value: "{{ userid }}" }],
  messages: [
    {
      type: "request-start",
      content:
        "Please hold on, while I am sending a request to the app for Generating the Interview.",
      blocking: true,
    },
    {
      role: "assistant",
      type: "request-complete",
      content:
        "The request has been sent and your interview has been generated. Thank you for the call! Bye, Bye!",
      endCallAfterSpokenEnabled: true,
    },
    {
      type: "request-failed",
      content:
        "Oops! Looks like something went wrong when sending the data to the app! Please try again.",
      endCallAfterSpokenEnabled: true,
    },
  ],
};

const endCallTool: CreateEndCallToolDTO = {
  type: "endCall",
  messages: [
    {
      type: "request-start",
      content:
        "Everything has been generated. I'll redirect you to the dashboard now, thanks for the call!!",
      blocking: true,
    },
  ],
};

export const generator: CreateAssistantDTO = {
  name: "ha_interview_generation",
  firstMessage:
    "Hi! I'll get some information from you to create the perfect interview.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
  },
  model: {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 250,
    tools: [generateInterviewTool, endCallTool],
    messages: [
      {
        role: "system",
        content: `You are a voice assistant helping create a new AI interviewer. Your task is to collect the following data from the user, one question at a time, and wait for their answer before moving to the next:
- role: What role would you like to train for?
- company: Which company are you targeting or preparing for? (optional, they can say "no specific company")
- type: Are you aiming for a technical, behavioral or mixed interview?
- level: The job experience level.
- techstack: List of technologies to cover during the job interview.
- amount: How many questions would you like prepared?

Once all fields have been collected, call the getUserData function with the collected values. If the user doesn't have a specific company, pass an empty string for company. After the app confirms the interview was generated (or if it fails), use the endCall function to end the call.

Remember that this is a voice conversation - do not use any special characters.`,
      },
    ],
  },
};
