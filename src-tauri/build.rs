fn main() {
    // First run tauri-build
    tauri_build::build();

    // Then compile the Objective-C helper for macOS only
    if std::env::var("CARGO_CFG_TARGET_OS").map(|s| s == "macos").unwrap_or(false) {
        cc::Build::new()
            .file("src/mac_autotype.m")
            .flag_if_supported("-fobjc-arc")
            .compile("mac_autotype");
    }
}
