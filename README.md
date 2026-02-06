# zed-flang

Tree-sitter grammar and Zed editor extension for the [FLang](https://github.com/example/flang) programming language.

## Features

- Syntax highlighting for `.f` files
- Auto-indentation
- Symbol outline (functions, structs, enums, constants, tests)
- Support for:
  - Functions, parameters, and return types
  - Structs and enums with generics (`$T`)
  - Control flow (`if`, `for`, `match`, `defer`)
  - Pattern matching with wildcards and variant patterns
  - Operators including `??`, `?.`, `..`, `as`
  - String/char literals with escape sequences
  - Visibility modifiers (`pub`)
  - Directives (`#foreign`, `#intrinsic`)
  - Test blocks
  - Import declarations

## Installing in Zed

### As a dev extension (local development)

1. Clone this repository and install dependencies:
   ```bash
   git clone https://github.com/example/flang-zed.git
   cd zed-flang
   npm install
   ```

2. Generate the parser:
   ```bash
   npx tree-sitter generate
   ```

3. In Zed, open the command palette and run **"zed: install dev extension"**, then select the `zed-flang` directory.

4. Open any `.f` file. The status bar should show "FLang" and syntax highlighting should be active.

If something goes wrong, check **"zed: open log"** in the command palette for errors.

### Note on `.f` files

The `.f` extension is shared with Fortran. If you have a Fortran extension installed, you may need to manually select FLang as the language for `.f` files in Zed's status bar.

## Project Structure

```
zed-flang/
├── extension.toml          # Zed extension manifest
├── grammar.js              # Tree-sitter grammar definition (source of truth)
├── languages/
│   └── flang/
│       ├── config.toml     # Language config (file association, comments, brackets)
│       ├── highlights.scm  # Syntax highlighting queries
│       ├── indents.scm     # Auto-indentation rules
│       ├── injections.scm  # Language injection rules
│       └── outline.scm     # Symbol outline queries
├── queries/                # Tree-sitter CLI query files (see note below)
├── src/                    # Generated parser (do not edit manually)
├── bindings/node/          # Node.js native bindings
├── tree-sitter.json        # Tree-sitter CLI metadata
├── package.json            # Node.js tooling config
└── binding.gyp             # Native addon build config
```

### Why `languages/flang/` and `queries/` both exist

Zed and the tree-sitter CLI look for query files in different locations:

- **`languages/flang/*.scm`** is where Zed reads query files from when loading the extension.
- **`queries/*.scm`** is the standard location for the tree-sitter CLI (`tree-sitter highlight`, `tree-sitter test`, etc.).

Neither tool reads from the other's directory, so both copies are needed. If you only use this project as a Zed extension and never run tree-sitter CLI commands, the `queries/` directory is optional. But for development and debugging, having both is useful.

When modifying query files, update both locations to keep them in sync.

## Development

### Modifying the grammar

1. Edit `grammar.js`.
2. Regenerate the parser:
   ```bash
   npx tree-sitter generate
   ```
3. Update `highlights.scm` (in both `languages/flang/` and `queries/`) if you added new keywords or node types.
4. Commit all changes (including generated `src/` files).
5. Update `extension.toml` with the new commit SHA:
   ```bash
   git rev-parse HEAD
   # Put the output in extension.toml: rev = "<sha>"
   ```
6. Reinstall the dev extension in Zed.

### Testing

```bash
# Regenerate parser from grammar
npx tree-sitter generate

# Parse a sample file and view the syntax tree
npx tree-sitter parse sample.f

# Test syntax highlighting
npx tree-sitter highlight sample.f

# Lint grammar.js
npx eslint grammar.js
```

## License

MIT
