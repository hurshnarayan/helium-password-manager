use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::ffi::CStr;
use std::ffi::CString;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use std::thread::sleep;
use std::time::Duration;

pub static HOTKEYS: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| Mutex::new(HashMap::new()));
static REGISTERED_HOTKEYS: Lazy<Mutex<std::collections::HashSet<String>>> =
    Lazy::new(|| Mutex::new(std::collections::HashSet::new()));
static DEFAULT_CLIPBOARD_TIMEOUT: AtomicU32 = AtomicU32::new(8);

pub const DEFAULT_AUTOTYPE_HOTKEY: &str = "Cmd+Shift+V";
pub const DEFAULT_COPY_USERNAME_HOTKEY: &str = "Cmd+B";
pub const DEFAULT_COPY_PASSWORD_HOTKEY: &str = "Cmd+C";

#[tauri::command]
pub fn register_hotkey(hotkey: String, action: String) -> Result<(), String> {
    let mut map = HOTKEYS.lock().map_err(|e| e.to_string())?;
    map.insert(hotkey.clone(), action.clone());

    // Store is now persistent across app lifecycle
    println!("Registered hotkey: {} -> {}", hotkey, action);

    Ok(())
}

#[tauri::command]
pub fn unregister_hotkey(hotkey: String) -> Result<(), String> {
    let mut map = HOTKEYS.lock().map_err(|e| e.to_string())?;
    map.remove(&hotkey);

    let mut registered = REGISTERED_HOTKEYS.lock().map_err(|e| e.to_string())?;
    registered.remove(&hotkey);

    Ok(())
}

// Convert hotkey format from user input (e.g., "Cmd+Shift+V") to tauri plugin format
pub fn convert_hotkey_format(hotkey: &str) -> String {
    #[cfg(target_os = "macos")]
    {
        // macOS format: "cmd+shift+v"
        hotkey.to_lowercase()
    }
    #[cfg(not(target_os = "macos"))]
    {
        // Windows/Linux format: "ctrl+shift+v"
        hotkey
            .replace("Cmd", "Ctrl")
            .replace("cmd", "ctrl")
            .to_lowercase()
    }
}

#[tauri::command]
pub fn register_os_hotkey(
    app: tauri::AppHandle,
    hotkey: String,
    action: String,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    // Convert hotkey format from user input to plugin format
    let plugin_hotkey = convert_hotkey_format(&hotkey);

    // Register with OS via plugin
    app.global_shortcut()
        .register(plugin_hotkey.as_str())
        .map_err(|e| format!("Failed to register hotkey with OS: {}", e))?;

    // Store the mapping
    let mut map = HOTKEYS.lock().map_err(|e| e.to_string())?;
    map.insert(hotkey.clone(), action.clone());

    let mut registered = REGISTERED_HOTKEYS.lock().map_err(|e| e.to_string())?;
    registered.insert(hotkey.clone());

    println!(
        "Registered OS hotkey: {} -> {} (plugin format: {})",
        hotkey, action, plugin_hotkey
    );

    Ok(())
}

#[tauri::command]
pub fn unregister_os_hotkey(app: tauri::AppHandle, hotkey: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let plugin_hotkey = convert_hotkey_format(&hotkey);

    app.global_shortcut()
        .unregister(plugin_hotkey.as_str())
        .map_err(|e| format!("Failed to unregister hotkey from OS: {}", e))?;

    let mut map = HOTKEYS.lock().map_err(|e| e.to_string())?;
    map.remove(&hotkey);

    let mut registered = REGISTERED_HOTKEYS.lock().map_err(|e| e.to_string())?;
    registered.remove(&hotkey);

    println!("Unregistered OS hotkey: {}", hotkey);

    Ok(())
}

#[tauri::command]
pub fn init_default_hotkeys() -> Result<(), String> {
    let mut map = HOTKEYS.lock().map_err(|e| e.to_string())?;

    // Only initialize if not already set
    if map.is_empty() {
        map.insert(DEFAULT_AUTOTYPE_HOTKEY.to_string(), "autotype".to_string());
        map.insert(
            DEFAULT_COPY_USERNAME_HOTKEY.to_string(),
            "copy_username".to_string(),
        );
        map.insert(
            DEFAULT_COPY_PASSWORD_HOTKEY.to_string(),
            "copy_password".to_string(),
        );
        println!("Initialized default KeePassXC hotkeys");
    }

    Ok(())
}

