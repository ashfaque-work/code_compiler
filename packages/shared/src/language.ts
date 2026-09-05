import { z } from "zod";

/**
 * Six toolchains, supported properly.
 *
 * The original claimed twelve; half were never exercised and C#, Dart, PHP and
 * Ruby together carried roughly 3 GB of image weight.
 */
export const LanguageIdSchema = z.enum([
  "python",
  "javascript",
  "typescript",
  "cpp",
  "java",
  "go",
  "rust",
]);

export type LanguageId = z.infer<typeof LanguageIdSchema>;

export const LANGUAGE_IDS = LanguageIdSchema.options;

export const LANGUAGE_DISPLAY_NAMES: Record<LanguageId, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  cpp: "C++",
  java: "Java",
  go: "Go",
  rust: "Rust",
};
