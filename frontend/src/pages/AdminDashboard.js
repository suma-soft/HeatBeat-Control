import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { FiUsers, FiLogOut, FiEdit, FiTrash2, FiHome, FiPlus, FiServer } from "react-icons/fi";
export default function AdminDashboard() {
    const { token, logout, user, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [thermostats, setThermostats] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserThermostats, setSelectedUserThermostats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showAddThermostat, setShowAddThermostat] = useState(false);
    // Zabezpieczenie - sprawdź czy użytkownik ma uprawnienia admina
    if (!isAdmin) {
        return (_jsx("div", { style: {
                minHeight: "100vh",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "system-ui, -apple-system, sans-serif"
            }, children: _jsxs("div", { style: {
                    background: "white",
                    borderRadius: 12,
                    padding: 40,
                    textAlign: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    maxWidth: 400
                }, children: [_jsx("h1", { style: { color: "#dc3545", marginBottom: 16 }, children: "Brak uprawnie\u0144" }), _jsx("p", { style: { color: "#666", marginBottom: 24 }, children: "Nie masz uprawnie\u0144 do panelu administratora." }), _jsx("button", { onClick: () => window.location.href = "/", style: {
                            background: "#667eea",
                            color: "white",
                            border: "none",
                            padding: "12px 24px",
                            borderRadius: 6,
                            cursor: "pointer"
                        }, children: "Powr\u00F3t do Dashboard" })] }) }));
    }
    const loadUsers = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            const usersData = await api.adminListUsers(token);
            setUsers(usersData);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Błąd ładowania użytkowników");
        }
        finally {
            setLoading(false);
        }
    };
    const loadThermostats = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            const thermostatsData = await api.adminListAllThermostats(token);
            setThermostats(thermostatsData);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Błąd ładowania termostatów");
        }
        finally {
            setLoading(false);
        }
    };
    const loadUserThermostats = async (userId) => {
        if (!token)
            return;
        try {
            setLoading(true);
            const userThermostatsData = await api.adminGetUserThermostats(token, userId);
            setSelectedUserThermostats(userThermostatsData);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Błąd ładowania termostatów użytkownika");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (activeTab === "users") {
            loadUsers();
        }
        else if (activeTab === "thermostats") {
            loadThermostats();
        }
        // user-details nie potrzebuje automatycznego ładowania - loadUserThermostats jest wywoływane ręcznie
    }, [activeTab, token]);
    const deleteUser = async (userId) => {
        if (!token)
            return;
        if (!confirm("Czy na pewno chcesz usunąć tego użytkownika? Zostaną usunięte wszystkie jego dane."))
            return;
        try {
            await api.adminDeleteUser(token, userId);
            await loadUsers();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Błąd usuwania użytkownika");
        }
    };
    const viewUserDetails = (user) => {
        setSelectedUser(user);
        setActiveTab("user-details");
        loadUserThermostats(user.id);
    };
    const backToUsers = () => {
        setSelectedUser(null);
        setSelectedUserThermostats([]);
        setActiveTab("users");
    };
    const createUser = async (email, password) => {
        if (!token)
            return;
        try {
            await api.adminCreateUser(token, email, password);
            setShowAddUser(false);
            loadUsers();
            alert("Użytkownik został dodany");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Błąd tworzenia użytkownika");
        }
    };
    const createThermostat = async (name) => {
        if (!token)
            return;
        try {
            await api.adminCreateThermostat(token, name);
            setShowAddThermostat(false);
            loadThermostats();
            alert("Termostat został dodany");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Błąd tworzenia termostatu");
        }
    };
    return (_jsxs("div", { style: {
            minHeight: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: 20,
            fontFamily: "system-ui, -apple-system, sans-serif"
        }, children: [_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                    padding: 16,
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "white"
                }, children: [_jsxs("div", { children: [_jsxs("h1", { style: { margin: 0, fontSize: 28, display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(FiServer, { size: 32 }), "Panel Administratora"] }), _jsxs("p", { style: { margin: "4px 0 0 0", opacity: 0.8, fontSize: 14 }, children: ["Zalogowany: ", _jsx("b", { children: user?.email })] })] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsxs("button", { onClick: () => window.location.href = "/", className: "btn-secondary", style: {
                                    padding: "8px 16px",
                                    background: "rgba(255,255,255,0.2)",
                                    color: "white",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                }, children: [_jsx(FiHome, { size: 16 }), "Dashboard"] }), _jsxs("button", { onClick: logout, className: "btn-ghost", style: {
                                    padding: "8px 16px",
                                    background: "rgba(255,255,255,0.2)",
                                    color: "white",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                }, children: [_jsx(FiLogOut, { size: 16 }), "Wyloguj"] })] })] }), _jsxs("div", { style: {
                    display: "flex",
                    gap: 8,
                    marginBottom: 24
                }, children: [_jsx("button", { onClick: () => setActiveTab("users"), style: {
                            padding: "12px 24px",
                            background: activeTab === "users" ? "white" : "rgba(255,255,255,0.2)",
                            color: activeTab === "users" ? "#667eea" : "white",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 16,
                            fontWeight: "500"
                        }, children: "U\u017Cytkownicy" }), _jsx("button", { onClick: () => setActiveTab("thermostats"), style: {
                            padding: "12px 24px",
                            background: activeTab === "thermostats" ? "white" : "rgba(255,255,255,0.2)",
                            color: activeTab === "thermostats" ? "#667eea" : "white",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 16,
                            fontWeight: "500"
                        }, children: "Wszystkie termostaty" }), selectedUser && (_jsxs("button", { onClick: () => setActiveTab("user-details"), style: {
                            padding: "12px 24px",
                            background: activeTab === "user-details" ? "white" : "rgba(255,255,255,0.2)",
                            color: activeTab === "user-details" ? "#667eea" : "white",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 16,
                            fontWeight: "500"
                        }, children: ["Szczeg\u00F3\u0142y: ", selectedUser.email] }))] }), error && (_jsxs("div", { style: {
                    background: "#dc3545",
                    color: "white",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 24
                }, children: [error, _jsx("button", { onClick: () => setError(null), style: {
                            background: "none",
                            border: "none",
                            color: "white",
                            float: "right",
                            cursor: "pointer"
                        }, children: "\u00D7" })] })), _jsx("div", { style: {
                    background: "white",
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
                }, children: loading ? (_jsx("div", { style: { textAlign: "center", padding: 40, color: "#666" }, children: "\u0141adowanie..." })) : activeTab === "users" ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [_jsx("h2", { style: { margin: 0, fontSize: 24 }, children: "Zarz\u0105dzanie u\u017Cytkownikami" }), _jsxs("button", { onClick: () => setShowAddUser(true), style: {
                                        padding: "8px 16px",
                                        background: "#28a745",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8
                                    }, children: [_jsx(FiPlus, { size: 16 }), "Dodaj u\u017Cytkownika"] })] }), showAddUser && (_jsx(AddUserForm, { onSubmit: createUser, onCancel: () => setShowAddUser(false) })), _jsx(UserManagement, { users: users, onDeleteUser: deleteUser, onViewDetails: viewUserDetails, onReload: loadUsers, token: token })] })) : activeTab === "thermostats" ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [_jsx("h2", { style: { margin: 0, fontSize: 24 }, children: "Wszystkie termostaty" }), _jsxs("button", { onClick: () => setShowAddThermostat(true), style: {
                                        padding: "8px 16px",
                                        background: "#28a745",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8
                                    }, children: [_jsx(FiPlus, { size: 16 }), "Dodaj termostat"] })] }), showAddThermostat && (_jsx(AddThermostatForm, { onSubmit: createThermostat, onCancel: () => setShowAddThermostat(false) })), _jsx(AllThermostatsManagement, { thermostats: thermostats, users: users, onReload: loadThermostats, token: token })] })) : activeTab === "user-details" && selectedUser ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [_jsxs("h2", { style: { margin: 0, fontSize: 24 }, children: ["Termostaty u\u017Cytkownika: ", selectedUser.email] }), _jsxs("button", { onClick: backToUsers, style: {
                                        padding: "8px 16px",
                                        background: "#6c757d",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8
                                    }, children: [_jsx(FiHome, { size: 16 }), "Powr\u00F3t do u\u017Cytkownik\u00F3w"] })] }), _jsx(UserThermostatManagement, { user: selectedUser, userThermostats: selectedUserThermostats, allThermostats: thermostats, onReload: () => loadUserThermostats(selectedUser.id), onReloadAll: loadThermostats, token: token })] })) : null })] }));
}
// Komponent formularza do dodawania użytkowników
const AddUserForm = ({ onSubmit, onCancel }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (email && password) {
            onSubmit(email, password);
            setEmail('');
            setPassword('');
        }
    };
    return (_jsx("div", { style: {
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
        }, children: _jsxs("div", { style: {
                background: 'white',
                padding: 24,
                borderRadius: 8,
                minWidth: 400
            }, children: [_jsx("h3", { style: { margin: '0 0 20px 0' }, children: "Dodaj nowego u\u017Cytkownika" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Email:" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), style: {
                                        width: '100%',
                                        padding: 8,
                                        border: '1px solid #ccc',
                                        borderRadius: 4,
                                        fontSize: 14
                                    }, required: true })] }), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Has\u0142o:" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), style: {
                                        width: '100%',
                                        padding: 8,
                                        border: '1px solid #ccc',
                                        borderRadius: 4,
                                        fontSize: 14
                                    }, required: true, minLength: 6 })] }), _jsxs("div", { style: { display: 'flex', gap: 12, justifyContent: 'flex-end' }, children: [_jsx("button", { type: "button", onClick: onCancel, style: {
                                        padding: '8px 16px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer'
                                    }, children: "Anuluj" }), _jsx("button", { type: "submit", style: {
                                        padding: '8px 16px',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer'
                                    }, children: "Dodaj u\u017Cytkownika" })] })] })] }) }));
};
// Komponent formularza do dodawania termostatów
const AddThermostatForm = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (name) {
            onSubmit(name);
            setName('');
        }
    };
    return (_jsx("div", { style: {
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
        }, children: _jsxs("div", { style: {
                background: 'white',
                padding: 24,
                borderRadius: 8,
                minWidth: 400
            }, children: [_jsx("h3", { style: { margin: '0 0 20px 0' }, children: "Dodaj nowy termostat" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Nazwa termostatu:" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "np. Termostat Salon", style: {
                                        width: '100%',
                                        padding: 8,
                                        border: '1px solid #ccc',
                                        borderRadius: 4,
                                        fontSize: 14
                                    }, required: true })] }), _jsxs("div", { style: { display: 'flex', gap: 12, justifyContent: 'flex-end' }, children: [_jsx("button", { type: "button", onClick: onCancel, style: {
                                        padding: '8px 16px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer'
                                    }, children: "Anuluj" }), _jsx("button", { type: "submit", style: {
                                        padding: '8px 16px',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer'
                                    }, children: "Dodaj termostat" })] })] })] }) }));
};
// User Management Component
function UserManagement({ users, onDeleteUser, onViewDetails, onReload, token }) {
    const [editingUser, setEditingUser] = useState(null);
    const [newEmail, setNewEmail] = useState("");
    const startEdit = (user) => {
        setEditingUser(user.id);
        setNewEmail(user.email);
    };
    const saveEmail = async (userId) => {
        try {
            await api.adminUpdateUserEmail(token, userId, newEmail);
            setEditingUser(null);
            onReload();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd zmiany emaila");
        }
    };
    return (_jsx("div", { children: users.length === 0 ? (_jsx("p", { style: { color: "#666", textAlign: "center", padding: 20 }, children: "Brak u\u017Cytkownik\u00F3w" })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#f8f9fa" }, children: [_jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "ID" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Email" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Status" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Akcje" })] }) }), _jsx("tbody", { children: users.map(user => (_jsxs("tr", { style: { borderBottom: "1px solid #eee" }, children: [_jsx("td", { style: { padding: 12 }, children: user.id }), _jsx("td", { style: { padding: 12 }, children: editingUser === user.id ? (_jsx("input", { type: "email", value: newEmail, onChange: (e) => setNewEmail(e.target.value), style: {
                                            padding: "4px 8px",
                                            border: "1px solid #ddd",
                                            borderRadius: 4,
                                            fontSize: 14
                                        }, onKeyDown: (e) => e.key === "Enter" && saveEmail(user.id) })) : (_jsxs("span", { style: {
                                            fontWeight: user.email === "admin@example.com" ? "bold" : "normal",
                                            color: user.email === "admin@example.com" ? "#667eea" : "inherit"
                                        }, children: [user.email, user.email === "admin@example.com" && " (Admin)"] })) }), _jsx("td", { style: { padding: 12 }, children: _jsx("span", { style: {
                                            padding: "4px 8px",
                                            borderRadius: 4,
                                            fontSize: 12,
                                            background: user.is_active ? "#d4edda" : "#f8d7da",
                                            color: user.is_active ? "#155724" : "#721c24"
                                        }, children: user.is_active ? "Aktywny" : "Nieaktywny" }) }), _jsx("td", { style: { padding: 12 }, children: _jsx("div", { style: { display: "flex", gap: 8 }, children: editingUser === user.id ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => saveEmail(user.id), style: {
                                                        padding: "4px 8px",
                                                        background: "#28a745",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        fontSize: 12
                                                    }, children: "Zapisz" }), _jsx("button", { onClick: () => setEditingUser(null), style: {
                                                        padding: "4px 8px",
                                                        background: "#6c757d",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        fontSize: 12
                                                    }, children: "Anuluj" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => onViewDetails(user), style: {
                                                        padding: "6px",
                                                        background: "#17a2b8",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer"
                                                    }, title: "Zobacz termostaty", children: _jsx(FiUsers, { size: 14 }) }), _jsx("button", { onClick: () => startEdit(user), style: {
                                                        padding: "6px",
                                                        background: "#007bff",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer"
                                                    }, title: "Edytuj email", children: _jsx(FiEdit, { size: 14 }) }), user.email !== "admin@example.com" && (_jsx("button", { onClick: () => onDeleteUser(user.id), style: {
                                                        padding: "6px",
                                                        background: "#dc3545",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer"
                                                    }, title: "Usu\u0144 u\u017Cytkownika", children: _jsx(FiTrash2, { size: 14 }) }))] })) }) })] }, user.id))) })] }) })) }));
}
// Thermostat Management Component  
function ThermostatManagement({ thermostats, users, onReload, token }) {
    const assignThermostat = async (thermostatId, userId) => {
        try {
            await api.adminAssignThermostat(token, thermostatId, userId);
            onReload();
            alert("Termostat został przypisany do użytkownika");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd przypisywania termostatu");
        }
    };
    const deleteThermostat = async (thermostatId) => {
        if (window.confirm("Czy na pewno chcesz usunąć ten termostat?")) {
            try {
                await api.adminDeleteThermostat(token, thermostatId);
                onReload();
                alert("Termostat został usunięty");
            }
            catch (err) {
                alert(err instanceof Error ? err.message : "Błąd usuwania termostatu");
            }
        }
    };
    return (_jsx("div", { children: thermostats.length === 0 ? (_jsx("p", { style: { color: "#666", textAlign: "center", padding: 20 }, children: "Brak termostat\u00F3w" })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#f8f9fa" }, children: [_jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "ID" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Nazwa" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Temperatura" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Przypisz do" })] }) }), _jsx("tbody", { children: thermostats.map(thermostat => (_jsxs("tr", { style: { borderBottom: "1px solid #eee" }, children: [_jsx("td", { style: { padding: 12 }, children: thermostat.id }), _jsx("td", { style: { padding: 12 }, children: thermostat.name }), _jsxs("td", { style: { padding: 12 }, children: [thermostat.settings.target_temp_c, "\u00B0C", _jsxs("span", { style: { color: "#666", marginLeft: 8 }, children: ["(", thermostat.settings.mode, ")"] })] }), _jsx("td", { style: { padding: 12 }, children: _jsxs("select", { onChange: (e) => {
                                            const userId = parseInt(e.target.value);
                                            if (userId)
                                                assignThermostat(thermostat.id, userId);
                                        }, style: {
                                            padding: "6px 12px",
                                            border: "1px solid #ddd",
                                            borderRadius: 4,
                                            fontSize: 14
                                        }, defaultValue: "", children: [_jsx("option", { value: "", children: "-- Wybierz u\u017Cytkownika --" }), users.map(user => (_jsxs("option", { value: user.id, children: [user.email, " (ID: ", user.id, ")"] }, user.id)))] }) })] }, thermostat.id))) })] }) })) }));
}
// All Thermostats Management Component - Shows all thermostats with their owners
function AllThermostatsManagement({ thermostats, users, onReload, token }) {
    const [selectedThermostat, setSelectedThermostat] = useState(null);
    const [thermostatUsers, setThermostatUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    // Load users when thermostat is selected
    useEffect(() => {
        if (selectedThermostat) {
            loadThermostatUsers(selectedThermostat.id);
        }
    }, [selectedThermostat]);
    const loadThermostatUsers = async (thermostatId) => {
        setIsLoadingUsers(true);
        try {
            const users = await api.adminGetThermostatUsers(token, thermostatId);
            setThermostatUsers(users);
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd ładowania użytkowników");
        }
        finally {
            setIsLoadingUsers(false);
        }
    };
    const shareThermostat = async (thermostatId, userId) => {
        try {
            await api.adminShareThermostat(token, thermostatId, userId);
            loadThermostatUsers(thermostatId);
            onReload();
            alert("Termostat został udostępniony użytkownikowi");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd udostępniania termostatu");
        }
    };
    const unshareThermostat = async (thermostatId, userId) => {
        try {
            await api.adminUnshareThermostat(token, thermostatId, userId);
            loadThermostatUsers(thermostatId);
            onReload();
            alert("Udostępnienie termostatu zostało cofnięte");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd cofania udostępnienia termostatu");
        }
    };
    const assignThermostat = async (thermostatId, userId) => {
        try {
            await api.adminAssignThermostat(token, thermostatId, userId);
            onReload();
            alert("Termostat został przypisany do użytkownika");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd przypisywania termostatu");
        }
    };
    const unassignThermostat = async (thermostatId) => {
        try {
            await api.adminUnassignThermostat(token, thermostatId);
            onReload();
            alert("Termostat został odłączony od użytkownika");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd odłączania termostatu");
        }
    };
    const deleteThermostat = async (thermostatId) => {
        if (!confirm("Czy na pewno chcesz usunąć ten termostat? Wszystkie powiązane dane zostaną utracone."))
            return;
        try {
            await api.adminDeleteThermostat(token, thermostatId);
            onReload();
            alert("Termostat został usunięty");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd usuwania termostatu");
        }
    };
    return (_jsxs("div", { children: [thermostats.length === 0 ? (_jsx("p", { style: { color: "#666", textAlign: "center", padding: 20 }, children: "Brak termostat\u00F3w" })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#f8f9fa" }, children: [_jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "ID" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Nazwa" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "W\u0142a\u015Bciciel" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Temperatura" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Akcje" })] }) }), _jsx("tbody", { children: thermostats.map(thermostat => (_jsxs("tr", { style: { borderBottom: "1px solid #eee" }, children: [_jsx("td", { style: { padding: 12 }, children: thermostat.id }), _jsx("td", { style: { padding: 12 }, children: thermostat.name }), _jsx("td", { style: { padding: 12 }, children: thermostat.owner_email ? (_jsx("span", { style: { color: "#28a745" }, children: thermostat.owner_email })) : (_jsx("span", { style: { color: "#6c757d", fontStyle: "italic" }, children: "Nieprzypisany" })) }), _jsxs("td", { style: { padding: 12 }, children: [thermostat.settings.target_temp_c, "\u00B0C", _jsxs("span", { style: { color: "#666", marginLeft: 8 }, children: ["(", thermostat.settings.mode, ")"] })] }), _jsx("td", { style: { padding: 12 }, children: _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [thermostat.owner_id ? (_jsx("button", { onClick: () => unassignThermostat(thermostat.id), style: {
                                                        padding: "4px 8px",
                                                        background: "#ffc107",
                                                        color: "#000",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        fontSize: 12
                                                    }, children: "Od\u0142\u0105cz" })) : (_jsxs("select", { onChange: (e) => {
                                                        const userId = parseInt(e.target.value);
                                                        if (userId)
                                                            assignThermostat(thermostat.id, userId);
                                                    }, style: {
                                                        padding: "4px 8px",
                                                        border: "1px solid #ddd",
                                                        borderRadius: 4,
                                                        fontSize: 12
                                                    }, defaultValue: "", children: [_jsx("option", { value: "", children: "Przypisz do..." }), users.map(user => (_jsx("option", { value: user.id, children: user.email }, user.id)))] })), _jsx("button", { onClick: () => setSelectedThermostat(thermostat), style: {
                                                        padding: "4px 8px",
                                                        background: "#17a2b8",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        fontSize: 12
                                                    }, children: "Udost\u0119pnij" }), _jsx("button", { onClick: () => deleteThermostat(thermostat.id), style: {
                                                        padding: "4px 8px",
                                                        background: "#dc3545",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        fontSize: 12
                                                    }, children: _jsx(FiTrash2, { size: 12 }) })] }) })] }, thermostat.id))) })] }) })), selectedThermostat && (_jsx("div", { style: {
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
                }, children: _jsxs("div", { style: {
                        background: "white",
                        padding: 24,
                        borderRadius: 8,
                        maxWidth: 600,
                        width: "90%",
                        maxHeight: "80vh",
                        overflow: "auto"
                    }, children: [_jsxs("h3", { children: ["Udost\u0119pnij termostat: ", selectedThermostat.name] }), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("h4", { children: "Aktywni u\u017Cytkownicy:" }), isLoadingUsers ? (_jsx("p", { children: "\u0141adowanie..." })) : thermostatUsers.length === 0 ? (_jsx("p", { style: { color: "#666" }, children: "Termostat nie jest udost\u0119pniony \u017Cadnemu u\u017Cytkownikowi" })) : (_jsx("div", { children: thermostatUsers.map(user => (_jsxs("div", { style: {
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: 8,
                                            background: "#f8f9fa",
                                            marginBottom: 8,
                                            borderRadius: 4
                                        }, children: [_jsx("span", { children: user.email }), _jsx("button", { onClick: () => unshareThermostat(selectedThermostat.id, user.id), style: {
                                                    padding: "4px 8px",
                                                    background: "#dc3545",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                    fontSize: 12
                                                }, children: "Usu\u0144 dost\u0119p" })] }, user.id))) }))] }), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("h4", { children: "Udost\u0119pnij nowemu u\u017Cytkownikowi:" }), _jsxs("select", { onChange: (e) => {
                                        const userId = parseInt(e.target.value);
                                        if (userId && selectedThermostat) {
                                            shareThermostat(selectedThermostat.id, userId);
                                            e.target.value = "";
                                        }
                                    }, style: {
                                        padding: "8px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: 4,
                                        width: "100%"
                                    }, defaultValue: "", children: [_jsx("option", { value: "", children: "Wybierz u\u017Cytkownika..." }), users.filter(user => !thermostatUsers.find(tu => tu.id === user.id)).map(user => (_jsx("option", { value: user.id, children: user.email }, user.id)))] })] }), _jsx("div", { style: { display: "flex", gap: 12, justifyContent: "flex-end" }, children: _jsx("button", { onClick: () => {
                                    setSelectedThermostat(null);
                                    setThermostatUsers([]);
                                }, style: {
                                    padding: "8px 16px",
                                    background: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 4,
                                    cursor: "pointer"
                                }, children: "Zamknij" }) })] }) }))] }));
}
// User Thermostat Management Component - Shows thermostats for a specific user
function UserThermostatManagement({ user, userThermostats, allThermostats, onReload, onReloadAll, token }) {
    const unassignThermostat = async (thermostatId) => {
        try {
            await api.adminUnassignThermostat(token, thermostatId);
            onReload();
            onReloadAll();
            alert("Termostat został odłączony od użytkownika");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd odłączania termostatu");
        }
    };
    const assignThermostat = async (thermostatId) => {
        try {
            await api.adminAssignThermostat(token, thermostatId, user.id);
            onReload();
            onReloadAll();
            alert("Termostat został przypisany do użytkownika");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Błąd przypisywania termostatu");
        }
    };
    const availableThermostats = allThermostats.filter(t => !t.owner_id);
    return (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h3", { style: { margin: "0 0 16px 0", fontSize: 18 }, children: "Termostaty u\u017Cytkownika" }), userThermostats.length === 0 ? (_jsx("p", { style: { color: "#666", textAlign: "center", padding: 20 }, children: "U\u017Cytkownik nie ma przypisanych termostat\u00F3w" })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#f8f9fa" }, children: [_jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "ID" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Nazwa" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Temperatura" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Akcja" })] }) }), _jsx("tbody", { children: userThermostats.map(thermostat => (_jsxs("tr", { style: { borderBottom: "1px solid #eee" }, children: [_jsx("td", { style: { padding: 12 }, children: thermostat.id }), _jsx("td", { style: { padding: 12 }, children: thermostat.name }), _jsxs("td", { style: { padding: 12 }, children: [thermostat.settings.target_temp_c, "\u00B0C", _jsxs("span", { style: { color: "#666", marginLeft: 8 }, children: ["(", thermostat.settings.mode, ")"] })] }), _jsx("td", { style: { padding: 12 }, children: _jsx("button", { onClick: () => unassignThermostat(thermostat.id), style: {
                                                        padding: "4px 8px",
                                                        background: "#dc3545",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        fontSize: 12
                                                    }, children: "Od\u0142\u0105cz" }) })] }, thermostat.id))) })] }) }))] }), _jsxs("div", { children: [_jsx("h3", { style: { margin: "0 0 16px 0", fontSize: 18 }, children: "Dost\u0119pne termostaty do przypisania" }), availableThermostats.length === 0 ? (_jsx("p", { style: { color: "#666", textAlign: "center", padding: 20 }, children: "Brak dost\u0119pnych termostat\u00F3w do przypisania" })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#f8f9fa" }, children: [_jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "ID" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Nazwa" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Temperatura" }), _jsx("th", { style: { padding: 12, borderBottom: "2px solid #dee2e6", textAlign: "left" }, children: "Akcja" })] }) }), _jsx("tbody", { children: availableThermostats.map(thermostat => (_jsxs("tr", { style: { borderBottom: "1px solid #eee" }, children: [_jsx("td", { style: { padding: 12 }, children: thermostat.id }), _jsx("td", { style: { padding: 12 }, children: thermostat.name }), _jsxs("td", { style: { padding: 12 }, children: [thermostat.settings.target_temp_c, "\u00B0C", _jsxs("span", { style: { color: "#666", marginLeft: 8 }, children: ["(", thermostat.settings.mode, ")"] })] }), _jsx("td", { style: { padding: 12 }, children: _jsx("button", { onClick: () => assignThermostat(thermostat.id), style: {
                                                        padding: "4px 8px",
                                                        background: "#28a745",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        fontSize: 12
                                                    }, children: "Przypisz" }) })] }, thermostat.id))) })] }) }))] })] }));
}
