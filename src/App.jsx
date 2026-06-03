import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import LoginView from "./views/LoginView";
import VaultView from "./views/VaultView";
import SettingsView from "./views/SettingsView";
// import {
//   buildAutotypeCandidates,
//   buildAutotypeSearchCandidates,
//   getAutotypeSequence,
//   isRecentAutotypeMatch,
//   normalizeAutotypeText,
// } from './utils/autotype'
import "./App.css";

const isTauriAvailable = () => {
  return typeof window !== "undefined" && window.__TAURI__;
};

function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);
  const [vault, setVault] = useState([]);
  const [masterKey, setMasterKey] = useState(null);
  const [masterPassword, setMasterPassword] = useState(null);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessibilityGranted, setAccessibilityGranted] = useState(false);
  const [accessibilityLoading, setAccessibilityLoading] = useState(false);
  // const [autotypeChooser, setAutotypeChooser] = useState(null)
  // const [lastAutotypeMatch, setLastAutotypeMatch] = useState(null)

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      setMasterPassword(password);

      if (isTauriAvailable()) {
        try {
          await invoke("init_default_hotkeys");
        } catch (e) {
          console.warn("Could not initialize default hotkeys:", e);
        }
      }

      if (!isTauriAvailable()) {
        throw new Error(
          "Tauri not available. Please ensure the app is running as a native app.",
        );
      }
      const vaultJson = await invoke("load_vault", { email, password });
      const loadedVault = JSON.parse(vaultJson);

      setUser({ email, authenticated: true });
      setMasterKey(null);
      setVault(loadedVault);
      setActiveEntryId(loadedVault[0]?.id ?? null);
      setView("vault");
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMasterKey(null);
    setVault([]);
    setActiveEntryId(null);
    setAccessibilityGranted(false);
    setView("login");
  };

  const handleRequestAccessibility = async () => {
    try {
      setAccessibilityLoading(true);
      console.log("[AccessibilityRequest] Starting request...");

      let isDevMode = false;
      try {
        isDevMode = await invoke("is_dev_mode");
        console.log("[AccessibilityRequest] Dev mode?", isDevMode);
      } catch (e) {
        console.warn("[AccessibilityRequest] Could not determine dev mode:", e);
      }

      let currentlyEnabled = false;
      try {
        currentlyEnabled = await invoke("is_accessibility_enabled");
        console.log(
          "[AccessibilityRequest] Currently enabled?",
          currentlyEnabled,
        );
        if (currentlyEnabled) {
          console.log("[AccessibilityRequest] ✓ Already enabled!");
          setAccessibilityGranted(true);
          setAccessibilityLoading(false);
          return;
        }
      } catch (e) {
        console.error(
          "[AccessibilityRequest] Error checking current state:",
          e,
        );
        throw new Error(`Failed to check current permission: ${e}`);
      }

      if (isDevMode && currentlyEnabled) {
        console.log(
          "[AccessibilityRequest] ✓ Dev mode with accessibility enabled!",
        );
        setAccessibilityGranted(true);
        setAccessibilityLoading(false);
        return;
      }

      console.log(
        "[AccessibilityRequest] Calling request_accessibility backend command...",
      );
      try {
        await invoke("request_accessibility");
        console.log("[AccessibilityRequest] Backend command completed");
      } catch (e) {
        console.error(
          "[AccessibilityRequest] Backend error calling request_accessibility:",
          e,
        );
        throw new Error(`Backend failed: ${e}`);
      }

      console.log(
        "[AccessibilityRequest] Waiting 5 seconds for user to respond to dialog...",
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));

      console.log(
        "[AccessibilityRequest] Checking permission status after dialog...",
      );
      let isNowEnabled = false;
      try {
        isNowEnabled = await invoke("is_accessibility_enabled");
        console.log(
          "[AccessibilityRequest] Permission check result:",
          isNowEnabled,
        );
      } catch (e) {
        console.error(
          "[AccessibilityRequest] Error checking permission status:",
          e,
        );
        throw new Error(`Failed to verify permission: ${e}`);
      }

      if (isNowEnabled) {
        console.log("[AccessibilityRequest] ✓ Permission CONFIRMED granted!");
        setAccessibilityGranted(true);
      } else {
        console.log(
          "[AccessibilityRequest] ✗ Permission NOT granted. Opening System Preferences...",
        );
        setAccessibilityGranted(false);
        try {
          await invoke("open_system_prefs", { pane: "accessibility" });
        } catch (e) {
          console.warn(
            "[AccessibilityRequest] Could not open system prefs:",
            e,
          );
        }
      }
    } catch (e) {
      console.error("[AccessibilityRequest] Error:", e.message);
      setAccessibilityGranted(false);
    } finally {
      setAccessibilityLoading(false);
    }
  };

  const handleAddPassword = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    const updatedVault = [...vault, newEntry];

    try {
      await invoke("save_vault", {
        email: user.email,
        vaultData: JSON.stringify(updatedVault),
        password: masterPassword,
      });
      setVault(updatedVault);
      setActiveEntryId(newEntry.id);
      return newEntry;
    } catch (err) {
      console.error("Failed to save vault:", err);
      throw err;
    }
  };

  const handleDeletePassword = async (entryId) => {
    const updatedVault = vault.filter((e) => e.id !== entryId);

    try {
      await invoke("save_vault", {
        email: user.email,
        vaultData: JSON.stringify(updatedVault),
        password: masterPassword,
      });
      setVault(updatedVault);
      if (activeEntryId === entryId) {
        setActiveEntryId(updatedVault[0]?.id ?? null);
      }
    } catch (err) {
      console.error("Failed to save vault:", err);
      throw err;
    }
  };

  const handleUpdatePassword = async (updatedEntry) => {
    const updatedVault = vault.map((e) =>
      e.id === updatedEntry.id ? updatedEntry : e,
    );

    try {
      await invoke("save_vault", {
        email: user.email,
        vaultData: JSON.stringify(updatedVault),
        password: masterPassword,
      });
      setVault(updatedVault);
      if (activeEntryId === updatedEntry.id) {
        setActiveEntryId(updatedEntry.id);
      }
      return updatedEntry;
    } catch (err) {
      console.error("Failed to save vault:", err);
      throw err;
    }
  };

  // const performAutotype = async (entry, sequence = getAutotypeSequence(entry), meta = {}) => {
  //   if (!entry) return
  //   const context = {
  //     USERNAME: entry.username || '',
  //     PASSWORD: entry.password || '',
  //     URL: entry.url || '',
  //     TITLE: entry.name || '',
  //     TOTP: entry.totp || ''
  //   }
  //   await invoke('perform_sequence', {
  //     sequence,
  //     context: JSON.stringify(context),
  //     timeout: null
  //   })
  //   setLastAutotypeMatch({
  //     entryId: entry.id,
  //     sequence,
  //     windowTitle: meta.windowTitle || '',
  //     timestamp: Date.now()
  //   })
  // }

  // Hotkey listener — autotype actions disabled
  useEffect(() => {
    if (!user) return;

    let unlistener = null;

    const setupListener = async () => {
      try {
        unlistener = await listen("hotkey_triggered", (event) => {
          const action = event.payload.action;
          console.log("Hotkey triggered:", action);

          const entry = vault.find((v) => v.id === activeEntryId) || vault[0];
          if (entry) {
            // if (action === 'autotype') { ... } // autotype disabled
            if (action === "copy_username") {
              invoke("copy_username", { username: entry.username || "" }).catch(
                (e) => console.error("Copy failed:", e),
              );
            } else if (action === "copy_password") {
              invoke("copy_password", { password: entry.password || "" }).catch(
                (e) => console.error("Copy failed:", e),
              );
            }
          }
        });
      } catch (e) {
        console.warn("Could not set up hotkey listener:", e);
      }
    };

    setupListener();

    return () => {
      if (unlistener) unlistener();
    };
  }, [user, vault, activeEntryId]);

  // const chooserSource = autotypeChooser?.mode === 'search'
  //   ? autotypeChooser?.searchCandidates || []
  //   : autotypeChooser?.directCandidates || []

  // const chooserCandidates = autotypeChooser
  //   ? chooserSource.filter((candidate) => { ... })
  //   : []

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary font-sans">
      {!user ? (
        <LoginView onLogin={handleLogin} loading={loading} />
      ) : view === "vault" ? (
        <VaultView
          user={user}
          vault={vault}
          masterKey={masterKey}
          onAddPassword={handleAddPassword}
          onUpdatePassword={handleUpdatePassword}
          onDeletePassword={handleDeletePassword}
          activeEntryId={activeEntryId}
          onActiveEntryChange={setActiveEntryId}
          onSettings={() => setView("settings")}
          onLogout={handleLogout}
          accessibilityGranted={accessibilityGranted}
          accessibilityLoading={accessibilityLoading}
          onRequestAccessibility={handleRequestAccessibility}
        />
      ) : (
        <SettingsView
          user={user}
          onBack={() => setView("vault")}
          onLogout={handleLogout}
          accessibilityGranted={accessibilityGranted}
          accessibilityLoading={accessibilityLoading}
          onRequestAccessibility={handleRequestAccessibility}
        />
      )}

      {/* Autotype chooser UI disabled
      {autotypeChooser && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setAutotypeChooser(null)}
        >
          ...
        </div>
      )}
      */}
    </div>
  );
}

export default App;
