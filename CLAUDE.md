# zed-flang

Zed editor extension providing tree-sitter based syntax highlighting for the FLang programming language.

## Project Structure

```
zed-flang/
├── extension.toml              # Zed extension manifest (grammar ref, metadata)
├── grammar.js                  # Tree-sitter grammar definition (source of truth)
├── tree-sitter.json            # Tree-sitter CLI metadata
├── package.json                # Node.js config for tree-sitter-cli tooling
├── binding.gyp                 # Native Node.js addon build config
├── languages/
│   └── flang/
│       ├── config.toml         # Zed language config (file assoc, comments, brackets)
│       ├── highlights.scm      # Syntax highlighting queries (Zed reads from here)
│       ├── indents.scm         # Auto-indentation rules
│       ├── injections.scm      # Language injection rules (placeholder)
│       └── outline.scm         # Symbol outline for navigation panel
├── queries/                    # Tree-sitter CLI query files (mirrors languages/flang/)
├── src/                        # Generated parser (do not edit manually)
│   ├── parser.c                # Generated from grammar.js
│   ├── grammar.json
│   ├── node-types.json
│   └── tree_sitter/            # Tree-sitter runtime headers
└── bindings/node/              # Node.js native bindings
```

## How Zed Loads This Extension

1. Zed reads `extension.toml` to find grammar references under `[grammars.flang]`.
2. It does a shallow git clone from the `repository` URL at the specified `rev` (commit SHA) into an internal `grammars/flang/` directory.
3. It compiles `src/parser.c` from the cloned repo to WASM using its built-in WASI SDK.
4. It reads query files from `languages/flang/*.scm` for highlighting, indentation, and outlines.

## Critical Maintenance Rules

### After ANY commit, update the rev in extension.toml

Zed fetches the grammar by commit SHA. Every time you commit changes, you must:

```bash
git add . && git commit -m "your message"
# Get the new SHA:
git rev-parse HEAD
# Update extension.toml [grammars.flang] rev = "<new-sha>"
```

The `extension.toml` will have an uncommitted change pointing to the latest commit. This is expected for local development. Zed fetches from the repo at that SHA.

### After updating the grammar, regenerate the parser

```bash
npx tree-sitter generate
```

This regenerates `src/parser.c`, `src/grammar.json`, and `src/node-types.json`. These generated files must be committed because Zed compiles `src/parser.c` directly (it does NOT run `tree-sitter generate`).

### Reinstall the dev extension after changes

In Zed: command palette > "zed: install dev extension" > select project directory. If issues arise, check "zed: open log".

Delete the `grammars/` directory before reinstalling if Zed complains about an existing clone.

## Modifying the Grammar (grammar.js)

### Adding a new keyword

1. Add the keyword as a string literal in the appropriate rule in `grammar.js`.
2. Run `npx tree-sitter generate`.
3. Add the keyword to the matching group in `languages/flang/highlights.scm` AND `queries/highlights.scm` (keep both in sync).
4. Commit, update rev, reinstall.

Example: To add a `while` keyword:
- Add it to `_statement` choices and create a `while_statement` rule in `grammar.js`
- Add `"while"` to the `@keyword.control` list in both highlights files
- If it introduces a new block, add indent rules in `indents.scm`

### Adding a new node type

1. Define the rule in `grammar.js`.
2. Run `npx tree-sitter generate`.
3. Add highlighting queries in `languages/flang/highlights.scm` using the node name.
4. If the node should appear in the outline panel, add it to `outline.scm`.
5. If the node creates a block scope, add indent rules in `indents.scm`.
6. Mirror changes to `queries/` directory.

### Important: highlights.scm must only reference nodes that exist in grammar.js

Tree-sitter query compilation will fail silently if you reference a keyword string or node type that doesn't exist in the grammar. This was a previous bug: `"break"` and `"continue"` were in highlights.scm but never defined in grammar.js, which silently killed all syntax highlighting.

