import React, { useEffect, useState } from "react";
import "./App.css";

// ---- Theme Palette ----
const THEME = {
  primary: "#1976d2",
  secondary: "#90caf9",
  accent: "#ffb300",
  background: "#ffffff",
  surface: "#f5f7fa",
  text: "#222",
  sidebarBg: "#f8f9fa",
  error: "#e53935"
};

// ---- Backend API base ----
// Assume backend running on same docker network, else update to full URL as needed
const API_BASE = process.env.REACT_APP_NOTES_API || "http://localhost:3001/api/notes";

// ----- UTILITIES -----
// PUBLIC_INTERFACE
function truncate(text, maxLen = 90) {
  /** Truncates text for summary preview. */
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen - 3) + "..." : text;
}

// PUBLIC_INTERFACE
function validateNote({ title, content }) {
  /** Returns validation errors for a note */
  const errors = {};
  if (!title || title.trim().length === 0) errors.title = "Title required";
  if (!content || content.trim().length === 0) errors.content = "Content required";
  return errors;
}

// ---------- COMPONENTS ----------

// PUBLIC_INTERFACE
function Header() {
  /** Application header with title */
  return (
    <header
      style={{
        background: THEME.primary,
        color: "#fff",
        padding: "20px 28px",
        fontWeight: 600,
        fontSize: 24,
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
        flex: "0 0 auto"
      }}
    >
      <span style={{ letterSpacing: ".02em" }}>🗒️ Notemaster</span>
    </header>
  );
}

