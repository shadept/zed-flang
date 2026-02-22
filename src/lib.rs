use std::fs;
use zed_extension_api::{self as zed, LanguageServerId, Result};

const GITHUB_REPO: &str = "shadept/flang";

struct FlangExtension {
    cached_binary_path: Option<String>,
    cached_version: Option<String>,
}

impl FlangExtension {
    /// Read the "mode" from lsp.flang.settings.mode. Defaults to "auto".
    fn get_mode(settings: &Option<zed::settings::LspSettings>) -> String {
        settings
            .as_ref()
            .and_then(|s| s.settings.as_ref())
            .and_then(|v| v.get("mode"))
            .and_then(|v| v.as_str())
            .unwrap_or("auto")
            .to_string()
    }

    /// Map current platform to the asset suffix used in GitHub release asset names.
    fn platform_asset_suffix() -> std::result::Result<&'static str, String> {
        let (os, arch) = zed::current_platform();
        match (os, arch) {
            (zed::Os::Windows, zed::Architecture::X8664) => Ok("win-x64"),
            (zed::Os::Linux, zed::Architecture::X8664) => Ok("linux-x64"),
            (zed::Os::Mac, zed::Architecture::Aarch64) => Ok("macos-arm64"),
            (zed::Os::Mac, zed::Architecture::X8664) => Ok("macos-x64"),
            _ => Err(format!(
                "Unsupported platform: {os:?}-{arch:?}. Use manual mode and set lsp.flang.binary.path."
            )),
        }
    }

    /// Binary filename for the current platform.
    fn binary_name() -> &'static str {
        let (os, _) = zed::current_platform();
        match os {
            zed::Os::Windows => "flang.exe",
            _ => "flang",
        }
    }

    /// Handle manual mode: use configured path or PATH lookup.
    fn manual_command(
        &self,
        settings: &Option<zed::settings::LspSettings>,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let binary_settings = settings.as_ref().and_then(|s| s.binary.as_ref());

        let path = if let Some(path) = binary_settings.and_then(|b| b.path.clone()) {
            eprintln!("[flang-ext] Manual mode: using configured path: {path}");
            path
        } else {
            let resolved = worktree.which("flang");
            eprintln!("[flang-ext] Manual mode: worktree.which(\"flang\") = {resolved:?}");
            resolved.ok_or_else(|| {
                "flang not found in PATH. Install FLang or configure lsp.flang.binary.path, \
                 or switch to auto mode by removing lsp.flang.settings.mode"
                    .to_string()
            })?
        };

        let args = binary_settings
            .and_then(|b| b.arguments.clone())
            .unwrap_or_else(|| vec!["--lsp".to_string()]);

        Ok(zed::Command {
            command: path,
            args,
            env: worktree.shell_env(),
        })
    }

    /// Handle auto mode: download from GitHub releases if needed.
    fn auto_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        // Fast path: if we already resolved the binary this session, reuse it.
        if let Some(ref path) = self.cached_binary_path {
            if fs::metadata(path).is_ok() {
                eprintln!("[flang-ext] Auto mode: using cached binary: {path}");
                let version_dir = path.rsplit_once('/').or(path.rsplit_once('\\')).map(|(d, _)| d).unwrap_or(".");
                let stdlib_path = format!("{version_dir}/stdlib");
                let mut args = vec!["--lsp".to_string()];
                if fs::metadata(&stdlib_path).is_ok() {
                    args.push("--stdlib-path".to_string());
                    args.push(stdlib_path);
                }
                return Ok(zed::Command {
                    command: path.clone(),
                    args,
                    env: worktree.shell_env(),
                });
            }
            // Cached path is stale, clear it.
            self.cached_binary_path = None;
            self.cached_version = None;
        }

        // Check latest release from GitHub.
        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );

        let release = zed::latest_github_release(
            GITHUB_REPO,
            zed::GithubReleaseOptions {
                require_assets: true,
                pre_release: false,
            },
        )
        .map_err(|e| {
            let msg = format!("Failed to fetch latest release: {e}");
            eprintln!("[flang-ext] {msg}");
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::Failed(msg.clone()),
            );
            msg
        })?;

        let version = &release.version;
        let version_dir = format!("flang-{version}");
        let binary_path = format!("{version_dir}/{}", Self::binary_name());

        // Check if this version is already downloaded.
        if fs::metadata(&binary_path).is_ok() {
            eprintln!("[flang-ext] Auto mode: {version} already installed at {binary_path}");
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::None,
            );
            self.cached_binary_path = Some(binary_path.clone());
            self.cached_version = Some(version.clone());
            return self.build_auto_command(&binary_path, &version_dir, worktree);
        }

        // Need to download.
        let suffix = Self::platform_asset_suffix().map_err(|e| {
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::Failed(e.clone()),
            );
            e
        })?;

        let asset = release
            .assets
            .iter()
            .find(|a| a.name.contains(suffix))
            .ok_or_else(|| {
                let msg = format!(
                    "No release asset for platform '{suffix}' in {version}. \
                     Available: {}",
                    release
                        .assets
                        .iter()
                        .map(|a| a.name.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                );
                eprintln!("[flang-ext] {msg}");
                zed::set_language_server_installation_status(
                    language_server_id,
                    &zed::LanguageServerInstallationStatus::Failed(msg.clone()),
                );
                msg
            })?;

        eprintln!(
            "[flang-ext] Auto mode: downloading {} from {}",
            asset.name, asset.download_url
        );
        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::Downloading,
        );

        zed::download_file(&asset.download_url, &version_dir, zed::DownloadedFileType::Zip)
            .map_err(|e| {
                let msg = format!("Failed to download {}: {e}", asset.name);
                eprintln!("[flang-ext] {msg}");
                zed::set_language_server_installation_status(
                    language_server_id,
                    &zed::LanguageServerInstallationStatus::Failed(msg.clone()),
                );
                msg
            })?;

        // Handle nested directory: if the zip extracted into a single subdirectory,
        // move its contents up one level.
        self.flatten_if_nested(&version_dir);

        // Make binary executable on non-Windows.
        let (os, _) = zed::current_platform();
        if !matches!(os, zed::Os::Windows) {
            let _ = zed::make_file_executable(&binary_path);
        }

        // Verify the binary exists after extraction.
        if fs::metadata(&binary_path).is_err() {
            let msg = format!(
                "Binary not found at {binary_path} after extraction. \
                 Check that the release archive contains '{}'.",
                Self::binary_name()
            );
            eprintln!("[flang-ext] {msg}");
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::Failed(msg.clone()),
            );
            return Err(msg);
        }

        eprintln!("[flang-ext] Auto mode: installed {version} at {binary_path}");
        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::None,
        );

        // Clean up old versions.
        self.cleanup_old_versions(&version_dir);

        self.cached_binary_path = Some(binary_path.clone());
        self.cached_version = Some(version.clone());

        self.build_auto_command(&binary_path, &version_dir, worktree)
    }

    /// Build the Command for auto mode with --stdlib-path if available.
    fn build_auto_command(
        &self,
        binary_path: &str,
        version_dir: &str,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let stdlib_path = format!("{version_dir}/stdlib");
        let mut args = vec!["--lsp".to_string()];
        if fs::metadata(&stdlib_path).is_ok() {
            args.push("--stdlib-path".to_string());
            args.push(stdlib_path);
        }
        Ok(zed::Command {
            command: binary_path.to_string(),
            args,
            env: worktree.shell_env(),
        })
    }

    /// If a zip extracted into a single subdirectory, move its contents up.
    fn flatten_if_nested(&self, dir: &str) {
        let entries: Vec<_> = match fs::read_dir(dir) {
            Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
            Err(_) => return,
        };

        if entries.len() == 1 {
            let entry = &entries[0];
            if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                let nested = entry.path();
                if let Ok(inner_entries) = fs::read_dir(&nested) {
                    for inner in inner_entries.filter_map(|e| e.ok()) {
                        let dest = std::path::Path::new(dir).join(inner.file_name());
                        let _ = fs::rename(inner.path(), dest);
                    }
                }
                let _ = fs::remove_dir_all(&nested);
            }
        }
    }

    /// Remove old flang-* version directories, keeping only `current_dir`.
    fn cleanup_old_versions(&self, current_dir: &str) {
        let Ok(entries) = fs::read_dir(".") else {
            return;
        };
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name.starts_with("flang-")
                && name != current_dir
                && entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false)
            {
                eprintln!("[flang-ext] Cleaning up old version: {name}");
                let _ = fs::remove_dir_all(entry.path());
            }
        }
    }
}

impl zed::Extension for FlangExtension {
    fn new() -> Self {
        eprintln!("[flang-ext] Extension initialized");
        FlangExtension {
            cached_binary_path: None,
            cached_version: None,
        }
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        eprintln!("[flang-ext] language_server_command called, server id: {language_server_id}");

        let settings = zed::settings::LspSettings::for_worktree("flang", worktree).ok();
        let mode = Self::get_mode(&settings);

        eprintln!("[flang-ext] Mode: {mode}");

        match mode.as_str() {
            "manual" => self.manual_command(&settings, worktree),
            _ => self.auto_command(language_server_id, worktree),
        }
    }
}

zed::register_extension!(FlangExtension);
