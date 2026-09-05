# GitHub Copilot Instructions — @treeviz/gedcom-parser

Short standing policy also lives in the monorepo Cursor rules
(`.cursor/rules/*.mdc`) and `AGENTS.md`. This file is package-specific detail
for Copilot when working under `packages/gedcom-parser/`.

---

## Mandatory behavioral rules

1. **Language** — Reply in the same language the user used. Code, comments,
   commit messages, and docs stay in English.
2. **Tests** — Do **not** run unit/E2E tests by default (`npm test`, Vitest,
   Playwright). Write or update tests when needed; the developer runs them.
   **Exception:** run package tests only when the user explicitly asks.
3. **Commit message** — After any file change, end the response with:

```
---
## Suggested Commit Message
type(scope): brief description
```

Keep the subject under 72 characters (Conventional Commits).

---

## Package overview

Pluggable TypeScript GEDCOM library used by TreeViz. Parses and exports
**GEDCOM 5.5 / 5.5.1** and **GEDCOM 7**, including FamilySearch **GEDZIP**
(`.gdz`).

| | |
| --- | --- |
| Package | `@treeviz/gedcom-parser` |
| Build | **tsup** (`npm run build`) + `tsc` declarations |
| Tests | Vitest (`npm test`) — developer-run unless asked |
| Node | **≥ 20** |
| Deps | `lodash-es`, `date-fns`, `jszip`; CLI also uses `commander`, `chalk` |

Canonical API docs: **`README.md`** (keep it in sync when changing public APIs).
Extension tags in `HEAD.SCHMA`: [treeviz.com/gedcom](https://treeviz.com/gedcom).

### Layout

```
src/
  classes/           # GedCom, Indi, Fam, Obje, Date, Note, List, …
  factories/         # i18n, date locale, places, cache, kinship injectors
  utils/             # parser, gedzip, local-media, gedcom7-*, multimedia, …
  kinship-translator/
  structures/ interfaces/ types/ constants/
  cli/               # gedcom-parser CLI
  __tests__/
```

---

## Export version priority

When serializing:

1. `toGedcom(..., { gedcomVersion: "7.0" | "5.5.1" })` if set  
2. else source `HEAD.GEDC.VERS`  
3. else **5.5.1**

GEDCOM 7-only transforms (PHRASE, SCHMA, UID/CREA/CHAN backfill, CONC skip, …)
run **only** when the resolved export version is `7.0`.

`original: true` keeps the live HEAD (and `_ORIGHEAD`) instead of the download
TreeViz header.

---

## Key APIs (current names)

Use these — do **not** invent legacy names like `getIndis` / `getName`.

```typescript
import GedcomTree from "@treeviz/gedcom-parser";

const { gedcom } = GedcomTree.parse(content);

gedcom.indis();
gedcom.indi("@I1@");
gedcom.fams();
gedcom.objes();
gedcom.snotes();

gedcom.toGedcom(undefined, 0, { gedcomVersion: "7.0" });
gedcom.toGedzip({ media });
gedcom.collectMultimedia({ namespace });
gedcom.createMultimediaRecord({ file, title, mediType, gedcomVersion });
gedcom.createSharedNote("text");
gedcom.getOriginalHeadRecord(); // _ORIGHEAD
gedcom.getSourceHeads();        // original head first, then live HEAD
gedcom.isAncestry(); / isMyHeritage(); / …

indi.toName();
indi.getBirthDate();
indi.multimedia(namespace);
indi.getProfilePicture(namespace);
indi.attachMultimedia(obje);
indi.attachMediaFromUrl(url, options);
```

### GEDZIP / media hooks

```typescript
import {
  extractGedzip,
  buildGedzipBlob,
  downloadGedzipMedia,
  setLocalMediaResolver,
  setMediaContentResolver,
} from "@treeviz/gedcom-parser";

// Host (TreeViz) injects IndexedDB / cache — parser stays storage-agnostic
setLocalMediaResolver(async (path) => /* data:/blob:/https: URL */);
setMediaContentResolver(async (media) => /* { content, contentType? } */);
```

After GEDZIP import, `FILE` paths are often `media/<uuid>.jpg`. Resolvers turn
those into displayable / packable payloads. Do **not** embed all media as data
URLs into the GEDCOM text for large trees (breaks remount/parse).

### Factories

Set **before** parse when the host needs them:

- `setI18nProvider`
- `setDateLocaleProvider` — `() => Locale | undefined` (no lang arg)
- `setPlaceParserProvider` / `setPlaceTranslatorProvider`
- `setCacheManagerFactory` — returns `{ getItem(), setItem() }` (whole-object cache, not key/value)
- `setKinshipTranslatorClass`
- `setLocalMediaResolver` / `setMediaContentResolver`

Defaults are SSR-safe no-ops / in-memory.

---

## GEDCOM 7 notes for implementers

- Multimedia: nested `FILE → FORM [→ TYPE]`; flat `FORM` / `MEDI` are 5.5.1.
  When standardizing to 7.0, remove leftover flat siblings.
- Shared notes: top-level `0 @Nn@ SNOTE <text>`; links via `1 NOTE @Nn@`.
- Non-events: `1 NO MARR` (+ optional DATE).
- Non-enum SEX / PEDI / ROLE → empty parent + `PHRASE` on G7 export only.
- `_ORIGHEAD` preserves pre-TreeViz HEAD for vendor detection after re-export.
- `TRLR` is a file terminator only — not a stored record / not in `toJson()`.
- Date export: display forms `Abt.` / `Bef.` / `Aft.` must become `ABT` / `BEF` /
  `AFT` in GEDCOM text.

---

## Code conventions

- TypeScript strict; avoid `any` in production code
- Classes: `PascalCase.ts`; utils: `kebab-case.ts`
- Public exports: keep `README.md` and this file aligned
- Add/adjust Vitest coverage for public API changes under `src/__tests__/`
- Prefer small, focused diffs; no drive-by refactors

### Commands (developer / explicit ask)

```bash
npm test                 # Vitest
npm run test:watch
npm run build            # tsup + dts
npm run dev              # tsup --watch
```

### Commits

`feat|fix|docs|refactor|test|chore(scope): subject`

Examples:

```
feat(gedzip): extract media entries without data-URL remount
fix(date): export Abt. as ABT
docs: refresh README for GEDCOM 7 APIs
```

---

## Host integration (TreeViz)

The visualiser wires factories in `src/utils/init-gedcom-parser.ts` (cache bridge,
place/i18n providers, local media → IndexedDB). GEDZIP import seeding lives in
the app worker; the parser only provides extract/build/download helpers.

When changing parser media/export behavior, check:

- `src/utils/init-gedcom-parser.ts`
- `src/workers/app.worker.ts`
- stage / profile GEDCOM 7 download paths

---

**After changes:** update tests if the public contract moved, update `README.md`
when APIs change, and always end with a Suggested Commit Message.
