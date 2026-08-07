/**
 * Seed script: Downloads LeetCode problems from the neenza/leetcode-problems
 * GitHub repo and inserts them into the Supabase coding_problems table.
 *
 * Usage:
 *   npx tsx scripts/seed-problems.ts
 *
 * Prerequisites:
 *   - Run migration 012_coding_problems.sql first
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Polyfill WebSocket for Node.js < 22
import WebSocket from "ws";
(globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;

// Load env from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATASET_URL =
  "https://raw.githubusercontent.com/neenza/leetcode-problems/master/merged_problems.json";

interface RawProblem {
  title: string;
  problem_id: string;
  frontend_id: string;
  difficulty: string;
  problem_slug: string;
  topics?: string[];
  description: string;
  examples?: Array<{ example_num: number; example_text: string; images?: string[] }>;
  constraints?: string[];
  follow_ups?: string[];
  hints?: string[];
  code_snippets?: Record<string, string>;
  solutions?: string;
}

async function main() {
  console.log("📥 Downloading LeetCode problems dataset...");
  console.log("   (This is ~50MB, may take a moment)");

  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    console.error(`Failed to fetch dataset: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const raw = await response.json();
  
  // Debug: check the actual structure
  const rawType = typeof raw;
  const isArray = Array.isArray(raw);
  console.log(`  Data type: ${rawType}, isArray: ${isArray}`);
  if (!isArray && rawType === "object") {
    const keys = Object.keys(raw);
    console.log(`  Object keys (first 5): ${keys.slice(0, 5).join(", ")}`);
    console.log(`  Total keys: ${keys.length}`);
    // Check if first value looks like a problem
    const firstVal = raw[keys[0]];
    console.log(`  First value keys: ${Object.keys(firstVal || {}).slice(0, 8).join(", ")}`);
  }

  // Handle both array format and object-wrapped format
  let problems: RawProblem[];
  if (Array.isArray(raw)) {
    problems = raw;
  } else if (raw.problems && Array.isArray(raw.problems)) {
    problems = raw.problems;
  } else if (typeof raw === "object" && raw !== null) {
    // Object keyed by something — check if values have "title" property
    const values = Object.values(raw) as RawProblem[];
    if (values.length > 0 && values[0]?.title) {
      problems = values;
    } else {
      // Maybe it's a single nested structure
      problems = Object.values(raw).flat() as RawProblem[];
    }
  } else {
    problems = [];
  }
  console.log(`✓ Downloaded ${problems.length} problems`);

  // Filter to only problems with descriptions and valid difficulty
  const validProblems = problems.filter(
    (p) =>
      p.description &&
      p.description.trim().length > 0 &&
      ["Easy", "Medium", "Hard"].includes(p.difficulty)
  );
  console.log(`✓ ${validProblems.length} valid problems (with descriptions)`);

  // Process in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < validProblems.length; i += BATCH_SIZE) {
    const batch = validProblems.slice(i, i + BATCH_SIZE);

    const rows = batch.map((p) => ({
      leetcode_id: p.frontend_id || p.problem_id,
      title: p.title,
      slug: p.problem_slug,
      difficulty: p.difficulty,
      topics: p.topics || [],
      description: p.description,
      examples: p.examples || [],
      constraints: p.constraints || [],
      hints: p.hints || [],
      code_snippets: p.code_snippets || {},
      company_tags: [], // Can be enriched later with company data
    }));

    const { error, count } = await supabase
      .from("coding_problems")
      .upsert(rows, { onConflict: "leetcode_id", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`  ✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      skipped += batch.length;
    } else {
      inserted += batch.length;
    }

    // Progress
    const progress = Math.min(100, Math.round(((i + batch.length) / validProblems.length) * 100));
    process.stdout.write(`\r  Seeding... ${progress}% (${inserted} inserted, ${skipped} skipped)`);
  }

  console.log(`\n\n✅ Done! Seeded ${inserted} problems into coding_problems table.`);
  if (skipped > 0) {
    console.log(`⚠  ${skipped} problems skipped due to errors (likely duplicates).`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
