# zed-flang

Zed editor extension providing syntax highlighting and LSP integration for the FLang programming language.

The tree-sitter grammar lives in a separate repository: https://github.com/shadept/tree-sitter-flang

## Project Structure

```
zed-flang/
├── extension.toml              # Zed extension manifest (grammar ref, LSP, metadata)
├── Cargo.toml                  # Rust crate config (builds WASM extension for Zed)
├── src/
│   └── lib.rs                  # Zed extension entry point (LSP integration, compiled to WASM)
├── languages/
│   └── flang/
│       ├── config.toml         # Zed language config (file assoc, comments, brackets)
│       ├── highlights.scm      # Syntax highlighting queries
│       ├── indents.scm         # Auto-indentation rules
│       └── outline.scm         # Symbol outline for navigation panel
├── .gitignore
├── LICENSE
└── README.md
```

## How Zed Loads This Extension

1. Zed reads `extension.toml` to find grammar references under `[grammars.flang]`.
2. It does a shallow git clone from the `repository` URL (https://github.com/shadept/tree-sitter-flang) at the specified `rev` (commit SHA) into an internal `grammars/flang/` directory.
3. It compiles `src/parser.c` from the cloned grammar repo to WASM using its built-in WASI SDK.
4. It reads query files from `languages/flang/*.scm` for highlighting, indentation, and outlines.
5. It compiles `src/lib.rs` (via `Cargo.toml`) to WASM and calls `language_server_command()` to launch the LSP.

## Critical Maintenance Rules

### After grammar changes, update the rev in extension.toml

When the tree-sitter-flang grammar is updated, get the new commit SHA from that repo and update `extension.toml`:

```toml
[grammars.flang]
repository = "https://github.com/shadept/tree-sitter-flang"
rev = "<new-sha-from-tree-sitter-flang>"
```

### Reinstall the dev extension after changes

In Zed: command palette > "zed: install dev extension" > select project directory. If issues arise, check "zed: open log".

Delete the `grammars/` directory before reinstalling if Zed complains about an existing clone.

## Highlight capture names supported by Zed

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

## Important: highlights.scm must only reference nodes that exist in the grammar

Tree-sitter query compilation will fail silently if you reference a keyword string or node type that doesn't exist in the grammar. Always verify: every string literal (e.g., `"break"`) and node type (e.g., `(while_statement)`) in `.scm` files must have a corresponding definition in the tree-sitter-flang grammar.

## LSP Integration

The extension launches the FLang compiler's built-in LSP server via `flang --lsp` (stdin/stdout JSON-RPC).

### Compiler modes

The extension supports two modes, configured via `lsp.flang.settings.mode`:

- **`auto`** (default): Automatically downloads the FLang compiler from GitHub releases (`shadept/flangv2`). The compiler is stored in version-tagged directories (e.g., `flang-v0.1.0/`) in the extension's working directory. On each LSP startup, it checks for a newer release and downloads it if available. Old versions are cleaned up automatically. The stdlib path is auto-detected at `<version-dir>/stdlib`.
- **`manual`**: User provides a binary path via `lsp.flang.binary.path` or relies on PATH lookup. No automatic downloads.

### How it works

`src/lib.rs` implements the `zed::Extension` trait. The `language_server_command()` method:
1. Reads `lsp.flang.settings.mode` (default: `"auto"`)
2. **Auto mode**: checks for latest GitHub release, downloads if needed, returns path to downloaded binary with `--lsp --stdlib-path <path>` args
3. **Manual mode**: uses `lsp.flang.binary.path` or `worktree.which("flang")`, returns `flang --lsp`

### User configuration

**Auto mode** (default -- no configuration needed):
```json
{}
```

**Manual mode** with custom binary path:
```json
{
  "lsp": {
    "flang": {
      "settings": { "mode": "manual" },
      "binary": {
        "path": "/path/to/flang"
      }
    }
  }
}
```

**Manual mode** with PATH lookup:
```json
{
  "lsp": {
    "flang": {
      "settings": { "mode": "manual" }
    }
  }
}
```

### Building the WASM extension

```bash
# One-time setup
rustup target add wasm32-wasip1

# Build
cargo build --target wasm32-wasip1
```

Zed compiles the extension automatically during dev extension install, so manual builds are only needed for verification.

## File Extension

FLang uses `.f` which conflicts with Fortran. This is intentional. Users may need to manually select FLang as the language in Zed for `.f` files if Fortran support is also installed.

## Language Notes

- Logical operators are `and`/`or` keywords, NOT `&&`/`||`
- Bitwise operators: `&` (AND), `^` (XOR), `|` (OR)
- `&` is also used as unary address-of
- Primitive types: `i8 i16 i32 i64 u8 u16 u32 u64 usize isize bool` -- no floats, no `void`, no `never`
- Number literals support type suffixes: `42i32`, `1_000usize`
- `if`/`for` parentheses are optional
- `else if` chains are supported
- Byte char literals: `b'x'`
- `loop {}` is the infinite loop construct; `break` and `continue` are statements
- Directives are any `#identifier` (e.g., `#foreign`, `#intrinsic`)
- Only `=` and `+=` compound assignment exist
- Struct literal field shorthand: `Point { x, y = 20 }`
- Naked enums: `enum Ord { Less = -1, Equal = 0, Greater = 1 }`

## Known Issues and Past Fixes

- `extension.toml` must use `[grammars.flang]` (plural), not `[grammar.flang]`
- `rev` must be an actual commit SHA, not `"HEAD"` -- HEAD is not a fetchable remote ref
- `grammars/` directory is created by Zed during dev extension install -- it's gitignored
- Member-expression highlights use `#match?` predicates to disambiguate `@property` (lowercase) vs `@type.variant` (uppercase) -- duplicate patterns without predicates cause last-match-wins behavior
- Tree-sitter queries are **last-match-wins** for the same node. `(identifier) @variable` MUST be the first pattern in highlights.scm so all specific patterns override it

## Maintaining This File

Claude should keep this CLAUDE.md up to date as the project evolves. When making changes:

- If new files or directories are added, update the Project Structure tree.
- If new highlight captures are used, add them to the supported captures list.
- If the build/test workflow changes, update the relevant section.
- If new maintenance gotchas are discovered, add them to Known Issues.
