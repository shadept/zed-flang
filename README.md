# zed-flang

Zed editor extension for the [FLang](https://github.com/shadept/flang) programming language.

## Features

- Syntax highlighting via [tree-sitter-flang](https://github.com/shadept/tree-sitter-flang)
- Auto-indentation
- Symbol outline (functions, structs, enums, constants, tests)
- LSP integration (`flang --lsp`)

## Installing in Zed

### As a dev extension (local development)

1. Clone this repository:
   ```bash
   git clone https://github.com/shadept/zed-flang.git
   cd zed-flang
   ```

2. In Zed, open the command palette and run **"zed: install dev extension"**, then select the `zed-flang` directory.

3. Open any `.f` file. The status bar should show "FLang" and syntax highlighting should be active.

If something goes wrong, check **"zed: open log"** in the command palette for errors.

### Note on `.f` files

The `.f` extension is shared with Fortran. If you have a Fortran extension installed, you may need to manually select FLang as the language for `.f` files.

## Dependencies

- [tree-sitter-flang](https://github.com/shadept/tree-sitter-flang) -- Tree-sitter grammar (fetched automatically by Zed via `extension.toml`)
- [flang](https://github.com/shadept/flang) -- FLang compiler (needed for LSP support; must be in PATH or configured in Zed settings)

## LSP Configuration

The extension launches `flang --lsp` for language server support. To use a custom binary path:

```json
{
  "lsp": {
    "flang": {
      "binary": {
        "path": "/path/to/flang"
      }
    }
  }
}
```

## License

MIT
