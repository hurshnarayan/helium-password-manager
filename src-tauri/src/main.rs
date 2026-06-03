mod commands;
mod autotype;
mod autotype_engine;

use tauri::Emitter;

fn main() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::derive_key,
            commands::encrypt_aes,
            commands::ml_kem_encapsulate,
            commands::ml_kem_encrypt_key,
            commands::encrypt_data,
            commands::save_vault,
            commands::load_vault,
            commands::get_encryption_metadata,
            autotype::register_hotkey,
            autotype::unregister_hotkey,
            autotype::register_os_hotkey,
            autotype::unregister_os_hotkey,
            autotype::list_hotkeys,
            autotype::init_default_hotkeys,
            autotype::register_all_hotkeys,
            autotype::trigger_autotype,
            autotype::perform_sequence,
            autotype::get_frontmost_window_title,
            autotype::set_clipboard_timeout,
            autotype::get_clipboard_timeout,
            autotype::is_accessibility_enabled,
            autotype::request_accessibility,
            autotype::is_dev_mode,
            autotype::get_parent_process_name,
            autotype::is_screen_recording_enabled,
            autotype::request_screen_recording,
            autotype::copy_to_clipboard,
            autotype::copy_username,
            autotype::copy_password,
            autotype::open_system_prefs,
        ]);

    builder
        .setup(|app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            
            let app_handle = app.handle();
            let hotkeys = {
                let map = autotype::HOTKEYS.lock().map_err(|e| format!("Failed to lock hotkeys: {}", e))?;
                map.clone()
            };
            
            // For each registered hotkey, set up a listener
            for hotkey in hotkeys.keys() {
                let plugin_hotkey = autotype::convert_hotkey_format(hotkey);
                let action_name = hotkeys.get(hotkey).cloned().unwrap_or_default();
                
                app_handle.global_shortcut().on_shortcut(plugin_hotkey.as_str(), move |app, _shortcut, _event| {
                    println!("Hotkey triggered: (action: {})", &action_name);
                    
                    // Emit event to frontend
                    let _ = app.emit("hotkey_triggered", serde_json::json!({
                        "action": &action_name,
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs(),
                    }));
                }).map_err(|e| format!("Failed to set hotkey listener: {}", e))?;
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
