import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Visibility,
  VisibilityOff,
  ContentCopy,
  // PlayArrow,
  // Save,
  // RestartAlt,
  // KeyboardAlt,
  // RocketLaunch,
  // AutoAwesome,
  // Article,
} from "@mui/icons-material";
import PasswordGenerator from "../components/PasswordGenerator";
// import {
//   DEFAULT_AUTOTYPE_SEQUENCE,
//   getAutotypeAssociations,
//   getAutotypeEnabled,
//   getAutotypeSequence,
// } from "../utils/autotype";
import {
  faFolderOpen,
  faStar,
  faClock,
  faKey,
  faCreditCard,
  faNoteSticky,
  faCog,
  faSignOutAlt,
  faLock,
  faXmark,
  faPencil,
  faTrash,
  faMagic,
  // faKeyboard,
} from "@fortawesome/free-solid-svg-icons";
import HashVisualizer from "../components/HashVisualizer";
// import AutoTypeDialog from '../components/AutoTypeDialog'

export default function VaultView({
  user,
  vault,
  masterKey,
  onAddPassword,
  onUpdatePassword,
  onDeletePassword,
  onSettings,
  onLogout,
  // accessibilityGranted,
  // accessibilityLoading,
  // onRequestAccessibility,
  // activeEntryId,
  onActiveEntryChange,
}) {
  const [search, setSearch] = useState("");
  const [activePane, setActivePane] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showHashVisualizer, setShowHashVisualizer] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // const [showAutoTypeDialog, setShowAutoTypeDialog] = useState(false)
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  const handleSelectEntry = (entry) => {
    setSelectedEntry(entry);
    onActiveEntryChange?.(entry.id);
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const password = formData.password.trim();
    if (name && password) {
      try {
        setIsAdding(true);
        await onAddPassword({ ...formData, name, password });
        setFormData({
          name: "",
          username: "",
          password: "",
          url: "",
          notes: "",
        });
        setShowAddForm(false);
      } catch (err) {
        const message =
          typeof err === "string"
            ? err
            : err?.message || "Failed to save new item";
        setNotification({ type: "error", message });
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setIsAdding(false);
      }
    }
  };

  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setFormData({
      name: entry.name,
      username: entry.username || "",
      password: entry.password,
      url: entry.url || "",
      notes: entry.notes || "",
    });
    setShowEditForm(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setShowConfirmSave(true);
  };

  const confirmSaveEdit = async () => {
    if (formData.name && formData.password) {
      setIsSaving(true);
      setErrorMessage("");
      try {
        const updatedEntry = { ...editingEntry, ...formData };
        await onUpdatePassword(updatedEntry);
        setFormData({
          name: "",
          username: "",
          password: "",
          url: "",
          notes: "",
        });
        setShowEditForm(false);
        setEditingEntry(null);
        setShowConfirmSave(false);
        setSelectedEntry(updatedEntry);
      } catch (err) {
        console.error("Failed to save changes:", err);
        const message =
          typeof err === "string"
            ? err
            : err?.message || "Failed to save changes. Please try again.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (
      confirm(
        "Are you sure you want to delete this entry? This action cannot be undone.",
      )
    ) {
      try {
        await onDeletePassword(entryId);
        setSelectedEntry(null);
      } catch (err) {
        const message =
          typeof err === "string"
            ? err
            : err?.message || "Failed to delete item";
        setNotification({ type: "error", message });
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setNotification({
          type: "success",
          message: `${label} copied to clipboard`,
        });
        setTimeout(() => setNotification(null), 2000);
      })
      .catch(() => {
        setNotification({
          type: "error",
          message: "Failed to copy to clipboard",
        });
        setTimeout(() => setNotification(null), 2000);
      });
  };

  // const handleAutoType = async (entry) => { ... } // disabled

  const isFavorite = (entry) =>
    Boolean(
      entry.favorite || entry.favourite || entry.isFavorite || entry.starred,
    );
  const loginsCount = vault.filter((e) => !e.type || e.type === "login").length;
  const cardsCount = vault.filter((e) => e.type === "card").length;
  const notesCount = vault.filter((e) => e.type === "note").length;
  const favoritesCount = vault.filter(isFavorite).length;
  const recentVault = [...vault]
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    .slice(0, 10);
  const recentCount = recentVault.length;

  const paneTitleMap = {
    all: "All Items",
    favorites: "Favorites",
    recent: "Recently Used",
    generator: "Password Generator",
    // autotype: 'AutoType', // disabled
    logins: "Logins",
    cards: "Cards",
    notes: "Notes",
  };

  let paneVault = vault;
  if (activePane === "favorites") paneVault = vault.filter(isFavorite);
  if (activePane === "recent") paneVault = recentVault;
  if (activePane === "logins")
    paneVault = vault.filter((e) => !e.type || e.type === "login");
  if (activePane === "cards")
    paneVault = vault.filter((e) => e.type === "card");
  if (activePane === "notes")
    paneVault = vault.filter((e) => e.type === "note");
  if (activePane === "generator") paneVault = [];

  const filteredVault = paneVault.filter(
    (entry) =>
      (entry.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (entry.username || "").toLowerCase().includes(search.toLowerCase()),
  );

  const switchPane = (pane) => {
    setActivePane(pane);
    setSelectedEntry(null);
    setShowHashVisualizer(false);
    setShowAddForm(false);
  };

  const selectedEntryIndex = selectedEntry
    ? vault.findIndex((v) => v.id === selectedEntry.id)
    : -1;

  return (
    <div className="flex h-screen bg-gradient-to-br from-bg-dark via-bg-primary to-bg-dark">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-64 border-r border-accent-cool/40 flex flex-col bg-gradient-to-b from-white/8 to-transparent backdrop-blur-lg"
      >
        {/* User Header */}
        <div className="p-4 border-b border-accent-cool/30 bg-gradient-to-r from-white/10 to-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cool to-blue-600 flex items-center justify-center text-bg-dark font-bold shadow-lg text-sm">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-secondary truncate">
                {user.email}
              </p>
              <p className="text-xs text-accent-cool font-semibold">
                Quantum Safe
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            icon={faFolderOpen}
            label="All Items"
            count={vault.length}
            active={activePane === "all"}
            onClick={() => switchPane("all")}
          />
          <NavItem
            icon={faStar}
            label="Favorites"
            count={favoritesCount}
            active={activePane === "favorites"}
            onClick={() => switchPane("favorites")}
          />
          <NavItem
            icon={faClock}
            label="Recently Used"
            count={recentCount}
            active={activePane === "recent"}
            onClick={() => switchPane("recent")}
          />
          <NavItem
            icon={faMagic}
            label="Generator"
            active={activePane === "generator"}
            onClick={() => switchPane("generator")}
          />
          {/* <NavItem icon={faKeyboard} label="AutoType" active={activePane === 'autotype'} onClick={() => switchPane('autotype')} /> */}

          <div className="border-t border-accent-cool/20 my-3" />

          <NavItem
            icon={faKey}
            label="Logins"
            count={loginsCount}
            active={activePane === "logins"}
            onClick={() => switchPane("logins")}
          />
          <NavItem
            icon={faCreditCard}
            label="Cards"
            count={cardsCount}
            active={activePane === "cards"}
            onClick={() => switchPane("cards")}
          />
          <NavItem
            icon={faNoteSticky}
            label="Notes"
            count={notesCount}
            active={activePane === "notes"}
            onClick={() => switchPane("notes")}
          />
        </nav>

        {/* Settings & Logout */}
        <div className="p-4 border-t border-accent-cool/30 bg-gradient-to-r from-white/8 to-white/4 space-y-2">
          <button
            onClick={onSettings}
            className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-white/15 active:bg-white/25 rounded-lg transition-all duration-150 flex items-center space-x-3 font-medium"
          >
            <FontAwesomeIcon icon={faCog} className="w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full px-4 py-2.5 text-left text-sm text-status-error hover:text-bg-dark hover:bg-status-error/30 hover:border-status-error active:bg-status-error/40 rounded-lg transition-all duration-150 flex items-center space-x-3 font-medium border border-status-error/50"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="w-4" />
            <span>Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          className="border-b border-border-light p-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              {paneTitleMap[activePane]}
            </h1>
            {activePane !== "generator" && (
              <p className="text-text-secondary text-sm">
                {paneVault.length} items in this pane
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* AutoType status indicator and button disabled
            {accessibilityGranted !== null && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${
                accessibilityGranted
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${accessibilityGranted ? 'bg-green-400' : 'bg-red-400'}`} />
                {accessibilityGranted ? 'AutoType Ready' : 'AutoType Disabled'}
              </div>
            )}
            {accessibilityGranted && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAutoTypeDialog(true)}
                className="px-4 py-2 bg-accent-cool/20 text-accent-cool font-semibold rounded-md hover:bg-accent-cool/30 transition flex items-center space-x-2 border border-accent-cool/40"
              >
                <FontAwesomeIcon icon={faKeyboard} className="w-4" />
                <span>AutoType</span>
              </motion.button>
            )}
            */}
            {activePane !== "generator" && activePane !== "autotype" ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2 bg-accent-cool text-bg-dark font-semibold rounded-md hover:opacity-90 transition flex items-center space-x-2"
              >
                <span>+</span>
                <span>New Item</span>
              </motion.button>
            ) : null}
          </div>
        </motion.div>

        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-6 mt-4 p-3 rounded-lg text-sm font-medium ${
              notification.type === "success"
                ? "bg-green-500/20 border border-green-500/40 text-green-300"
                : "bg-red-500/20 border border-red-500/40 text-red-300"
            }`}
          >
            {notification.message}
          </motion.div>
        )}

        {/* Search Bar */}
        {activePane !== "generator" && activePane !== "autotype" && (
          <div className="p-6 border-b border-accent-cool/20 bg-gradient-to-r from-white/5 to-transparent">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your vault..."
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
            />
          </div>
        )}

        {/* Accessibility Warning Banner — disabled (tied to autotype)
        {accessibilityGranted === false && (
          <motion.div ...>...</motion.div>
        )}
        */}

        {/* Vault Items / Generator */}
        <div className="flex-1 overflow-y-auto p-6">
          {activePane === "generator" ? (
            <PasswordGenerator />
          ) : (
            // activePane === 'autotype' pane disabled
            <div className="space-y-2">
              <AnimatePresence>
                {filteredVault.length > 0 ? (
                  filteredVault.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleSelectEntry(entry)}
                      className="p-4 bg-gradient-to-r from-white/10 to-white/5 border border-accent-cool/20 rounded-lg hover:border-accent-cool/50 hover:bg-white/15 active:bg-white/20 cursor-pointer transition-all duration-150 group shadow-md hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-10 h-10 rounded bg-gradient-to-br from-accent-cool to-accent-warm flex items-center justify-center text-lg text-bg-dark">
                            <FontAwesomeIcon icon={faLock} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-text-primary">
                              {entry.name}
                            </p>
                            <p className="text-sm text-text-muted">
                              {entry.username || "No username"}
                            </p>
                          </div>
                        </div>
                        <div className="text-text-muted group-hover:text-text-primary transition">
                          →
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-48 text-text-muted">
                    <p>No items found in {paneTitleMap[activePane]}</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Panel */}
      <AnimatePresence>
        {selectedEntry && (
          <ItemDetailPanel
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onShowHash={() => setShowHashVisualizer(true)}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            notification={notification}
            copyToClipboard={copyToClipboard}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            // onOpenAutotype disabled
          />
        )}
      </AnimatePresence>

      {/* Hash Visualizer Modal */}
      <AnimatePresence>
        {showHashVisualizer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHashVisualizer(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-bg-secondary to-bg-dark border border-accent-cool rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-accent-cool">
                  Encryption Layers
                </h2>
                <button
                  onClick={() => setShowHashVisualizer(false)}
                  className="text-text-muted hover:text-accent-cool hover:bg-bg-primary rounded-lg p-2 transition"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
              <HashVisualizer
                entry={selectedEntry}
                masterKey={masterKey}
                itemIndex={
                  selectedEntryIndex >= 0 ? selectedEntryIndex : undefined
                }
                userEmail={user?.email}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Form Modal */}
      <AnimatePresence>
        {showAddForm && activePane !== "autotype" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddForm(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-bg-secondary to-bg-dark border border-accent-cool rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-accent-cool mb-6">
                Add New Item
              </h2>
              <form onSubmit={handleAddEntry} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Password
                  </label>
                  <input
                    type="text"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="URL (optional)"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Notes (optional)
                  </label>
                  <textarea
                    placeholder="Notes (optional)"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-3 border border-accent-cool/50 rounded-lg text-text-primary hover:text-text-primary hover:bg-white/15 hover:border-accent-cool active:bg-white/25 transition-all duration-150 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-cool to-blue-600 text-bg-dark rounded-lg font-semibold hover:shadow-lg active:from-accent-cool/80 active:to-blue-700 transition-all duration-150"
                  >
                    {isAdding ? "Adding..." : "Add Item"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditForm(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-bg-secondary to-bg-dark border border-accent-cool rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-accent-cool mb-6">
                Edit Item
              </h2>
              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Password
                  </label>
                  <input
                    type="text"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="URL (optional)"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block bg-gradient-to-r from-accent-cool/30 to-transparent py-1.5 px-2.5 rounded-md">
                    Notes (optional)
                  </label>
                  <textarea
                    placeholder="Notes (optional)"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/30 transition-all duration-150 font-medium"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingEntry(null);
                      setFormData({
                        name: "",
                        username: "",
                        password: "",
                        url: "",
                        notes: "",
                      });
                    }}
                    className="flex-1 px-4 py-3 border border-accent-cool/50 rounded-lg text-text-primary hover:text-text-primary hover:bg-white/15 hover:border-accent-cool active:bg-white/25 transition-all duration-150 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-warm to-orange-600 text-bg-dark rounded-lg font-semibold hover:shadow-lg active:from-accent-warm/80 active:to-orange-700 transition-all duration-150"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Saving */}
      <AnimatePresence>
        {showConfirmSave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSaving && setShowConfirmSave(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-bg-secondary to-bg-dark border border-accent-cool rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-accent-cool mb-2">
                Save Changes?
              </h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to save the changes to this entry?
              </p>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-status-error/20 border border-status-error rounded-lg"
                >
                  <p className="text-sm text-status-error">{errorMessage}</p>
                </motion.div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmSave(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 border border-accent-cool/50 rounded-lg text-text-primary hover:text-text-primary hover:bg-white/15 hover:border-accent-cool active:bg-white/25 transition-all duration-150 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-cool to-blue-600 text-bg-dark rounded-lg font-semibold hover:shadow-lg active:from-accent-cool/80 active:to-blue-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-bg-dark border-t-transparent rounded-full"
                      />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-150 font-medium ${
        active
          ? "bg-gradient-to-r from-accent-cool/40 to-accent-cool/20 border border-accent-cool/50 text-accent-cool shadow-md"
          : "text-text-secondary hover:text-text-primary hover:bg-white/12 active:bg-white/20"
      }`}
    >
      <span className="flex items-center space-x-3">
        <FontAwesomeIcon icon={icon} className="w-4" />
        <span className="text-sm">{label}</span>
      </span>
      {typeof count === "number" && (
        <span
          className={`text-xs font-semibold ${active ? "text-accent-cool" : "text-text-muted"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ItemDetailPanel({
  entry,
  onClose,
  onShowHash,
  onEdit,
  onDelete,
  notification,
  copyToClipboard,
  showPassword,
  setShowPassword,
}) {
  // onOpenAutotype prop removed — autotype button disabled

  const getPasswordStrength = (pwd) => {
    if (pwd.length >= 16)
      return {
        label: "Strong",
        width: "75%",
        color: "from-cyan-500 to-green-500",
      };
    if (pwd.length >= 12)
      return {
        label: "Good",
        width: "50%",
        color: "from-blue-500 to-cyan-500",
      };
    return {
      label: "Weak",
      width: "25%",
      color: "from-yellow-500 to-orange-500",
    };
  };

  const strength = getPasswordStrength(entry.password);

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed right-0 top-0 bottom-0 w-96 border-l border-accent-cool/40 flex flex-col bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl shadow-2xl z-40"
    >
      <div className="p-6 border-b border-accent-cool/30 bg-gradient-to-r from-white/10 to-white/5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-accent-cool mb-1">
              {entry.name}
            </h2>
            <p className="text-xs text-text-secondary">
              {entry.url || "Password Entry"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-accent-cool hover:bg-white/10 rounded-lg p-2 transition"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-3 rounded-lg text-sm font-medium ${
              notification.type === "success"
                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                : "bg-red-500/20 border border-red-500/50 text-red-400"
            }`}
          >
            {notification.message}
          </motion.div>
        )}

        {entry.username && (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
              Username
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-4 py-3 backdrop-blur-lg border border-accent-cool/50 rounded-lg text-text-primary font-medium cursor-default break-all"
                style={{
                  background:
                    "linear-gradient(135deg, #0d0d0d 0%, rgba(138, 159, 185, 0.05) 100%)",
                }}
              >
                {entry.username}
              </div>
              <button
                onClick={() => copyToClipboard(entry.username, "Username")}
                className="p-2.5 rounded-lg bg-accent-cool/20 hover:bg-accent-cool/40 text-accent-cool transition flex items-center justify-center"
                title="Copy username"
              >
                <ContentCopy sx={{ fontSize: 20 }} />
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
            Password
          </label>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex-1 px-4 py-3 backdrop-blur-lg border border-accent-cool/50 rounded-lg text-text-primary font-mono cursor-default"
              style={{
                background:
                  "linear-gradient(135deg, #0d0d0d 0%, rgba(138, 159, 185, 0.05) 100%)",
              }}
            >
              {showPassword
                ? entry.password
                : "●".repeat(entry.password.length)}
            </div>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-2.5 rounded-lg bg-accent-cool/20 hover:bg-accent-cool/40 text-accent-cool transition flex items-center justify-center"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <VisibilityOff sx={{ fontSize: 20 }} />
              ) : (
                <Visibility sx={{ fontSize: 20 }} />
              )}
            </button>
            <button
              onClick={() => copyToClipboard(entry.password, "Password")}
              className="p-2.5 rounded-lg bg-accent-cool/20 hover:bg-accent-cool/40 text-accent-cool transition flex items-center justify-center"
              title="Copy password"
            >
              <ContentCopy sx={{ fontSize: 20 }} />
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${strength.color} transition-all`}
                style={{ width: strength.width }}
              />
            </div>
            <span className="text-xs font-semibold text-cyan-400">
              {strength.label}
            </span>
          </div>
        </div>

        {entry.totp && (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
              2FA Code
            </label>
            <div
              className="w-full px-4 py-3 backdrop-blur-lg border border-accent-cool/50 rounded-lg text-accent-cool font-mono cursor-not-allowed text-center text-lg"
              style={{
                background:
                  "linear-gradient(135deg, #0d0d0d 0%, rgba(138, 159, 185, 0.05) 100%)",
              }}
            >
              {entry.totp}
            </div>
          </div>
        )}

        {entry.url && (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
              URL
            </label>
            <div
              className="w-full px-4 py-3 backdrop-blur-lg border border-accent-warm/50 rounded-lg text-accent-warm font-medium cursor-not-allowed break-all text-sm"
              style={{
                background:
                  "linear-gradient(135deg, #0d0d0d 0%, rgba(212, 165, 116, 0.05) 100%)",
              }}
            >
              {entry.url}
            </div>
          </div>
        )}

        {entry.notes && (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
              Notes
            </label>
            <div
              className="w-full px-4 py-3 backdrop-blur-lg border border-accent-cool/50 rounded-lg text-text-secondary font-medium cursor-not-allowed text-sm break-all"
              style={{
                background:
                  "linear-gradient(135deg, #0d0d0d 0%, rgba(138, 159, 185, 0.05) 100%)",
              }}
            >
              {entry.notes}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-accent-cool/30 space-y-3 bg-gradient-to-t from-white/8 to-white/4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onShowHash}
          className="w-full px-4 py-3 bg-gradient-to-r from-accent-cool to-blue-600 text-bg-dark rounded-lg font-semibold hover:shadow-lg active:from-accent-cool/80 active:to-blue-700 transition-all duration-150"
        >
          View Hashed Ciphertext
        </motion.button>
        <div className="flex space-x-3">
          {/* AutoType button disabled
          <button
            onClick={onOpenAutotype}
            className="flex-1 px-4 py-2.5 border border-accent-cool/50 rounded-lg text-accent-cool hover:bg-accent-cool/20 hover:border-accent-cool active:bg-accent-cool/35 font-semibold transition-all duration-150 flex items-center justify-center space-x-2 text-sm"
          >
            <FontAwesomeIcon icon={faKeyboard} className="w-3" />
            <span>AutoType</span>
          </button>
          */}
          <button
            onClick={() => onEdit(entry)}
            className="flex-1 px-4 py-2.5 border border-accent-warm/50 rounded-lg text-accent-warm hover:bg-accent-warm/20 hover:border-accent-warm active:bg-accent-warm/40 font-semibold transition-all duration-150 flex items-center justify-center space-x-2 text-sm"
          >
            <FontAwesomeIcon icon={faPencil} className="w-3" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="flex-1 px-4 py-2.5 border border-status-error/50 rounded-lg text-status-error hover:bg-status-error/20 hover:border-status-error active:bg-status-error/40 font-semibold transition-all duration-150 flex items-center justify-center space-x-2 text-sm"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// AutoTypePane component disabled — kept for reference
// function AutoTypePane({ entries, activeEntryId, onSelectEntry, onUpdatePassword }) { ... }
