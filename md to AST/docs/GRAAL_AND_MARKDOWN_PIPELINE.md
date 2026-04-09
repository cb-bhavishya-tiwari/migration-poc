# GraalVM, your Java app, and the Markdown → AST pipeline

This document explains **why** running our Node/npm-based migration script inside the Java server is confusing, **what Graal actually is**, **how your team uses it today**, and **what you need to do** to connect the two worlds.

---

## 1. The problem

### What we built in this POC

The `md to AST` folder is a **Node.js** program:

- It uses **npm packages** (`unified`, `remark-parse`, `remark-gfm`, etc.) installed under `node_modules`.
- You run it with **`node migrate.js`**, which reads files from disk (`input/sample-input.json`) and writes JSON to `output/`.
- The code uses **ES modules** (`import` / `export`) and **Node built-ins** (`node:fs/promises`, `node:path`, `node:module` for `createRequire` with `@emoji-mart/data`).

That model assumes a **normal Node.js runtime** on a machine with `npm install` already done.

### What you want

You want this **markdown → AST** logic to run **inside the Java application** that your team ships—where **Graal** is involved—not as a separate `node` process you SSH to.

### Why that feels like a mismatch

- **Java** does not “run npm” or load `node_modules` the same way `node migrate.js` does.
- The **Graal** integration in your **other repo** is **not** “run any Node script from npm.” It is a **different** way of executing JavaScript.

So the “problem” is: **our POC is written for Node; the server runs JavaScript through Graal in a different shape.** We have to **bridge** those two, not assume they are identical.

---

## 2. What Graal actually is (in plain terms)

### GraalVM

**GraalVM** is a JDK distribution that can run **Java** and also **other languages** (JavaScript, Python, Ruby, etc.) on the same JVM, using the **Graal compiler** and **Truffle** language implementations.

For **JavaScript**, the important piece is **GraalJS**—a JavaScript engine that runs **inside the JVM**, implemented with Truffle.

### Polyglot API

Graal provides **`org.graalvm.polyglot`**: from Java you can create a **`Context`**, load **JavaScript source**, and **`eval`** it. That is **embedded** JavaScript—not necessarily “Node.”

### GraalVM “Node” vs embedded JS

| Idea | What it means |
|------|----------------|
| **Node.js (normal)** | Standalone program: `node script.js`, reads `node_modules`, has `fs`, `require`, npm ecosystem as you know it. |
| **GraalVM Node** | Graal can ship a **Node-compatible** launcher in some setups—still a separate concept from “Java calls JS.” |
| **Embedded Graal JS** | Java holds a **`Context`**, loads **one or more JS strings/files**, runs `eval`. No automatic `node_modules` unless **you** add tooling. |

Your **other repo** uses **embedded Graal JS** (Polyglot `Context`), **not** “run `node migrate.js` on the server.”

### One sentence summary

**Graal here means: “Java runs a JavaScript engine on the JVM and executes JS you give it”—not “Java runs full Node with npm.”**

---

## 3. How Graal is used currently (your other repo)

This section reflects the **report from your Java repo** (GraalVM **25.0.2**, Polyglot, webpack bundle). Adjust names/paths if your tree differs slightly.

### Versions

- **GraalVM / JS stack (Maven):** `org.graalvm.polyglot:polyglot` and `org.graalvm.polyglot:js` at version **25.0.2** (managed in root `pom.xml`).
- **Node v24 + pnpm** in the same monorepo are for **frontend/webpack builds**, **not** for executing server-side JS as GraalVM Node.

### Runtime mechanism

- Java code (e.g. **`BrightbackExpression`**) builds an **`Engine`** and **`Context`** for **`"js"`**.
- It loads **one JavaScript file** from the **classpath** (a URL resource)—e.g. a file produced by **Webpack** into something like `assets/webpack/BrightbackExpression.js`.
- That file is a **single bundle**: webpack has already merged many small modules into one script (IIFE / `__webpack_require__` style).
- Java then **`eval`**s glue code and calls an exported **entry function** (e.g. something like `process(...)`) with arguments from Java.

### Important details

- **`process` in that JS is not Node’s `process` object**—your Java code may assign `var process = ...` to your own function. So libraries that expect **Node’s `process.env`**, etc., can break unless you adapt them.
- **No `node_modules` at runtime** for that Graal-loaded script: dependencies are **inside the bundle**.
- **Target** for that bundle is effectively **browser-like** (`target: 'web'` in webpack config was mentioned)—not “Node server.”

So today’s pattern is: **build one fat JS file with Webpack → put it on the classpath → Graal loads and runs it.**

---

## 4. Can we solve the problem with the current setup? What must change?

### Can you run `migrate.js` + `node_modules` **unchanged** inside **current** Graal embedding?

**No—not as-is.** Reasons:

1. **No Node module loader** in that embedding path: Graal does not automatically resolve `import 'remark-parse'` from a `node_modules` folder on disk.
2. **`migrate.js` uses Node APIs** (`readFile`, `writeFile`, `argv`)—your Java app would need to **pass strings in/out** instead, or you keep CLI-only for dev.
3. **`createRequire` + `@emoji-mart/data`** assumes Node-style `require`; the embedded bundle must either **inline** that data or **import** it in a way the **bundler** understands.

### Can you solve it **without** changing Graal to “full Node”?

**Yes.** The same pattern as **BrightbackExpression**:

