import type { LanguageId } from "@code-compiler/shared";

/** Absolute path, inside the container, of the bind-mounted job directory. */
export const SANDBOX_DIR = "/sandbox";

export interface CommandSpec {
  readonly command: string;
  readonly args: readonly string[];
}

export interface LanguageDefinition {
  readonly id: LanguageId;
  readonly displayName: string;
  /** Per-language image. One image per toolchain, not one shared kitchen sink. */
  readonly image: string;
  /** Filename written into the job directory before the container starts. */
  readonly sourceFile: string;
  /** Null for interpreted languages. */
  readonly compile: CommandSpec | null;
  readonly run: CommandSpec;
  /**
   * Environment for both phases. Toolchains that insist on a writable cache are
   * pointed at the tmpfs, since the container root filesystem is read-only.
   */
  readonly env: Readonly<Record<string, string>>;
  /** Shown in the editor when the language is selected. */
  readonly starterCode: string;
}
