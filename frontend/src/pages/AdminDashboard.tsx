import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { FiUsers, FiLogOut, FiEdit, FiTrash2, FiHome, FiPlus, FiServer } from "react-icons/fi";

type User = {
  id: number;
  email: string;
  is_active: boolean;
};

type Thermostat = {
  id: number;
  name: string;
  owner_id?: number;
  owner_email?: string;
  settings: {
    target_temp_c: number;
    mode: string;
    last_source: string;
  };
};

export default function AdminDashboard() {
  const { token, logout, user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "thermostats" | "user-details">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [thermostats, setThermostats] = useState<Thermostat[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserThermostats, setSelectedUserThermostats] = useState<Thermostat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddThermostat, setShowAddThermostat] = useState(false);

  // Zabezpieczenie - sprawdź czy użytkownik ma uprawnienia admina
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          maxWidth: 400
        }}>
          <h1 style={{ color: "#dc3545", marginBottom: 16 }}>Brak uprawnień</h1>
          <p style={{ color: "#666", marginBottom: 24 }}>
            Nie masz uprawnień do panelu administratora.
          </p>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              background: "#667eea",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            Powrót do Dashboard
          </button>
        </div>
      </div>
    );
  }

  const loadUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const usersData = await api.adminListUsers(token);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania użytkowników");
    } finally {
      setLoading(false);
    }
  };

  const loadThermostats = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const thermostatsData = await api.adminListAllThermostats(token);
      setThermostats(thermostatsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania termostatów");
    } finally {
      setLoading(false);
    }
  };

  const loadUserThermostats = async (userId: number) => {
    if (!token) return;
    try {
      setLoading(true);
      const userThermostatsData = await api.adminGetUserThermostats(token, userId);
      setSelectedUserThermostats(userThermostatsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania termostatów użytkownika");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "thermostats") {
      loadThermostats();
    }
    // user-details nie potrzebuje automatycznego ładowania - loadUserThermostats jest wywoływane ręcznie
  }, [activeTab, token]);

  const deleteUser = async (userId: number) => {
    if (!token) return;
    if (!confirm("Czy na pewno chcesz usunąć tego użytkownika? Zostaną usunięte wszystkie jego dane.")) return;
    
    try {
      await api.adminDeleteUser(token, userId);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd usuwania użytkownika");
    }
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setActiveTab("user-details");
    loadUserThermostats(user.id);
  };

  const backToUsers = () => {
    setSelectedUser(null);
    setSelectedUserThermostats([]);
    setActiveTab("users");
  };

  const createUser = async (email: string, password: string) => {
    if (!token) return;
    try {
      await api.adminCreateUser(token, email, password);
      setShowAddUser(false);
      loadUsers();
      alert("Użytkownik został dodany");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd tworzenia użytkownika");
    }
  };

  const createThermostat = async (name: string) => {
    if (!token) return;
    try {
      await api.adminCreateThermostat(token, name);
      setShowAddThermostat(false);
      loadThermostats();
      alert("Termostat został dodany");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd tworzenia termostatu");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: 20,
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        padding: 16,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 12,
        color: "white"
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, display: "flex", alignItems: "center", gap: 8 }}>
            <FiServer size={32} />
            Panel Administratora
          </h1>
          <p style={{ margin: "4px 0 0 0", opacity: 0.8, fontSize: 14 }}>
            Zalogowany: <b>{user?.email}</b>
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => window.location.href = "/"}
            className="btn-secondary"
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <FiHome size={16} />
            Dashboard
          </button>
          <button
            onClick={logout}
            className="btn-ghost"
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <FiLogOut size={16} />
            Wyloguj
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 24
      }}>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "12px 24px",
            background: activeTab === "users" ? "white" : "rgba(255,255,255,0.2)",
            color: activeTab === "users" ? "#667eea" : "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "500"
          }}
        >
          Użytkownicy
        </button>
        <button
          onClick={() => setActiveTab("thermostats")}
          style={{
            padding: "12px 24px",
            background: activeTab === "thermostats" ? "white" : "rgba(255,255,255,0.2)",
            color: activeTab === "thermostats" ? "#667eea" : "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "500"
          }}
        >
          Wszystkie termostaty
        </button>
        {selectedUser && (
          <button
            onClick={() => setActiveTab("user-details")}
            style={{
              padding: "12px 24px",
              background: activeTab === "user-details" ? "white" : "rgba(255,255,255,0.2)",
              color: activeTab === "user-details" ? "#667eea" : "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: "500"
            }}
          >
            Szczegóły: {selectedUser.email}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: "#dc3545",
          color: "white",
          padding: 16,
          borderRadius: 8,
          marginBottom: 24
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              float: "right",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
            Ładowanie...
          </div>
        ) : activeTab === "users" ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Zarządzanie użytkownikami</h2>
              <button
                onClick={() => setShowAddUser(true)}
                style={{
                  padding: "8px 16px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <FiPlus size={16} />
                Dodaj użytkownika
              </button>
            </div>
            {showAddUser && (
              <AddUserForm 
                onSubmit={createUser} 
                onCancel={() => setShowAddUser(false)} 
              />
            )}
            <UserManagement 
              users={users} 
              onDeleteUser={deleteUser}
              onViewDetails={viewUserDetails}
              onReload={loadUsers}
              token={token!}
            />
          </>
        ) : activeTab === "thermostats" ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Wszystkie termostaty</h2>
              <button
                onClick={() => setShowAddThermostat(true)}
                style={{
                  padding: "8px 16px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <FiPlus size={16} />
                Dodaj termostat
              </button>
            </div>
            {showAddThermostat && (
              <AddThermostatForm 
                onSubmit={createThermostat} 
                onCancel={() => setShowAddThermostat(false)} 
              />
            )}
            <AllThermostatsManagement 
              thermostats={thermostats}
              users={users}
              onReload={loadThermostats}
              token={token!}
            />
          </>
        ) : activeTab === "user-details" && selectedUser ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>
                Termostaty użytkownika: {selectedUser.email}
              </h2>
              <button
                onClick={backToUsers}
                style={{
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <FiHome size={16} />
                Powrót do użytkowników
              </button>
            </div>
            <UserThermostatManagement 
              user={selectedUser}
              userThermostats={selectedUserThermostats}
              allThermostats={thermostats}
              onReload={() => loadUserThermostats(selectedUser.id)}
              onReloadAll={loadThermostats}
              token={token!}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

// Komponent formularza do dodawania użytkowników
const AddUserForm = ({ onSubmit, onCancel }: { 
  onSubmit: (email: string, password: string) => void; 
  onCancel: () => void; 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onSubmit(email, password);
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: 24,
        borderRadius: 8,
        minWidth: 400
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Dodaj nowego użytkownika</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 14
              }}
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Hasło:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 14
              }}
              required
              minLength={6}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Dodaj użytkownika
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Komponent formularza do dodawania termostatów
const AddThermostatForm = ({ onSubmit, onCancel }: { 
  onSubmit: (name: string) => void; 
  onCancel: () => void; 
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      onSubmit(name);
      setName('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: 24,
        borderRadius: 8,
        minWidth: 400
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Dodaj nowy termostat</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Nazwa termostatu:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Termostat Salon"
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 14
              }}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Dodaj termostat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Management Component
function UserManagement({ 
  users, 
  onDeleteUser, 
  onViewDetails,
  onReload,
  token 
}: { 
  users: User[]; 
  onDeleteUser: (id: number) => void;
  onViewDetails: (user: User) => void;
  onReload: () => void;
  token: string;
}) {
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const startEdit = (user: User) => {
    setEditingUser(user.id);
    setNewEmail(user.email);
  };

  const saveEmail = async (userId: number) => {
    try {
      await api.adminUpdateUserEmail(token, userId, newEmail);
      setEditingUser(null);
      onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd zmiany emaila");
    }
  };

  return (
    <div>
      
      {users.length === 0 ? (
        <p style={{ color: "#666", textAlign: "center", padding: 20 }}>
          Brak użytkowników
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>ID</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Email</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Status</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>{user.id}</td>
                  <td style={{ padding: 12 }}>
                    {editingUser === user.id ? (
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        style={{
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: 4,
                          fontSize: 14
                        }}
                        onKeyDown={(e) => e.key === "Enter" && saveEmail(user.id)}
                      />
                    ) : (
                      <span style={{ 
                        fontWeight: user.email === "admin@example.com" ? "bold" : "normal",
                        color: user.email === "admin@example.com" ? "#667eea" : "inherit"
                      }}>
                        {user.email}
                        {user.email === "admin@example.com" && " (Admin)"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      background: user.is_active ? "#d4edda" : "#f8d7da",
                      color: user.is_active ? "#155724" : "#721c24"
                    }}>
                      {user.is_active ? "Aktywny" : "Nieaktywny"}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {editingUser === user.id ? (
                        <>
                          <button
                            onClick={() => saveEmail(user.id)}
                            style={{
                              padding: "4px 8px",
                              background: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 12
                            }}
                          >
                            Zapisz
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            style={{
                              padding: "4px 8px",
                              background: "#6c757d",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 12
                            }}
                          >
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onViewDetails(user)}
                            style={{
                              padding: "6px",
                              background: "#17a2b8",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer"
                            }}
                            title="Zobacz termostaty"
                          >
                            <FiUsers size={14} />
                          </button>
                          <button
                            onClick={() => startEdit(user)}
                            style={{
                              padding: "6px",
                              background: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer"
                            }}
                            title="Edytuj email"
                          >
                            <FiEdit size={14} />
                          </button>
                          {user.email !== "admin@example.com" && (
                            <button
                              onClick={() => onDeleteUser(user.id)}
                              style={{
                                padding: "6px",
                                background: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer"
                              }}
                              title="Usuń użytkownika"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Thermostat Management Component  
function ThermostatManagement({ 
  thermostats, 
  users,
  onReload,
  token 
}: { 
  thermostats: Thermostat[]; 
  users: User[];
  onReload: () => void;
  token: string;
}) {
  const assignThermostat = async (thermostatId: number, userId: number) => {
    try {
      await api.adminAssignThermostat(token, thermostatId, userId);
      onReload();
      alert("Termostat został przypisany do użytkownika");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd przypisywania termostatu");
    }
  };

  const deleteThermostat = async (thermostatId: number) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten termostat?")) {
      try {
        await api.adminDeleteThermostat(token, thermostatId);
        onReload();
        alert("Termostat został usunięty");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Błąd usuwania termostatu");
      }
    }
  };

  return (
    <div>
      
      {thermostats.length === 0 ? (
        <p style={{ color: "#666", textAlign: "center", padding: 20 }}>
          Brak termostatów
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>ID</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Nazwa</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Temperatura</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Przypisz do</th>
              </tr>
            </thead>
            <tbody>
              {thermostats.map(thermostat => (
                <tr key={thermostat.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>{thermostat.id}</td>
                  <td style={{ padding: 12 }}>{thermostat.name}</td>
                  <td style={{ padding: 12 }}>
                    {thermostat.settings.target_temp_c}°C 
                    <span style={{ color: "#666", marginLeft: 8 }}>
                      ({thermostat.settings.mode})
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <select
                      onChange={(e) => {
                        const userId = parseInt(e.target.value);
                        if (userId) assignThermostat(thermostat.id, userId);
                      }}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        fontSize: 14
                      }}
                      defaultValue=""
                    >
                      <option value="">-- Wybierz użytkownika --</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.email} (ID: {user.id})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// All Thermostats Management Component - Shows all thermostats with their owners
function AllThermostatsManagement({ 
  thermostats, 
  users,
  onReload,
  token 
}: { 
  thermostats: Thermostat[]; 
  users: User[];
  onReload: () => void;
  token: string;
}) {
  const [selectedThermostat, setSelectedThermostat] = useState<Thermostat | null>(null);
  const [thermostatUsers, setThermostatUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Load users when thermostat is selected
  useEffect(() => {
    if (selectedThermostat) {
      loadThermostatUsers(selectedThermostat.id);
    }
  }, [selectedThermostat]);

  const loadThermostatUsers = async (thermostatId: number) => {
    setIsLoadingUsers(true);
    try {
      const users = await api.adminGetThermostatUsers(token, thermostatId);
      setThermostatUsers(users);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd ładowania użytkowników");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const shareThermostat = async (thermostatId: number, userId: number) => {
    try {
      await api.adminShareThermostat(token, thermostatId, userId);
      loadThermostatUsers(thermostatId);
      onReload();
      alert("Termostat został udostępniony użytkownikowi");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd udostępniania termostatu");
    }
  };

  const unshareThermostat = async (thermostatId: number, userId: number) => {
    try {
      await api.adminUnshareThermostat(token, thermostatId, userId);
      loadThermostatUsers(thermostatId);
      onReload();
      alert("Udostępnienie termostatu zostało cofnięte");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd cofania udostępnienia termostatu");
    }
  };
  
  const assignThermostat = async (thermostatId: number, userId: number) => {
    try {
      await api.adminAssignThermostat(token, thermostatId, userId);
      onReload();
      alert("Termostat został przypisany do użytkownika");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd przypisywania termostatu");
    }
  };

  const unassignThermostat = async (thermostatId: number) => {
    try {
      await api.adminUnassignThermostat(token, thermostatId);
      onReload();
      alert("Termostat został odłączony od użytkownika");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd odłączania termostatu");
    }
  };

  const deleteThermostat = async (thermostatId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć ten termostat? Wszystkie powiązane dane zostaną utracone.")) return;
    
    try {
      await api.adminDeleteThermostat(token, thermostatId);
      onReload();
      alert("Termostat został usunięty");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd usuwania termostatu");
    }
  };

  return (
    <div>
      {thermostats.length === 0 ? (
        <p style={{ color: "#666", textAlign: "center", padding: 20 }}>
          Brak termostatów
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>ID</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Nazwa</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Właściciel</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Temperatura</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {thermostats.map(thermostat => (
                <tr key={thermostat.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>{thermostat.id}</td>
                  <td style={{ padding: 12 }}>{thermostat.name}</td>
                  <td style={{ padding: 12 }}>
                    {thermostat.owner_email ? (
                      <span style={{ color: "#28a745" }}>{thermostat.owner_email}</span>
                    ) : (
                      <span style={{ color: "#6c757d", fontStyle: "italic" }}>Nieprzypisany</span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    {thermostat.settings.target_temp_c}°C 
                    <span style={{ color: "#666", marginLeft: 8 }}>
                      ({thermostat.settings.mode})
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {thermostat.owner_id ? (
                        <button
                          onClick={() => unassignThermostat(thermostat.id)}
                          style={{
                            padding: "4px 8px",
                            background: "#ffc107",
                            color: "#000",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12
                          }}
                        >
                          Odłącz
                        </button>
                      ) : (
                        <select
                          onChange={(e) => {
                            const userId = parseInt(e.target.value);
                            if (userId) assignThermostat(thermostat.id, userId);
                          }}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: 12
                          }}
                          defaultValue=""
                        >
                          <option value="">Przypisz do...</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.email}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => setSelectedThermostat(thermostat)}
                        style={{
                          padding: "4px 8px",
                          background: "#17a2b8",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12
                        }}
                      >
                        Udostępnij
                      </button>
                      <button
                        onClick={() => deleteThermostat(thermostat.id)}
                        style={{
                          padding: "4px 8px",
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12
                        }}
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal udostępniania termostatu */}
      {selectedThermostat && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: 24,
            borderRadius: 8,
            maxWidth: 600,
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto"
          }}>
            <h3>Udostępnij termostat: {selectedThermostat.name}</h3>

            <div style={{ marginBottom: 20 }}>
              <h4>Aktywni użytkownicy:</h4>
              {isLoadingUsers ? (
                <p>Ładowanie...</p>
              ) : thermostatUsers.length === 0 ? (
                <p style={{ color: "#666" }}>Termostat nie jest udostępniony żadnemu użytkownikowi</p>
              ) : (
                <div>
                  {thermostatUsers.map(user => (
                    <div key={user.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 8,
                      background: "#f8f9fa",
                      marginBottom: 8,
                      borderRadius: 4
                    }}>
                      <span>{user.email}</span>
                      <button
                        onClick={() => unshareThermostat(selectedThermostat.id, user.id)}
                        style={{
                          padding: "4px 8px",
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12
                        }}
                      >
                        Usuń dostęp
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4>Udostępnij nowemu użytkownikowi:</h4>
              <select
                onChange={(e) => {
                  const userId = parseInt(e.target.value);
                  if (userId && selectedThermostat) {
                    shareThermostat(selectedThermostat.id, userId);
                    e.target.value = "";
                  }
                }}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  width: "100%"
                }}
                defaultValue=""
              >
                <option value="">Wybierz użytkownika...</option>
                {users.filter(user => !thermostatUsers.find(tu => tu.id === user.id)).map(user => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setSelectedThermostat(null);
                  setThermostatUsers([]);
                }}
                style={{
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Thermostat Management Component - Shows thermostats for a specific user
function UserThermostatManagement({ 
  user,
  userThermostats,
  allThermostats,
  onReload,
  onReloadAll,
  token 
}: { 
  user: User;
  userThermostats: Thermostat[];
  allThermostats: Thermostat[];
  onReload: () => void;
  onReloadAll: () => void;
  token: string;
}) {
  const unassignThermostat = async (thermostatId: number) => {
    try {
      await api.adminUnassignThermostat(token, thermostatId);
      onReload();
      onReloadAll();
      alert("Termostat został odłączony od użytkownika");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd odłączania termostatu");
    }
  };

  const assignThermostat = async (thermostatId: number) => {
    try {
      await api.adminAssignThermostat(token, thermostatId, user.id);
      onReload();
      onReloadAll();
      alert("Termostat został przypisany do użytkownika");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd przypisywania termostatu");
    }
  };

  const availableThermostats = allThermostats.filter(t => !t.owner_id);

  return (
    <div>
      {/* User's current thermostats */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Termostaty użytkownika</h3>
        {userThermostats.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: 20 }}>
            Użytkownik nie ma przypisanych termostatów
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>ID</th>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Nazwa</th>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Temperatura</th>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {userThermostats.map(thermostat => (
                  <tr key={thermostat.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{thermostat.id}</td>
                    <td style={{ padding: 12 }}>{thermostat.name}</td>
                    <td style={{ padding: 12 }}>
                      {thermostat.settings.target_temp_c}°C 
                      <span style={{ color: "#666", marginLeft: 8 }}>
                        ({thermostat.settings.mode})
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => unassignThermostat(thermostat.id)}
                        style={{
                          padding: "4px 8px",
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12
                        }}
                      >
                        Odłącz
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available thermostats to assign */}
      <div>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Dostępne termostaty do przypisania</h3>
        {availableThermostats.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: 20 }}>
            Brak dostępnych termostatów do przypisania
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>ID</th>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Nazwa</th>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Temperatura</th>
                  <th style={{ padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }}>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {availableThermostats.map(thermostat => (
                  <tr key={thermostat.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{thermostat.id}</td>
                    <td style={{ padding: 12 }}>{thermostat.name}</td>
                    <td style={{ padding: 12 }}>
                      {thermostat.settings.target_temp_c}°C 
                      <span style={{ color: "#666", marginLeft: 8 }}>
                        ({thermostat.settings.mode})
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => assignThermostat(thermostat.id)}
                        style={{
                          padding: "4px 8px",
                          background: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12
                        }}
                      >
                        Przypisz
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}