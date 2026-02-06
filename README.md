# FLang Extension for Zed

Tree-sitter based syntax highlighting for FLang in Zed editor.

## Quick Start

```bash
# 1. Build
cd extensions/zed-flang
npm install && npm run generate

# 2. Install (pick your OS)
# macOS:
ln -s "$(pwd)" ~/Library/Application\ Support/Zed/extensions/installed/flang

# Linux:
ln -s "$(pwd)" ~/.config/zed/extensions/installed/flang

# 3. Restart Zed, open any .f file
```

## Building

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate the parser:
   ```bash
   npm run generate
   ```

3. Test the grammar (optional):
   ```bash
   npm run test
   ```

## Installing in Zed

### Option 1: Symlink (for development)

```bash
# macOS
ln -s "$(pwd)" ~/Library/Application\ Support/Zed/extensions/installed/flang

# Linux
ln -s "$(pwd)" ~/.config/zed/extensions/installed/flang
```

Restart Zed or run `zed: reload extensions` from the command palette.

### Option 2: Copy

Copy the entire `zed-flang` folder to the extensions directory above (rename to `flang`).

### Verify

1. Open a `.f` file
2. Status bar should show "FLang"
3. Code should be syntax highlighted

If not working, check `zed: open log` for errors.

## Features

- Syntax highlighting for FLang `.f` files
- Support for:
  - Functions and parameters
  - Structs and enums
  - Generics (`$T`)
  - Control flow (if, for, match, defer)
  - Operators (including `??`, `?.`, `..`)
  - String literals with escape sequences
  - Comments
  - Directives (`#foreign`, `#intrinsic`)
  - Test blocks

## File Structure

```
zed-flang/
├── extension.toml          # Zed extension manifest
├── grammar.js              # Tree-sitter grammar definition
├── package.json            # Node.js package for tree-sitter-cli
├── queries/
│   ├── highlights.scm      # Syntax highlighting queries
│   ├── indents.scm         # Auto-indentation rules
│   ├── injections.scm      # Language injection rules
│   └── outline.scm         # Symbol outline queries
└── languages/
    └── flang/
        └── config.toml     # Language configuration
```
