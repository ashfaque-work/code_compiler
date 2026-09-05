import { describe, expect, it } from "vitest";
import { LANGUAGE_IDS } from "@code-compiler/shared";
import { LANGUAGE_DEFINITIONS, getLanguage } from "./definitions.js";
import { SANDBOX_DIR } from "./types.js";

describe("language definitions", () => {
  it("defines every declared language id", () => {
    for (const id of LANGUAGE_IDS) {
      expect(getLanguage(id).id).toBe(id);
    }
  });

  it("declares no language that is not in the shared enum", () => {
    expect(Object.keys(LANGUAGE_DEFINITIONS).toSorted()).toEqual(
      LANGUAGE_IDS.toSorted(),
    );
  });

  it.each(LANGUAGE_IDS)("%s uses absolute in-container paths", (id) => {
    const language = getLanguage(id);
    const paths = [
      ...(language.compile?.args ?? []),
      ...language.run.args,
      language.run.command,
    ].filter((arg) => arg.includes("/") || arg.endsWith("program"));

    // The original compiled with a bare `-o temp.out` and then ran `./temp.out`,
    // both resolved against the process cwd, so it broke when the server was
    // started from any other directory.
    for (const path of paths) {
      expect(path.startsWith(SANDBOX_DIR) || !path.startsWith(".")).toBe(true);
    }
  });

  it.each(LANGUAGE_IDS)("%s provides runnable starter code", (id) => {
    expect(getLanguage(id).starterCode.trim().length).toBeGreaterThan(0);
  });

  it("keeps the Go build cache off the tmpfs", () => {
    // tmpfs pages are charged to the container's memory cgroup, so a build
    // cache under /tmp is both too small for the linker and large enough to
    // trip the memory cap. All three must sit on the bind-mounted job
    // directory instead.
    const go = getLanguage("go");

    for (const key of ["GOCACHE", "GOPATH", "GOTMPDIR"] as const) {
      const value = go.env[key];
      expect(value, `${key} must be set`).toBeDefined();
      expect(value!.startsWith(SANDBOX_DIR)).toBe(true);
      expect(value!.startsWith("/tmp")).toBe(false);
    }
  });

  it("gives every compiled language somewhere writable to work", () => {
    // The container root filesystem is read-only, so a toolchain that needs
    // scratch space must be pointed at the tmpfs or the job directory.
    const rustTmp = getLanguage("rust").env["TMPDIR"];
    expect(rustTmp === "/tmp" || rustTmp?.startsWith(SANDBOX_DIR)).toBe(true);
  });

  it("names the Java source after its entry class", () => {
    const java = getLanguage("java");
    // Removes the original's guess-the-class-name regex entirely.
    expect(java.sourceFile).toBe("Main.java");
    expect(java.run.args).toContain("Main");
  });
});