| Piece | POC today | What you need for Graal (current Java style) |
|-------|-----------|-----------------------------------------------|
| Dependencies | `npm install`, `import` from `node_modules` | **Bundle** everything into **one JS file** (Webpack, esbuild, Rollup, etc.) |
| Entry | `node migrate.js` | **One exported function**, e.g. `migrateMarkdownToAst(input)` → JSON string |
| I/O | Read/write files | Java reads DB / file, passes **string** to JS; JS returns **string** |
| Emoji data | `createRequire('@emoji-mart/data')` | Bundle JSON or use **static import** of data; verify with your bundler |

### Optional alternative (usually a bigger org decision)

- Run **GraalVM’s Node** or a **separate Node service** for this job—then you could keep `migrate.js` closer to today’s shape. **That is not what your current Java integration does**, so it would be **new** infrastructure, not “use what we have.”

### Summary

- **With the current Graal setup (Polyglot + classpath bundle):** you **can** run the **same logical pipeline** (unified + remark + your tooltip plugin + preprocessing), but you must **package it like BrightbackExpression**: **bundled script + clear Java ↔ JS contract**.
- **Changes needed:** a **build step** that produces **one** JS artifact, a **small API surface** (function in / JSON out), and **removing or adapting** Node-only assumptions (`fs`, CLI, `createRequire`).

---

## 5. Is this a good approach?

**Yes — for embedded Graal + unified/remark, this is a solid, standard approach.**

### Why it works well

- You keep using **real parsers** (unified / remark) instead of hand-rolling Markdown.
- **Same pipeline logic** in development (Node) and in production (bundled): validate once, bundle once.
- It matches how your **Java repo already runs JS** — one Webpack-style bundle on the classpath.
- You avoid a **separate Node process** or shipping **`node_modules`** beside the JVM.

### Tradeoffs (normal, not deal-breakers)

- **Build step:** someone must run the bundler when entry code or dependencies change.
- **Bundle size / startup:** remark pulls in a meaningful amount of JS; usually fine on the server, but worth measuring if you care.
- **No Node inside the bundle:** avoid relying on `fs`, real Node `process`, or dynamic `require` unless you polyfill or refactor — **JSON string in, JSON string out** fits this model.

### Alternatives (only if requirements change)

- **GraalVM Node** or embedding full Node — heavier operationally.
- **Separate Node microservice** — extra network and ops.

For **Polyglot `Context` + classpath script** (your current style), **develop with Node, bundle for Graal** is the usual fit.

---

## 6. How to start this work

### Step A — Agree on the contract (half a page)

Define:

- **Input:** e.g. raw markdown `string` (or `{ markdownString: "..." }` JSON string).
- **Output:** e.g. JSON string of `{ meta?, ast }` or just the `ast` object serialized to string.
- **Where it runs:** only inside JVM via Graal (no file paths in JS).

### Step B — Extract a library-style entry (in this POC)

- Add a function, conceptually: **`runMigration(markdownString) → object`** with the same steps as `migrate.js` (preprocess → parse → validate), **without** `readFile`/`writeFile` in the hot path.
- Keep CLI `migrate.js` as a thin wrapper that reads JSON from disk and calls `runMigration` for local testing.

### Step C — Choose a bundler and prove one bundle

- **esbuild** or **Rollup** or **Webpack** (match the other repo if you want consistency).
- Configure **platform** / **target** for a **non-Node** or **neutral** bundle that Graal can load (avoid relying on Node `fs`; polyfill or omit).
- Verify **`@emoji-mart/data`**: ensure the bundle actually contains the emoji map or switch to a static import.

### Step D — Smoke test outside Java first

- Run the **bundled** file with **Node** in a minimal harness: `require` or dynamic import of the bundle, call the exported function, compare AST to current `migrate.js` output on **sample inputs**.

### Step E — Integrate in Java like BrightbackExpression

- Add the bundle as a **classpath resource** (same pattern as existing webpack output).
- In Java: `Source.newBuilder("js", resource).build()`, `context.eval`, then call your exported function with **`ProxyObject` / strings** as your codebase already does.
- **Name collision:** avoid exporting a global named `process` if your library expects Node’s `process`; align with how `BrightbackExpression` overwrites `process`.

### Step F — CI / Maven

- Document: “Run `pnpm run build:markdown-ast`” (or whatever) **before** packaging the JAR so the `.js` artifact is up to date.

---

## Quick glossary

| Term | Meaning here |
|------|----------------|
| **GraalVM** | JDK + polyglot runtime; your version is pinned in Maven (e.g. 25.0.2). |
| **GraalJS** | JavaScript engine on the JVM (Truffle). |
| **Polyglot `Context`** | Java object that runs JS snippets/files you provide. |
| **Bundled JS** | One file produced by Webpack/esbuild/etc.; no `node_modules` at runtime. |
| **Our POC** | Node + npm + `migrate.js`; great for development, different from embedded Graal until bundled. |

---

## Closing

The confusion is normal: **“Graal runs JavaScript”** sounds like **“Graal runs Node,”** but your app today runs **one bundled script** from the classpath. Fixing that gap means **repackaging** the markdown pipeline to match that model—not rewriting all of Markdown, and not necessarily abandoning unified/remark.

When this doc’s **Step D** passes (bundled output matches POC output on test fixtures), you’re ready for the Java side with high confidence.
