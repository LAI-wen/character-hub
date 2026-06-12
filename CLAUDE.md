<!-- VibeScope:standards:start -->

<!-- VibeScope:prompt-summary:start -->
## Project Rules Summary
- Node.js/Express: Use `os.tmpdir()` + unique suffix for all temp files; always clean up with `process.on('exit')` or equivalent trap
- Node.js/Express: Perform all async I/O before opening IDB transactions — never interleave network/file calls inside a transaction
- Node.js/Shell: Pass external data as positional arguments via `printf '%s'`, never interpolate into command strings
- Node.js/IDB: Always call `notifyChange(store)` after `tx.done` resolves, never before
- Node.js/IDB: Include `tx.done` inside `Promise.all([...ops, tx.done])` to wait for transaction commit
- Node.js/IDB: Normalise missing fields on read in `getX()` functions, not in render/consumer code
- Node.js/Express: Write to `.tmp` file then `rename()`/`os.replace()` atomically — never write directly to the final path
- Node.js/TypeScript: Define all shared types in `src/types/index.ts`; never redeclare inline in components or modules
- Node.js/Testing: Test only pure utility functions in unit tests; skip IDB mocking entirely
- Node.js/Logging: Use a single structured log function (e.g. `log_err`) that appends timestamp + text; never duplicate the pattern
<!-- VibeScope:prompt-summary:end -->

## Node.js File & Process Patterns

Always create temporary files with a unique suffix to prevent collisions from concurrent processes. Use `mktemp` in shell or `fs.mkdtemp`/`os.tmpdir()` in Node, and register cleanup at process exit:

```bash
TMPFILE=$(mktemp /tmp/vs-claude-err.XXXXXX) || exit 1
trap 'rm -f "$TMPFILE"' EXIT
```

```ts
import os from "os";
import path from "path";
import fs from "fs/promises";

const tmp = path.join(os.tmpdir(), `vs-work-${process.pid}-${Date.now()}`);
try { /* work */ } finally { await fs.rm(tmp, { force: true }); }
```

For file writes that must be atomic (e.g. queue output files), write to a `.tmp` sibling path then rename. A crash mid-write to the final path leaves a corrupt file; rename is atomic on POSIX:

```ts
await fs.writeFile(dest + ".tmp", JSON.stringify(payload));
await fs.rename(dest + ".tmp", dest); // atomic on same filesystem
```

Avoid fixed `/tmp/app-name` paths — concurrent invocations from multiple repos will overwrite each other's output.

Reference: https://nodejs.org/api/fs.html#fspromisesrenameooldpath-newpath

---

## Node.js/IDB Transaction Patterns

Open a transaction only after all network or file I/O is complete. An IDB transaction auto-closes when there are no pending IDB requests in the microtask queue — any `await fetch()` or `await fs.readFile()` in the middle will close it prematurely:

```ts
// CORRECT — fetch first, then open transaction
const data = await fetch("/api/sync").then(r => r.json());
const tx = db.transaction("items", "readwrite");
await Promise.all([
  tx.objectStore("items").put(data),
  tx.done,
]);
notifyChange("items");
```

Include `tx.done` inside the `Promise.all` array. This is the `idb` library's own recommended pattern — it resolves when the transaction commits, so you get a single await that covers both individual ops and the commit:

```ts
const tx = db.transaction(["a", "b"], "readwrite");
await Promise.all([
  tx.objectStore("a").delete(id),
  ...items.map(x => tx.objectStore("b").put(x)),
  tx.done,
]);
notifyChange("a");
notifyChange("b");
```

Never call `notifyChange` before the `Promise.all` resolves, and never call `idb` directly from components — route all DB access through `src/lib/db.ts`.

Reference: https://github.com/jakearchibald/idb

---

## Node.js Shell Hook Security

Pass commit messages, diffs, and other external data as positional arguments using `printf '%s'`, never by interpolating them into a command string. Shell interpolation allows an attacker-controlled value to inject arbitrary commands:

```bash
# CORRECT — data is a positional argument, never parsed as shell
printf '%s\n---\n%s' "$COMMIT_MSG" "$DIFF_CAPPED" | claude --print

# WRONG — $COMMIT_MSG could contain $(rm -rf /) or backticks
claude --print "analyze: $COMMIT_MSG"
```

Never use `eval` or dynamically construct shell commands from runtime data. Use a single named logging function for all structured output; duplicating the timestamp+append pattern across bash and Python sections creates divergent log formats and makes log parsing unreliable:

```bash
# Python section owns structured logging
log_err() { python3 -c "import sys; log_err_py(sys.argv[1])" "$1"; }
```

Reference: https://owasp.org/www-community/attacks/Command_Injection

---

## Node.js/TypeScript Type Discipline

Keep `src/types/index.ts` as the single source of truth for all shared types. Never redeclare the same shape inline in a component or utility — it creates silent drift when the canonical type changes:

```ts
// src/types/index.ts
export interface Session {
  id: string;
  status: "pending" | "done" | "error";
  nextSteps: string[]; // non-optional in type; may be absent at runtime from old data
}
```

Normalise missing fields at the data entry point (`getSession`, `putSession`), not in render code. This keeps components clean and ensures every consumer receives a fully-shaped object:

```ts
// db.ts — normalise on read
export async function getSession(id: string): Promise<Session | undefined> {
  const raw = await db.get("sessions", id);
  if (!raw) return undefined;
  return { nextSteps: [], ...raw }; // backfill fields absent in older records
}
```

Avoid `?? []` or `|| ""` defensive guards scattered across render — they are symptoms of unnormalised data leaking into the view layer.

Reference: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html

---

## References
- [Node.js fs.promises](https://nodejs.org/api/fs.html#file-system)
- [idb — Jake Archibald](https://github.com/jakearchibald/idb)
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [TypeScript Handbook — Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)

<!-- VibeScope:standards:end -->
