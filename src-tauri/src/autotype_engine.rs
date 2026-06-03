// AutoType Engine - Inspired by KeePassXC
// Handles sequence parsing and execution
// Based on KeePassXC's AutoType implementation (GPL-3)
// https://github.com/keepassxreboot/keepassxc

use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct AutoTypeAction {
    pub action_type: ActionType,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ActionType {
    Text(String),
    Key(String),
    Delay(u32),
    Tab,
    Enter,
    Backspace,
    Delete,
    Space,
    Up,
    Down,
    Left,
    Right,
    Home,
    End,
    PageUp,
    PageDown,
    Insert,
    Escape,
    CapsLock,
    NumLock,
    ScrollLock,
    F(u8), // F1-F16
    Placeholder(String), // {USERNAME}, {PASSWORD}, etc
}

pub struct AutoTypeEngine;

impl AutoTypeEngine {
    // Parse KeePassXC-style sequence into actions
    // Examples: {USERNAME}{TAB}{PASSWORD}{ENTER}
    //           {USERNAME} TAB {PASSWORD} ENTER
    pub fn parse_sequence(sequence: &str, context: &HashMap<String, String>) -> Result<Vec<AutoTypeAction>, String> {
        let mut actions = Vec::new();
        let mut i = 0;
        let chars: Vec<char> = sequence.chars().collect();

        while i < chars.len() {
            if chars[i] == '{' {
                // Parse placeholder or command
                let start = i;
                i += 1;
                let mut placeholder = String::new();

                while i < chars.len() && chars[i] != '}' {
                    placeholder.push(chars[i]);
                    i += 1;
                }

                if i >= chars.len() {
                    return Err("Unclosed placeholder".to_string());
                }

                i += 1; // skip closing }

                let placeholder_upper = placeholder.to_uppercase();
                let action = Self::parse_placeholder(&placeholder_upper, context)?;
                actions.push(action);
            } else if chars[i].is_whitespace() {
                i += 1;
            } else {
                // Collect plain text
                let start = i;
                let mut text = String::new();

                while i < chars.len() && chars[i] != '{' && !chars[i].is_whitespace() {
                    text.push(chars[i]);
                    i += 1;
                }

                if !text.is_empty() {
                    actions.push(AutoTypeAction {
                        action_type: ActionType::Text(text),
                        value: String::new(),
                    });
                }
            }
        }

        Ok(actions)
    }

    fn parse_placeholder(placeholder: &str, context: &HashMap<String, String>) -> Result<AutoTypeAction, String> {
        // Handle KeePassXC placeholders and special keys
        match placeholder {
            "TAB" => Ok(AutoTypeAction {
                action_type: ActionType::Tab,
                value: String::new(),
            }),
            "ENTER" => Ok(AutoTypeAction {
                action_type: ActionType::Enter,
                value: String::new(),
            }),
            "RETURN" => Ok(AutoTypeAction {
                action_type: ActionType::Enter,
                value: String::new(),
            }),
            "BACKSPACE" | "BS" | "BKSP" => Ok(AutoTypeAction {
                action_type: ActionType::Backspace,
                value: String::new(),
            }),
            "DELETE" | "DEL" => Ok(AutoTypeAction {
                action_type: ActionType::Delete,
                value: String::new(),
            }),
            "SPACE" => Ok(AutoTypeAction {
                action_type: ActionType::Space,
                value: String::new(),
            }),
            "UP" => Ok(AutoTypeAction {
                action_type: ActionType::Up,
                value: String::new(),
            }),
            "DOWN" => Ok(AutoTypeAction {
                action_type: ActionType::Down,
                value: String::new(),
            }),
            "LEFT" => Ok(AutoTypeAction {
                action_type: ActionType::Left,
                value: String::new(),
            }),
            "RIGHT" => Ok(AutoTypeAction {
                action_type: ActionType::Right,
                value: String::new(),
            }),
            "HOME" => Ok(AutoTypeAction {
                action_type: ActionType::Home,
                value: String::new(),
            }),
            "END" => Ok(AutoTypeAction {
                action_type: ActionType::End,
                value: String::new(),
            }),
            "PGUP" | "PAGEUP" => Ok(AutoTypeAction {
                action_type: ActionType::PageUp,
                value: String::new(),
            }),
            "PGDN" | "PAGEDOWN" => Ok(AutoTypeAction {
                action_type: ActionType::PageDown,
                value: String::new(),
            }),
            "INSERT" | "INS" => Ok(AutoTypeAction {
                action_type: ActionType::Insert,
                value: String::new(),
            }),
            "ESC" | "ESCAPE" => Ok(AutoTypeAction {
                action_type: ActionType::Escape,
                value: String::new(),
            }),
            "CAPSLOCK" => Ok(AutoTypeAction {
                action_type: ActionType::CapsLock,
                value: String::new(),
            }),
            "NUMLOCK" => Ok(AutoTypeAction {
                action_type: ActionType::NumLock,
                value: String::new(),
            }),
            "SCROLLLOCK" => Ok(AutoTypeAction {
                action_type: ActionType::ScrollLock,
                value: String::new(),
            }),
            "USERNAME" => Ok(AutoTypeAction {
                action_type: ActionType::Placeholder("USERNAME".to_string()),
                value: context.get("USERNAME").cloned().unwrap_or_default(),
            }),
            "PASSWORD" => Ok(AutoTypeAction {
                action_type: ActionType::Placeholder("PASSWORD".to_string()),
                value: context.get("PASSWORD").cloned().unwrap_or_default(),
            }),
            "URL" => Ok(AutoTypeAction {
                action_type: ActionType::Placeholder("URL".to_string()),
                value: context.get("URL").cloned().unwrap_or_default(),
            }),
            "TOTP" => Ok(AutoTypeAction {
                action_type: ActionType::Placeholder("TOTP".to_string()),
                value: context.get("TOTP").cloned().unwrap_or_default(),
            }),
            "TITLE" => Ok(AutoTypeAction {
                action_type: ActionType::Placeholder("TITLE".to_string()),
                value: context.get("TITLE").cloned().unwrap_or_default(),
            }),
            "NOTES" => Ok(AutoTypeAction {
                action_type: ActionType::Placeholder("NOTES".to_string()),
                value: context.get("NOTES").cloned().unwrap_or_default(),
            }),
            p if p.starts_with("F") && p.len() <= 3 => {
                if let Ok(num) = p[1..].parse::<u8>() {
                    if num >= 1 && num <= 16 {
                        return Ok(AutoTypeAction {
                            action_type: ActionType::F(num),
                            value: String::new(),
                        });
                    }
                }
                Err(format!("Invalid function key: {}", p))
            }
            p if p.starts_with("DELAY=") => {
                if let Ok(delay) = p[6..].parse::<u32>() {
                    Ok(AutoTypeAction {
                        action_type: ActionType::Delay(delay),
                        value: String::new(),
                    })
                } else {
                    Err(format!("Invalid delay: {}", p))
                }
            }
            _ => Err(format!("Unknown placeholder: {}", placeholder)),
        }
    }

    // Validate sequence syntax
    pub fn validate_sequence(sequence: &str) -> Result<(), String> {
        let mut i = 0;
        let chars: Vec<char> = sequence.chars().collect();
        let mut depth = 0;

        while i < chars.len() {
            if chars[i] == '{' {
                depth += 1;
                if depth > 1 {
                    return Err("Nested placeholders not allowed".to_string());
                }
            } else if chars[i] == '}' {
                depth -= 1;
                if depth < 0 {
                    return Err("Unmatched closing brace".to_string());
                }
            }
            i += 1;
        }

        if depth != 0 {
            return Err("Unclosed placeholder".to_string());
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_sequence() {
        let mut ctx = HashMap::new();
        ctx.insert("USERNAME".to_string(), "user@example.com".to_string());
        ctx.insert("PASSWORD".to_string(), "password123".to_string());

        let sequence = "{USERNAME}{TAB}{PASSWORD}{ENTER}";
        let actions = AutoTypeEngine::parse_sequence(sequence, &ctx).unwrap();

        assert_eq!(actions.len(), 4);
    }

    #[test]
    fn test_validate_sequence() {
        assert!(AutoTypeEngine::validate_sequence("{USERNAME}{TAB}{PASSWORD}").is_ok());
        assert!(AutoTypeEngine::validate_sequence("{USERNAME}{{PASSWORD}}").is_err());
        assert!(AutoTypeEngine::validate_sequence("{USERNAME}").is_ok());
    }
}
