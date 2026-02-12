use zed_extension_api::{self as zed, LanguageServerId, Result};

struct FlangExtension;

impl zed::Extension for FlangExtension {
    fn new() -> Self {
        eprintln!("[flang-ext] Extension initialized");
        FlangExtension
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        eprintln!("[flang-ext] language_server_command called, server id: {language_server_id}");

        let settings = zed::settings::LspSettings::for_worktree("flang", worktree).ok();

        let binary_settings = settings.as_ref().and_then(|s| s.binary.as_ref());

        let path = if let Some(path) = binary_settings.and_then(|b| b.path.clone()) {
            eprintln!("[flang-ext] Using user-configured binary path: {path}");
            path
        } else {
            let resolved = worktree.which("flang");
            eprintln!("[flang-ext] worktree.which(\"flang\") = {resolved:?}");
            resolved.ok_or_else(|| {
                "flang not found in PATH. Install FLang or set the binary path in Zed settings: \
                 {\"lsp\": {\"flang\": {\"binary\": {\"path\": \"/path/to/flang\"}}}}"
                    .to_string()
            })?
        };

        let args = binary_settings
            .and_then(|b| b.arguments.clone())
            .unwrap_or_else(|| vec!["--lsp".to_string()]);

        eprintln!("[flang-ext] Returning command: {path} {args:?}");

        Ok(zed::Command {
            command: path,
            args,
            env: worktree.shell_env(),
        })
    }
}

zed::register_extension!(FlangExtension);