#[tauri::command]
pub fn register_all_hotkeys(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let map = HOTKEYS.lock().map_err(|e| e.to_string())?;

    for hotkey in map.keys() {
        let plugin_hotkey = convert_hotkey_format(hotkey);
        app.global_shortcut()
            .register(plugin_hotkey.as_str())
            .map_err(|e| format!("Failed to register hotkey '{}': {}", hotkey, e))?;

        println!("Registered hotkey with OS: {}", hotkey);
    }

    let mut registered = REGISTERED_HOTKEYS.lock().map_err(|e| e.to_string())?;
    registered.extend(map.keys().cloned());

    Ok(())
}

#[tauri::command]
pub fn list_hotkeys() -> Result<Vec<(String, String)>, String> {
    let map = HOTKEYS.lock().map_err(|e| e.to_string())?;
    let v = map.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
    Ok(v)
}

#[tauri::command]
pub fn set_clipboard_timeout(seconds: u32) -> Result<(), String> {
    DEFAULT_CLIPBOARD_TIMEOUT.store(seconds, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn get_clipboard_timeout() -> Result<u32, String> {
    Ok(DEFAULT_CLIPBOARD_TIMEOUT.load(Ordering::SeqCst))
}

// macOS FFI bindings
#[cfg(target_os = "macos")]
mod mac {
    use std::os::raw::{c_char, c_int};
    extern "C" {
        pub fn is_accessibility_enabled() -> bool;
        pub fn request_accessibility();
        pub fn is_screen_recording_enabled() -> bool;
        pub fn request_screen_recording();
        pub fn send_text(seq: *const c_char) -> c_int;
        pub fn send_keycode(code: c_int) -> c_int;
        pub fn send_keycode_with_modifiers(code: c_int, modifiers: c_int) -> c_int;
        pub fn clear_clipboard_after(seconds: c_int) -> c_int;
        pub fn get_frontmost_window_title() -> *mut c_char;
        pub fn free_c_string(value: *const c_char);
    }
}

#[tauri::command]
pub fn is_accessibility_enabled() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(unsafe { mac::is_accessibility_enabled() })
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Accessibility check not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn request_accessibility() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        unsafe { mac::request_accessibility() };
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Request accessibility not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn is_screen_recording_enabled() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(unsafe { mac::is_screen_recording_enabled() })
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Screen recording check not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn request_screen_recording() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        unsafe { mac::request_screen_recording() };
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Request screen recording not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn is_dev_mode() -> Result<bool, String> {
    // Check if running from terminal (dev mode) vs built app
    // In dev mode, parent process will be cargo/node, in production it will be launchd or similar
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        let pid = unsafe { libc::getpid() };
        let ppid = unsafe { libc::getppid() };
        
        let output = Command::new("ps")
            .arg("-o")
            .arg("comm=")
            .arg("-p")
            .arg(ppid.to_string())
            .output();
        
        match output {
            Ok(out) => {
                let parent_process = String::from_utf8_lossy(&out.stdout);
                let parent_name = parent_process.trim();
                
                // Dev mode if parent is cargo, node, npm, or contains "tauri"
                let is_dev = parent_name.contains("cargo") 
                    || parent_name.contains("node") 
                    || parent_name.contains("npm")
                    || parent_name.contains("tauri")
                    || parent_name == "bash"
                    || parent_name == "zsh"
                    || parent_name == "fish"
                    || parent_name == "sh"
                    || parent_name.contains("ghostty")
                    || parent_name.contains("terminal");
                
                println!("[is_dev_mode] Parent process: {}, is_dev: {}", parent_name, is_dev);
                Ok(is_dev)
            }
            Err(e) => {
                println!("[is_dev_mode] Error checking parent process: {}", e);
                // Default to dev mode if we can't determine
                Ok(true)
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub fn get_parent_process_name() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        let ppid = unsafe { libc::getppid() };
        
        let output = Command::new("ps")
            .arg("-o")
            .arg("comm=")
            .arg("-p")
            .arg(ppid.to_string())
            .output();
        
        match output {
            Ok(out) => {
                let parent_name = String::from_utf8_lossy(&out.stdout).trim().to_string();
                println!("[get_parent_process_name] {}", parent_name);
                Ok(parent_name)
            }
            Err(e) => {
                Err(format!("Failed to get parent process name: {}", e))
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok("unknown".to_string())
    }
}

#[derive(Clone, Copy, Default)]
struct Modifiers(u8);

impl Modifiers {
    const SHIFT: u8 = 1;
    const CONTROL: u8 = 2;
    const OPTION: u8 = 4;
    const COMMAND: u8 = 8;

    fn is_empty(self) -> bool {
        self.0 == 0
    }

    fn union(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }

    fn to_mask(self) -> i32 {
        self.0 as i32
    }
}

enum Operation {
    Text(String),
    Key { code: i32, modifiers: Modifiers },
    Delay(u64),
    ClearClipboard,
    ClearField,
}

fn is_modifier_char(ch: char) -> bool {
    matches!(ch, '+' | '^' | '%' | '#')
}

fn parse_modifiers(chars: &[char], start: usize) -> Option<(Modifiers, usize)> {
    if start >= chars.len() || !is_modifier_char(chars[start]) {
        return None;
    }

    let mut modifiers = Modifiers::default();
    let mut i = start;
    while i < chars.len() {
        match chars[i] {
            '+' => modifiers.0 |= Modifiers::SHIFT,
            '^' => modifiers.0 |= Modifiers::CONTROL,
            '%' => modifiers.0 |= Modifiers::OPTION,
            '#' => modifiers.0 |= Modifiers::COMMAND,
            _ => break,
        }
        i += 1;
    }

    if i < chars.len() && !chars[i].is_whitespace() {
        Some((modifiers, i - start))
    } else {
        None
    }
}

fn is_prefix_combo_start(chars: &[char], index: usize) -> bool {
    let prev_ok = index == 0
        || chars
            .get(index.wrapping_sub(1))
            .copied()
            .map(|c| c.is_whitespace() || c == '{' || c == '}')
            .unwrap_or(true);
    prev_ok && parse_modifiers(chars, index).is_some()
}

fn keycode_for_token_name(name: &str) -> Option<i32> {
    match name {
        "ENTER" | "RETURN" => Some(36),
        "TAB" => Some(48),
        "SPACE" => Some(49),
        "BACKSPACE" | "BKSP" => Some(51),
        "DELETE" | "DEL" => Some(117),
        "ESC" | "ESCAPE" => Some(53),
        "HOME" => Some(115),
        "END" => Some(119),
        "PGUP" | "PAGEUP" => Some(116),
        "PGDN" | "PAGEDOWN" => Some(121),
        "INSERT" | "INS" => Some(114),
        "CAPSLOCK" => Some(57),
        "NUMLOCK" => Some(71),
        "SCROLLLOCK" => Some(107),
        "BREAK" | "PAUSE" => Some(71),
        "HELP" => Some(114),
        "PRTSC" | "PTRSC" | "PRINTSCREEN" => Some(105),
        "ADD" => Some(69),
        "SUBTRACT" => Some(78),
        "MULTIPLY" => Some(67),
        "DIVIDE" => Some(75),
        "LEFTBRACE" | "[" => Some(33),
        "RIGHTBRACE" | "]" => Some(30),
        "LEFTPAREN" | "(" => Some(33),
        "RIGHTPAREN" | ")" => Some(30),
        "UP" => Some(126),
        "DOWN" => Some(125),
        "LEFT" => Some(123),
        "RIGHT" => Some(124),
        "F1" => Some(122),
        "F2" => Some(120),
        "F3" => Some(99),
        "F4" => Some(118),
        "F5" => Some(96),
        "F6" => Some(97),
        "F7" => Some(98),
        "F8" => Some(100),
        "F9" => Some(101),
        "F10" => Some(109),
        "F11" => Some(103),
        "F12" => Some(111),
        "F13" => Some(105),
        "F14" => Some(107),
        "F15" => Some(113),
        "F16" => Some(106),
        "F17" => Some(64),
        "F18" => Some(79),
        "F19" => Some(80),
        "F20" => Some(90),
        "WIN" | "CMD" | "COMMAND" => Some(55),
        "LWIN" | "RWIN" => Some(55),
        "APPS" => Some(110),
        _ => None,
    }
}

fn keycode_for_char(ch: char) -> Option<(i32, Modifiers)> {
    let result = match ch {
        'a' | 'A' => Some((0, Modifiers::default())),
        's' | 'S' => Some((1, Modifiers::default())),
        'd' | 'D' => Some((2, Modifiers::default())),
        'f' | 'F' => Some((3, Modifiers::default())),
        'h' | 'H' => Some((4, Modifiers::default())),
        'g' | 'G' => Some((5, Modifiers::default())),
        'z' | 'Z' => Some((6, Modifiers::default())),
        'x' | 'X' => Some((7, Modifiers::default())),
        'c' | 'C' => Some((8, Modifiers::default())),
        'v' | 'V' => Some((9, Modifiers::default())),
        'b' | 'B' => Some((11, Modifiers::default())),
        'q' | 'Q' => Some((12, Modifiers::default())),
        'w' | 'W' => Some((13, Modifiers::default())),
        'e' | 'E' => Some((14, Modifiers::default())),
        'r' | 'R' => Some((15, Modifiers::default())),
        'y' | 'Y' => Some((16, Modifiers::default())),
        't' | 'T' => Some((17, Modifiers::default())),
        '1' => Some((18, Modifiers::default())),
        '2' => Some((19, Modifiers::default())),
        '3' => Some((20, Modifiers::default())),
        '4' => Some((21, Modifiers::default())),
        '6' => Some((22, Modifiers::default())),
        '5' => Some((23, Modifiers::default())),
        '=' => Some((24, Modifiers::default())),
        '9' => Some((25, Modifiers::default())),
        '7' => Some((26, Modifiers::default())),
        '-' => Some((27, Modifiers::default())),
        '8' => Some((28, Modifiers::default())),
        '0' => Some((29, Modifiers::default())),
        ']' => Some((30, Modifiers::default())),
        'o' | 'O' => Some((31, Modifiers::default())),
        'u' | 'U' => Some((32, Modifiers::default())),
        '[' => Some((33, Modifiers::default())),
        'i' | 'I' => Some((34, Modifiers::default())),
        'p' | 'P' => Some((35, Modifiers::default())),
        'l' | 'L' => Some((37, Modifiers::default())),
        'j' | 'J' => Some((38, Modifiers::default())),
        '\'' => Some((39, Modifiers::default())),
        'k' | 'K' => Some((40, Modifiers::default())),
        ';' => Some((41, Modifiers::default())),
        '\\' => Some((42, Modifiers::default())),
        ',' => Some((43, Modifiers::default())),
        '/' => Some((44, Modifiers::default())),
        'n' | 'N' => Some((45, Modifiers::default())),
        'm' | 'M' => Some((46, Modifiers::default())),
        '.' => Some((47, Modifiers::default())),
        '`' => Some((50, Modifiers::default())),
        ' ' => Some((49, Modifiers::default())),
        '!' => Some((18, Modifiers(Modifiers::SHIFT))),
        '@' => Some((19, Modifiers(Modifiers::SHIFT))),
        '#' => Some((20, Modifiers(Modifiers::SHIFT))),
        '$' => Some((21, Modifiers(Modifiers::SHIFT))),
        '%' => Some((23, Modifiers(Modifiers::SHIFT))),
        '^' => Some((22, Modifiers(Modifiers::SHIFT))),
        '&' => Some((26, Modifiers(Modifiers::SHIFT))),
        '*' => Some((28, Modifiers(Modifiers::SHIFT))),
        '(' => Some((25, Modifiers(Modifiers::SHIFT))),
        ')' => Some((29, Modifiers(Modifiers::SHIFT))),
        '_' => Some((27, Modifiers(Modifiers::SHIFT))),
        '+' => Some((24, Modifiers(Modifiers::SHIFT))),
        '{' => Some((33, Modifiers(Modifiers::SHIFT))),
        '}' => Some((30, Modifiers(Modifiers::SHIFT))),
        ':' => Some((41, Modifiers(Modifiers::SHIFT))),
        '"' => Some((39, Modifiers(Modifiers::SHIFT))),
        '<' => Some((43, Modifiers(Modifiers::SHIFT))),
        '>' => Some((47, Modifiers(Modifiers::SHIFT))),
        '?' => Some((44, Modifiers(Modifiers::SHIFT))),
        '~' => Some((50, Modifiers(Modifiers::SHIFT))),
        '|' => Some((42, Modifiers(Modifiers::SHIFT))),
        _ => None,
    };
    result
}

fn placeholder_value(name: &str, ctx: &HashMap<String, String>) -> Option<String> {
    let upper = name.trim().to_uppercase();
    if let Some(value) = ctx.get(&upper) {
        return Some(value.clone());
    }

    match upper.as_str() {
        "USERNAME" | "USER" | "PASSWORD" | "PASS" | "URL" | "TITLE" | "NAME" | "TOTP" | "OTP"
        | "EMAIL" | "NOTES" => Some(String::new()),
        _ => None,
    }
}

fn parse_token(
    token: &str,
    modifiers: Modifiers,
    ctx: &HashMap<String, String>,
) -> Result<Option<Operation>, String> {
    let token_trim = token.trim();
    if token_trim.is_empty() {
        return Ok(None);
    }

    let token_up = token_trim.to_uppercase();
    if token_up.starts_with("DELAY") {
        let num = token_trim
            .chars()
            .skip(5)
            .collect::<String>()
            .trim_start_matches(|c: char| c == ' ' || c == '=' || c == ':')
            .parse::<u64>()
            .unwrap_or(0);
        return Ok(Some(Operation::Delay(num)));
    }

    if token_up == "CLEARCLIPBOARD" {
        return Ok(Some(Operation::ClearClipboard));
    }

    if token_up == "CLEARFIELD" {
        return Ok(Some(Operation::ClearField));
    }

    if let Some(code) = keycode_for_token_name(token_up.as_str()) {
        return Ok(Some(Operation::Key { code, modifiers }));
    }

    if let Some(value) = placeholder_value(token_trim, ctx) {
        if value.is_empty() {
            return Ok(None);
        }
        if modifiers.is_empty() {
            return Ok(Some(Operation::Text(value)));
        }
        if value.chars().count() == 1 {
            if let Some((code, extra)) = keycode_for_char(value.chars().next().unwrap()) {
                return Ok(Some(Operation::Key {
                    code,
                    modifiers: modifiers.union(extra),
                }));
            }
        }
        return Ok(Some(Operation::Text(value)));
    }

    if token_trim.chars().count() == 1 {
        if let Some((code, extra)) = keycode_for_char(token_trim.chars().next().unwrap()) {
            return Ok(Some(Operation::Key {
                code,
                modifiers: modifiers.union(extra),
            }));
        }
    }

    if token_up.starts_with("BEEP")
        || token_up.starts_with("VKEY")
        || token_up.starts_with("APPACTIVATE")
        || token_up.starts_with("C:")
        || token_up.starts_with("MODE=")
        || token_up.starts_with("PICKCHARS")
        || token_up.starts_with("T-CONV:")
        || token_up.starts_with("T-REPLACE-RX:")
    {
        return Ok(None);
    }

    Err(format!("Unsupported AutoType token: {{{}}}", token_trim))
}

fn parse_sequence(seq: &str, ctx: &HashMap<String, String>) -> Result<Vec<Operation>, String> {
    let mut ops = Vec::new();
    let mut i = 0;
    let sequence = seq.replace("{{}", "{").replace("{}}", "}");
    let chars: Vec<char> = sequence.chars().collect();
    let n = chars.len();

    while i < n {
        if chars[i] == '{' {
            if i + 1 < n && chars[i + 1] == '{' {
                ops.push(Operation::Text("{".to_string()));
                i += 2;
                continue;
            }

            let end = (i + 1..n)
                .find(|&k| chars[k] == '}')
                .ok_or_else(|| "Unclosed AutoType token".to_string())?;
            let token: String = chars[i + 1..end].iter().collect();
            if let Some(op) = parse_token(&token, Modifiers::default(), ctx)? {
                ops.push(op);
            }
            i = end + 1;
            continue;
        }

        if let Some((modifiers, consumed)) = parse_modifiers(&chars, i) {
            let next = i + consumed;
            if next < n {
                if chars[next] == '{' {
                    let end = (next + 1..n)
                        .find(|&k| chars[k] == '}')
                        .ok_or_else(|| "Unclosed AutoType token".to_string())?;
                    let token: String = chars[next + 1..end].iter().collect();
                    if let Some(op) = parse_token(&token, modifiers, ctx)? {
                        ops.push(op);
                    }
                    i = end + 1;
                    continue;
                }

                if let Some((code, extra)) = keycode_for_char(chars[next]) {
                    ops.push(Operation::Key {
                        code,
                        modifiers: modifiers.union(extra),
                    });
                    i = next + 1;
                    continue;
                }
            }
        }

        let start = i;
        let mut text = String::new();
        while i < n {
            if chars[i] == '{' {
                if i + 1 < n && chars[i + 1] == '{' {
                    text.push('{');
                    i += 2;
                    continue;
                }
                break;
            }
            if chars[i] == '}' && i + 1 < n && chars[i + 1] == '}' {
                text.push('}');
                i += 2;
                continue;
            }
            if is_prefix_combo_start(&chars, i) {
                break;
            }
            text.push(chars[i]);
            i += 1;
        }

        if text.is_empty() && i == start {
            text.push(chars[i]);
            i += 1;
        }

        if !text.is_empty() {
            ops.push(Operation::Text(text));
        }
    }

    Ok(ops)
}

#[tauri::command]
pub fn perform_sequence(
    sequence: String,
    context: Option<String>,
    timeout: Option<u32>,
) -> Result<u32, String> {
    #[cfg(not(target_os = "macos"))]
    {
        return Err("perform_sequence not supported on this platform".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let mut ctx_map: HashMap<String, String> = HashMap::new();
        if let Some(ctx_json) = context {
            if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(&ctx_json) {
                ctx_map = map;
            }
        }

        if !unsafe { mac::is_accessibility_enabled() } {
            return Err("Accessibility permission is required for AutoType".to_string());
        }

        let ops = parse_sequence(&sequence, &ctx_map)?;
        for op in ops {
            match op {
                Operation::Text(t) => {
                    let c = CString::new(t).map_err(|e| e.to_string())?;
                    let r = unsafe { mac::send_text(c.as_ptr()) };
                    if r != 0 {
                        return Err(format!("send_text failed code {}", r));
                    }
                    sleep(Duration::from_millis(50));
                }
                Operation::Key { code, modifiers } => {
                    let r = unsafe {
                        if modifiers.is_empty() {
                            mac::send_keycode(code as i32)
                        } else {
                            mac::send_keycode_with_modifiers(code as i32, modifiers.to_mask())
                        }
                    };
                    if r != 0 {
                        return Err(format!("send_keycode failed code {}", r));
                    }
                    sleep(Duration::from_millis(30));
                }
                Operation::Delay(ms) => {
                    sleep(Duration::from_millis(ms));
                }
                Operation::ClearClipboard => {
                    let _ = unsafe { mac::clear_clipboard_after(0) };
                }
                Operation::ClearField => {
                    let _ =
                        unsafe { mac::send_keycode_with_modifiers(0, Modifiers::COMMAND as i32) };
                    let _ = unsafe { mac::send_keycode(51) };
                    sleep(Duration::from_millis(30));
                }
            }
        }

        let _ = timeout;
        Ok(0)
    }
}

#[tauri::command]
pub fn get_frontmost_window_title() -> Result<String, String> {
    #[cfg(not(target_os = "macos"))]
    {
        Err("Active window title is only available on macOS".to_string())
    }

    #[cfg(target_os = "macos")]
    {
        let value = unsafe { mac::get_frontmost_window_title() };
        if value.is_null() {
            return Ok(String::new());
        }

        let title = unsafe { CStr::from_ptr(value) }
            .to_string_lossy()
            .into_owned();
        unsafe { mac::free_c_string(value) };
        Ok(title)
    }
}

#[tauri::command]
pub fn trigger_autotype(entry_id: u64) -> Result<(), String> {
    println!("trigger_autotype called for entry {} (no-op)", entry_id);
    Ok(())
}

#[allow(dead_code)]
#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .and_then(|mut child| {
                use std::io::Write;
                child.stdin.as_mut().map(|stdin| {
                    let _ = stdin.write_all(text.as_bytes());
                });
                Ok(())
            })
            .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Copy to clipboard not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn copy_username(username: String) -> Result<(), String> {
    copy_to_clipboard(username)?;
    // Clear clipboard after default timeout
    let t = DEFAULT_CLIPBOARD_TIMEOUT.load(Ordering::SeqCst);
    #[cfg(target_os = "macos")]
    {
        let _ = unsafe { mac::clear_clipboard_after(t as i32) };
    }
    Ok(())
}

#[tauri::command]
pub fn copy_password(password: String) -> Result<(), String> {
    copy_to_clipboard(password)?;
    // Clear clipboard after default timeout
    let t = DEFAULT_CLIPBOARD_TIMEOUT.load(Ordering::SeqCst);
    #[cfg(target_os = "macos")]
    {
        let _ = unsafe { mac::clear_clipboard_after(t as i32) };
    }
    Ok(())
}

#[tauri::command]
pub fn open_system_prefs(pane: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let url = match pane.to_lowercase().as_str() {
            "accessibility" => {
                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            }
            _ => return Err("Unknown preference pane".to_string()),
        };

        Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open System Preferences: {}", e))?;

        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("System preferences not available on this platform".to_string())
    }
}