**Always verify**: every string literal (e.g., `"break"`) and node type (e.g., `(while_statement)`) in `.scm` files must have a corresponding definition in `grammar.js`.

### Highlight capture names supported by Zed

Use only these capture name patterns (up to 2 levels of nesting):

- `@keyword`, `@keyword.storage`, `@keyword.control`, `@keyword.import`, `@keyword.operator`, `@keyword.modifier`
- `@type`, `@type.builtin`, `@type.definition`, `@type.parameter`, `@type.variant`
- `@function`, `@function.definition`, `@function.call`, `@function.method`
- `@variable`, `@variable.parameter`, `@variable.builtin`
- `@constant`, `@constant.builtin`
- `@property`
- `@string`, `@string.escape`
- `@number`
- `@comment`
- `@operator`
- `@punctuation.bracket`, `@punctuation.delimiter`
- `@attribute`

Avoid 3-level nesting like `@type.enum.variant` -- Zed may not recognize it. Use `@type.variant` instead.

## Query File Locations

- `languages/flang/*.scm` -- Zed reads from here. This is the primary location.
- `queries/*.scm` -- tree-sitter CLI reads from here (for `tree-sitter highlight`, `tree-sitter test`). Keep in sync with `languages/flang/`.

## File Extension

FLang uses `.f` which conflicts with Fortran. This is intentional. Users may need to manually select FLang as the language in Zed for `.f` files if Fortran support is also installed.

## Testing

```bash
# Regenerate parser from grammar
npx tree-sitter generate

# Parse a sample file
npx tree-sitter parse sample.f

# Test syntax highlighting (uses queries/ directory)
npx tree-sitter highlight sample.f

# Lint grammar.js
npx eslint grammar.js
```

## Maintaining This File

Claude should keep this CLAUDE.md up to date as the project evolves. When making changes to the project, update the relevant sections here:

- If new files or directories are added, update the Project Structure tree.
- If new grammar rules or node types are added, ensure the guidance in "Modifying the Grammar" still applies.
- If new highlight captures are used, add them to the supported captures list.
- If new bugs are found and fixed, document them in "Known Issues and Past Fixes".
- If the build/test workflow changes, update the Testing section.
- If new maintenance gotchas are discovered, add them to "Critical Maintenance Rules".

## Language Notes

- Logical operators are `and`/`or` keywords, NOT `&&`/`||`
- Bitwise operators: `&` (AND), `^` (XOR), `|` (OR)
- `&` is also used as unary address-of; tree-sitter resolves via conflict entries
- Primitive types: `i8 i16 i32 i64 u8 u16 u32 u64 usize isize bool` -- no floats, no `void`, no `never`
- Number literals support type suffixes: `42i32`, `1_000usize`
- `if`/`for` parentheses are optional: both `if (x) {}` and `if x {}` are valid
- `loop {}` is the infinite loop construct; `break` and `continue` are statements
- Directives are any `#identifier` (e.g., `#foreign`, `#intrinsic`, `#whatever`)
- Only `=` and `+=` compound assignment exist
- Struct literal field shorthand: `Point { x, y = 20 }` (bare `x` means `x = x`)
- Naked enums: `enum Ord { Less = -1, Equal = 0, Greater = 1 }`
- SYNTAX.md is the language spec source of truth

## Known Issues and Past Fixes

- `extension.toml` must use `[grammars.flang]` (plural), not `[grammar.flang]`
- `rev` must be an actual commit SHA, not `"HEAD"` -- HEAD is not a fetchable remote ref
- `binding.gyp` was originally copied from a Sass grammar template (target was `tree_sitter_sass_binding`)
- `tree-sitter.json` originally referenced a non-existent `src/scanner.c` -- this grammar has no external scanner
- `grammars/` directory is created by Zed during dev extension install -- it's gitignored
- Optional `if`/`for` parens required adding conflict entries for `grouped_expression`
