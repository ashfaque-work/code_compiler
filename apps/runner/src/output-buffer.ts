import { Writable } from "node:stream";

/**
 * Accumulates stream output up to a hard byte ceiling.
 *
 * A program that prints in an infinite loop would otherwise exhaust the
 * runner's memory before its wall-clock timeout ever fired.
 */
export class OutputBuffer extends Writable {
  readonly #chunks: Buffer[] = [];
  #size = 0;
  #truncated = false;

  constructor(private readonly limitBytes: number) {
    super();
  }

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    const remaining = this.limitBytes - this.#size;

    if (remaining <= 0) {
      this.#truncated = true;
    } else if (chunk.length > remaining) {
      this.#chunks.push(chunk.subarray(0, remaining));
      this.#size = this.limitBytes;
      this.#truncated = true;
    } else {
      this.#chunks.push(chunk);
      this.#size += chunk.length;
    }

    // Always drain. Refusing the write would stall the container's output pipe.
    callback();
  }

  get truncated(): boolean {
    return this.#truncated;
  }

  override toString(): string {
    const text = Buffer.concat(this.#chunks).toString("utf8");
    return this.#truncated ? `${text}\n... output truncated` : text;
  }
}