// PUBLIC_INTERFACE
function Sidebar({ notes, onSelect, onCreate, selectedId }) {
  /** Sidebar navigation with notes list, create note button */
  return (
    <aside
      style={{
        width: 265,
        background: THEME.sidebarBg,
        borderRight: `1px solid ${THEME.secondary}44`,
        height: "100%",
        overflowY: "auto",
        paddingTop: 0,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column"
      }}
      aria-label="Sidebar"
    >
      <div style={{ padding: "22px 20px 5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{fontWeight: 500, fontSize: 18, letterSpacing: ".01em", color: THEME.primary}}>Your Notes</span>
        <button
          aria-label="New note"
          style={{
            background: THEME.accent,
            color: "#fff",
            fontWeight: 700,
            border: "none",
            borderRadius: 7,
            fontSize: 17,
            padding: "7px 14px",
            marginLeft: 8,
            cursor: "pointer",
            transition: "background 0.18s",
          }}
          onClick={onCreate}
        >＋</button>
      </div>
      <nav style={{flex: 1, overflowY: "auto"}}>
        <ul style={{listStyle: "none", margin: 0, padding: 0}}>
          {notes.length === 0 && (
            <li style={{ padding: "25px 20px", color: "#aaa", fontSize: 16 }}>No notes yet.</li>
          )}
          {notes.map((note) => (
            <li key={note.id}>
              <button
                aria-label={`View note "${note.title}"`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: selectedId === note.id ? "#e3f2fd" : "none",
                  border: "none",
                  borderLeft: selectedId === note.id ? `5px solid ${THEME.primary}` : "5px solid transparent",
                  color: "#333", // Enough contrast
                  fontSize: 16,
                  fontWeight: selectedId === note.id ? 600 : 400,
                  padding: "14px 18px",
                  marginBottom: 1,
                  borderRadius: "0 8px 8px 0",
                  cursor: "pointer",
                  outline: "none",
                  transition: "background 0.16s"
                }}
                onClick={() => onSelect(note.id)}
              >
                <div style={{fontSize: 17}}>{truncate(note.title, 30) || <i style={{color: "#aaa"}}>Untitled</i>}</div>
                <div style={{fontSize: "13px", color: "#757575", marginTop: "2px"}}>
                  {truncate(note.content,30)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

// PUBLIC_INTERFACE
function NoteListView({ notes, onSelect, onCreate }) {
  /** Responsive list of notes for main area (mobile) */
  return (
    <div style={{display: "flex", flexDirection: "column", gap: 22, padding: 24}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <h2 style={{margin: 0, fontWeight: 500, color: THEME.primary, fontSize: 23}}>Notes</h2>
        <button
          onClick={onCreate}
          style={{
            background: THEME.accent,
            color: "#fff",
            fontWeight: 600,
            border: "none",
            borderRadius: 6,
            fontSize: 16,
            padding: "6px 14px",
            cursor: "pointer",
          }}>
          + New Note
        </button>
      </div>
      {notes.length === 0 && (
        <div style={{color: "#aaa", textAlign: "center", padding: 30, fontSize: 16}}>You don&apos;t have any notes yet.</div>
      )}
      <ul style={{listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"}}>
        {notes.map(note => (
          <li key={note.id}>
            <div
              tabIndex={0}
              role="button"
              aria-label={`Open note: ${note.title}`}
              onClick={() => onSelect(note.id)}
              onKeyPress={e => (e.key === "Enter" || e.key === " ") && onSelect(note.id)}
              style={{
                background: "#fff",
                boxShadow: "0 1.5px 7px 0 rgba(25, 118, 210, .09)",
                border: "1px solid #ececec",
                borderRadius: 10,
                padding: 18,
                cursor: "pointer",
                minHeight: 85,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                transition: "box-shadow .18s"
              }}>
              <div style={{fontWeight: 600, fontSize: "1.08em", color: THEME.primary}}>{truncate(note.title, 50) || <i style={{color: "#aaa"}}>Untitled</i>}</div>
              <div style={{fontSize: 14, color: "#555"}}>{truncate(note.content, 82)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// PUBLIC_INTERFACE
function NoteView({ note, isEditing, onEdit, onBack, onDelete, loading }) {
  /** Detailed note view + edit/delete */
  if (!note) return <div />;
  return (
    <section style={{ padding: 30, maxWidth: 710, margin: "24px auto" }}>
      {!isEditing && (
        <>
          <button
            onClick={onBack}
            style={{
              marginBottom: 22,
              color: THEME.primary,
              background: "none",
              border: "none",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            ← Back
          </button>
          <h2 style={{ fontWeight: 600, color: THEME.primary, marginTop: 0 }}>{note.title || <i style={{color: "#aaa"}}>Untitled</i>}</h2>
          <div
            style={{
              whiteSpace: "pre-line",
              marginTop: 19,
              color: "#333",
              borderRadius: 7,
              background: "#fefefe",
              minHeight: "3.8em",
              padding: "13px 14px",
              border: "1px solid #eee",
              fontSize: 17
            }}>
            {note.content}
          </div>
          <div style={{display: "flex", gap: 15, marginTop: 35}}>
            <button onClick={onEdit}
              disabled={loading}
              style={{
                background: THEME.primary,
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 600,
                cursor: "pointer"
              }}>Edit</button>
            <button onClick={onDelete}
              disabled={loading}
              style={{
                background: THEME.error,
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 600,
                cursor: "pointer"
              }}>Delete</button>
          </div>
        </>
      )}
    </section>
  );
}

// PUBLIC_INTERFACE
function NoteForm({ initial, onSubmit, onCancel, loading, errors }) {
  /** Create/Edit note form (controlled) */
  const [title, setTitle] = useState(initial.title || "");
  const [content, setContent] = useState(initial.content || "");

  useEffect(() => {
    setTitle(initial.title || "");
    setContent(initial.content || "");
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title, content });
  };
  return (
    <section style={{
      padding: "35px 24px",
      maxWidth: 650,
      margin: "0 auto"
    }}>
      <form style={{display: "flex", flexDirection: "column", gap: 18}} onSubmit={handleSubmit}>
        <label style={{fontWeight: 600, marginBottom: 3}}>Title</label>
        <input
          name="title"
          required
          style={{
            fontSize: 17,
            padding: "10px 12px",
            outline: "none",
            borderRadius: 6,
            border: `1.5px solid ${errors.title ? THEME.error : "#d3d7e3"}`,
            background: "#fff"
          }}
          value={title}
          maxLength={100}
          onChange={e => setTitle(e.target.value)}
          aria-invalid={!!errors.title}
        />
        {errors.title && <span style={{color: THEME.error, fontSize: 13, marginTop: -7}}>{errors.title}</span>}

        <label style={{fontWeight: 600, marginBottom: 3, marginTop: 6}}>Content</label>
        <textarea
          name="content"
          required
          style={{
            fontSize: 17,
            padding: "10px 12px",
            height: "120px",
            minHeight: 48,
            outline: "none",
            borderRadius: 7,
            border: `1.5px solid ${errors.content ? THEME.error : "#d3d7e3"}`,
            background: "#fff"
          }}
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={3500}
          aria-invalid={!!errors.content}
        />
        {errors.content && <span style={{color: THEME.error, fontSize: 13, marginTop: -7}}>{errors.content}</span>}

        <div style={{display: "flex", gap: 15, marginTop: 6}}>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: THEME.primary,
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontWeight: 600,
              padding: "9px 22px",
              fontSize: 16,
              cursor: "pointer"
            }}
          >Save</button>
          <button type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: "#e3e3e3",
              color: "#444",
              fontWeight: 600,
              border: "none",
              borderRadius: 7,
              padding: "9px 22px",
              fontSize: 16,
              cursor: "pointer"
            }}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

// PUBLIC_INTERFACE
function ErrorBanner({ message, onClose }) {
  /** Banner to display API or validation errors. */
  if (!message) return null;
  return (
    <div style={{
      background: THEME.error,
      color: "#fff",
      padding: "14px",
      textAlign: "center",
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: ".01em",
      borderRadius: 7,
      margin: "18px auto",
      maxWidth: 680,
      position: "relative"
    }}>
      <span>{message}</span>
      {onClose && (
        <button style={{
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: 18,
          fontWeight: 900,
          position: "absolute",
          top: 5, right: 15,
          cursor: "pointer"
        }} onClick={onClose} aria-label="Dismiss error">×</button>
      )}
    </div>
  );
}

// ----- MAIN APP COMPONENT -----

// PUBLIC_INTERFACE
function App() {
  /** Notes SPA main component, manages navigation, fetch, CRUD, state, errors */
  // UI state:
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // null = list
  const [viewMode, setViewMode] = useState("list"); // "list" | "view" | "edit" | "create"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // string
  const [formInitial, setFormInitial] = useState({title: "", content: ""});
  const [formErrors, setFormErrors] = useState({});
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // --- API Fetches ---
  // PUBLIC_INTERFACE
  async function fetchNotes() {
    setLoading(true);
    try {
      const resp = await fetch(API_BASE);
      if (!resp.ok) throw new Error("Could not fetch notes.");
      const data = await resp.json();
      setNotes(data);
    } catch (e) {
      setError(e?.message || "Error loading notes.");
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function fetchNote(id) {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${id}`);
      if (!resp.ok) throw new Error("Could not fetch note details.");
      const data = await resp.json();
      return data;
    } catch (e) {
      setError(e?.message || "Error loading note.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleCreateNote(formData) {
    const errors = validateNote(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      const resp = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>null);
        throw new Error(err?.message || "Failed to create note.");
      }
      await fetchNotes();
      setViewMode("list");
      setSelectedId(null);
    } catch (e) {
      setError(e?.message || "Failed to create.");
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleUpdateNote(formData) {
    const errors = validateNote(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>null);
        throw new Error(err?.message || "Failed to update note.");
      }
      await fetchNotes();
      setViewMode("view");
    } catch (e) {
      setError(e?.message || "Failed to update note.");
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleDeleteNote() {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${selectedId}`, { method: "DELETE" });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>null);
        throw new Error(err?.message || "Failed to delete note.");
      }
      await fetchNotes();
      setViewMode("list");
      setSelectedId(null);
    } catch (e) {
      setError(e?.message || "Failed to delete note.");
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  function handleSidebarCreate() {
    setFormInitial({ title: "", content: "" });
    setSelectedId(null);
    setViewMode("create");
    setFormErrors({});
    setError(null);
  }

  // PUBLIC_INTERFACE
  async function handleSelectNote(id) {
    setSelectedId(id);
    setLoading(true);
    try {
      const note = await fetchNote(id);
      if (!note) {
        setError("Could not load note.");
        return;
      }
      setFormInitial({ title: note.title, content: note.content });
      setViewMode("view");
      setError(null);
      setFormErrors({});
    } finally {
      setLoading(false);
    }
  }

  function handleEditNote() {
    setViewMode("edit");
    setFormErrors({});
    setError(null);
  }

  function handleBackToList() {
    setViewMode("list");
    setSelectedId(null);
    setFormErrors({});
    setError(null);
  }

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
    // Responsive event
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line
  }, []);

  // Find selected note
  const selectedNote = notes.find((n) => n.id === selectedId);

  // Layout & Navigation logic
  const showSidebar = screenWidth > 860; // sidebar visible
  const mainStyles = {
    flex: 1,
    background: THEME.surface,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    overflow: "auto"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: THEME.surface,
      color: THEME.text,
      fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
      display: "flex",
      flexDirection: "column"
    }}>
      <Header />
      <div style={{
        display: "flex",
        flex: "1 1 auto",
        minHeight: "0",
        borderTop: "1.5px solid #e3e7ee"
      }}>
        {showSidebar && (
          <Sidebar
            notes={notes}
            onSelect={handleSelectNote}
            onCreate={handleSidebarCreate}
            selectedId={selectedId}
          />
        )}
        <main style={mainStyles}>
          {error && <ErrorBanner message={error} onClose={()=>setError(null)} />}
          {viewMode === "list" && (showSidebar ? (
            <div style={{padding: 44, color: "#888", textAlign: "center"}}>
              <div style={{marginBottom: 12, fontSize: 24, color: THEME.primary, fontWeight: 500}}>
                Welcome to Notemaster
              </div>
              <div style={{fontSize: 16}}>
                {notes.length === 0
                  ? "Click + to create your first note!"
                  : "Select a note from the sidebar or create a new one!"}
              </div>
              {!showSidebar &&
                <NoteListView notes={notes} onSelect={handleSelectNote} onCreate={handleSidebarCreate} />
              }
            </div>
          ) : (
            <NoteListView notes={notes} onSelect={handleSelectNote} onCreate={handleSidebarCreate} />
          ))}

          {viewMode === "create" && (
            <NoteForm
              initial={{ title: "", content: "" }}
              onSubmit={handleCreateNote}
              onCancel={handleBackToList}
              loading={loading}
              errors={formErrors}
            />
          )}
          {viewMode === "view" && selectedNote && (
            <NoteView
              note={selectedNote}
              isEditing={false}
              onEdit={handleEditNote}
              onBack={handleBackToList}
              onDelete={handleDeleteNote}
              loading={loading}
            />
          )}
          {viewMode === "edit" && selectedNote && (
            <NoteForm
              initial={selectedNote}
              onSubmit={handleUpdateNote}
              onCancel={()=>setViewMode("view")}
              loading={loading}
              errors={formErrors}
            />
          )}
        </main>
      </div>
      <footer
        style={{
          textAlign: "center",
          padding: "18px 0 8px",
          color: "#7a859a",
          fontSize: 14,
          borderTop: "1.1px solid #e6eaf7",
          background: "linear-gradient(to right,#fafdff,#f7fafe)"
        }}>
        © {new Date().getFullYear()} Notemaster
      </footer>
    </div>
  );
}

export default App;

