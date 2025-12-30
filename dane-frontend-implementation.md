# Dane do rozdziału 5.3 - Implementacja aplikacji React PWA

## 1. ARCHITEKTURA FRONTENDU

### Stack technologiczny
```json
{
  "dependencies": {
    "react": "^18.3.1",           // Framework UI z hooks
    "react-dom": "^18.3.1",       // DOM rendering  
    "react-icons": "^5.5.0"       // Ikony (Feather, Heroicons)
  },
  "devDependencies": {
    "@types/react": "^18.3.26",   // TypeScript definitions
    "@vitejs/plugin-react": "^5.0.4", // Vite React plugin
    "tailwindcss": "^3.4.18",     // Utility-first CSS framework
    "typescript": "^5.9.3",       // Type safety
    "vite": "^7.1.11",           // Build tool i dev server
    "vite-plugin-pwa": "^0.21.1"  // PWA capabilities (zaplanowane)
  }
}
```

### Struktura projektu
```
frontend/
├── src/
│   ├── main.tsx              # Entry point React aplikacji
│   ├── App.tsx               # Main app component z routingiem
│   ├── config.ts             # Konfiguracja API endpoints
│   ├── api.ts                # HTTP client dla backend API
│   ├── index.css             # Tailwind CSS imports
│   ├── context/
│   │   └── AuthContext.tsx   # Global state management (JWT)
│   ├── pages/
│   │   ├── Dashboard.tsx     # Main user dashboard (586 linii)
│   │   ├── AdminDashboard.tsx # Admin panel (483 linii) 
│   │   ├── Login.tsx         # Authentication
│   │   └── Register.tsx      # User registration
│   ├── components/
│   │   └── TempControl.tsx   # Reusable temperature control
│   └── features/
│       ├── thermostat/
│       │   ├── ThermostatPanel.tsx
│       │   ├── api.ts
│       │   ├── index.ts
│       │   └── useThermostat.ts
│       └── schedule/
│           ├── ScheduleManager.tsx  # Schedule management UI
│           ├── api.ts               # Schedule API client
│           └── index.ts
├── vite.config.ts           # Vite configuration + proxy
├── tailwind.config.js       # Tailwind theme customization
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies i scripts
└── Dockerfile              # Containerization
```

## 2. BUILD SYSTEM I DEVELOPMENT

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    // VitePWA - planned for PWA features
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      "/auth": {
        target: "http://192.168.55.252:8000",    // Backend API
        changeOrigin: true,
        secure: false
      },
      "/thermostats": { /* ... */ },
      "/device": { /* ... */ },
      "/admin": { /* ... */ }
    }
  }
});
```

### Build scripts
```json
{
  "scripts": {
    "dev": "vite --port 5173",           // Development server
    "build": "tsc -b && vite build",     // Production build  
    "preview": "vite preview --port 5173" // Preview build
  }
}
```

### TypeScript konfiguracja
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext", 
    "moduleResolution": "node",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## 3. STYLING I UI SYSTEM

### Tailwind CSS Setup
```javascript
// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',   // Light green shades
          500: '#22c55e',  // Primary green
          600: '#16a34a',  // Darker green
          900: '#14532d',  // Dark green
        },
        secondary: {
          50: '#fafafa',   // Gray shades for backgrounds
          500: '#71717a',  // Medium gray
          900: '#18181b',  // Dark gray
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'scale-in': 'scaleIn 0.1s ease-out'
      }
    }
  }
}
```

### Design system komponenty
```css
/* Klasy utility używane w aplikacji */
.gradient-bg {
  @apply bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700;
}

.glass-effect {
  @apply backdrop-blur-md bg-white/10 border border-white/20;
}

.card-shadow {
  @apply shadow-lg hover:shadow-xl transition-shadow duration-300;
}
```

## 4. STATE MANAGEMENT I CONTEXT

### AuthContext (Global State)
```tsx
// context/AuthContext.tsx
interface AuthContextType {
  token: string | null;
  user: { id: number; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('heatbeat_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<{ id: number; email: string } | null>(null);

  // Auto-load user info when token changes
  useEffect(() => {
    if (token) {
      api.me(token)
        .then(userData => {
          setUser(userData);
          localStorage.setItem('heatbeat_token', token);
        })
        .catch(() => {
          setToken(null);
          localStorage.removeItem('heatbeat_token');
        });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.access_token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('heatbeat_token');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Local State Management
```tsx
// Przykład local state w Dashboard.tsx
const Dashboard = () => {
  const [thermostats, setThermostats] = useState([]);
  const [selectedThermostat, setSelectedThermostat] = useState(null);
  const [activeView, setActiveView] = useState<"dashboard" | "schedule">("dashboard");
  const [loading, setLoading] = useState(true);
  
  // Effects for data fetching
  useEffect(() => {
    loadThermostats();
    const interval = setInterval(loadThermostats, 30000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);
```

## 5. HTTP CLIENT I API INTEGRATION

### API Configuration
```typescript
// config.ts
export const API_CONFIG = {
  BASE_URL: 'http://192.168.55.252:8000',
  
  getUrl: (endpoint: string) => {
    const url = `http://192.168.55.252:8000${endpoint}`;
    console.log('API Call to:', url); // Debug logging
    return url;
  }
};
```

### API Client
```typescript
// api.ts - Main API functions
export const api = {
  async login(email: string, password: string) {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const res = await fetch(API_CONFIG.getUrl("/auth/login"), {
      method: "POST", 
      body: form 
    });
    if (!res.ok) throw new Error("Błędny login/hasło");
    return res.json() as Promise<{ access_token: string }>;
  },

  async listThermostats(token: string) {
    const res = await fetch(API_CONFIG.getUrl("/thermostats"), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd listy termostatów");
    return res.json();
  },

  async updateSettings(token: string, tid: number, body: { target_temp_c: number; mode: string }) {
    const res = await fetch(API_CONFIG.getUrl(`/thermostats/${tid}/settings`), {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Błąd zapisu ustawień");
    return res.json();
  }
};
```

### Error Handling
```tsx
// Przykład error handling w components
const [error, setError] = useState<string | null>(null);

const handleTemperatureChange = async (newTemp: number) => {
  try {
    setError(null);
    await api.updateSettings(token, thermostat.id, {
      target_temp_c: newTemp,
      mode: thermostat.settings.mode
    });
    // Success feedback
    setSuccess("Temperatura została zaktualizowana");
  } catch (err) {
    setError(err.message || "Wystąpił błąd");
  }
};
```

## 6. KOMPONENTY UI I UX PATTERNS

### App Router Component
```tsx
// App.tsx - Main routing logic
function InnerApp() {
  const { token, isAdmin } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  if (token) {
    // Check URL params for admin panel
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');
    
    if (adminParam === 'true' && isAdmin) {
      return <AdminDashboard />;
    }
    
    return <Dashboard />;
  }

  return mode === "login" ? (
    <Login onSwitchToRegister={() => setMode("register")} />
  ) : (
    <Register onSwitchToLogin={() => setMode("login")} />
  );
}
```

### Dashboard Layout
```tsx
// pages/Dashboard.tsx - Main user interface
const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      {/* Header Navigation */}
      <div className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">HeatBeat Control</h1>
            
            {/* View Toggle Buttons */}
            <div className="flex rounded-lg bg-white/20 p-1">
              <button onClick={() => setActiveView("dashboard")}>
                <FiHome className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              <button onClick={() => setActiveView("schedule")}>
                <FiClock className="w-5 h-5" />
                <span>Harmonogram</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeView === "dashboard" && (
          <DashboardContent thermostats={thermostats} />
        )}
        {activeView === "schedule" && (
          <ScheduleManager thermostat={selectedThermostat} />
        )}
      </div>
    </div>
  );
};
```

### Temperature Control Component
```tsx
// components/TempControl.tsx - Reusable temperature widget
interface TempControlProps {
  currentTemp: number;
  targetTemp: number;
  onTempChange: (temp: number) => void;
  mode: string;
  onModeChange: (mode: string) => void;
  disabled?: boolean;
}

export function TempControl({ currentTemp, targetTemp, onTempChange, mode, onModeChange, disabled }: TempControlProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      {/* Current Temperature Display */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-gray-800">
          {currentTemp.toFixed(1)}°C
        </div>
        <div className="text-gray-500">Aktualna temperatura</div>
      </div>

      {/* Target Temperature Controls */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <button 
          onClick={() => onTempChange(targetTemp - 0.5)}
          disabled={disabled}
          className="w-12 h-12 rounded-full bg-blue-500 text-white hover:bg-blue-600"
        >
          -
        </button>
        
        <div className="text-2xl font-semibold text-center min-w-[120px]">
          {targetTemp.toFixed(1)}°C
        </div>
        
        <button 
          onClick={() => onTempChange(targetTemp + 0.5)}
          disabled={disabled}
          className="w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600"
        >
          +
        </button>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center space-x-2">
        {["auto", "heat", "off"].map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === m 
                ? 'bg-primary-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## 7. FEATURE MODULES

### Schedule Management Feature
```tsx
// features/schedule/ScheduleManager.tsx
export function ScheduleManager({ thermostat }: { thermostat: any }) {
  const [activeTab, setActiveTab] = useState<'entries' | 'templates'>('entries');
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Load schedule data
  useEffect(() => {
    if (thermostat) {
      loadScheduleEntries();
      loadTemplates();
    }
  }, [thermostat]);

  const loadScheduleEntries = async () => {
    try {
      const data = await scheduleAPI.getEntries(thermostat.id, token);
      setEntries(data);
    } catch (error) {
      setError('Błąd ładowania harmonogramu');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab('entries')}
          className={`px-6 py-3 font-medium ${activeTab === 'entries' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
        >
          Wpisy harmonogramu
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 font-medium ${activeTab === 'templates' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
        >
          Szablony
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'entries' && (
          <ScheduleEntries entries={entries} onUpdate={loadScheduleEntries} />
        )}
        {activeTab === 'templates' && (
          <ScheduleTemplates templates={templates} onUpdate={loadTemplates} />
        )}
      </div>
    </div>
  );
}
```

### Admin Dashboard Feature
```tsx
// pages/AdminDashboard.tsx - Advanced admin interface
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'all-thermostats' | 'users' | 'user-thermostats'>('all-thermostats');

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      {/* Tab Navigation */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto">
          <nav className="flex space-x-8">
            {[
              { id: 'all-thermostats', label: 'Wszystkie termostaty', icon: FiThermometer },
              { id: 'users', label: 'Użytkownicy', icon: FiUsers },
              { id: 'user-thermostats', label: 'Przypisania', icon: FiSettings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeTab === 'all-thermostats' && <AllThermostatsManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'user-thermostats' && <UserThermostatManagement />}
      </div>
    </div>
  );
};
```

## 8. RESPONSYWNOŚĆ I UX

### Mobile-First Design
```css
/* Responsive utilities w Tailwind */
.responsive-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.mobile-nav {
  @apply block md:hidden;
}

.desktop-nav {
  @apply hidden md:flex;
}
```

### Touch-Friendly Controls
```tsx
// Touch-optimized temperature controls
<div className="flex items-center justify-center space-x-6">
  <button 
    className="w-16 h-16 md:w-12 md:h-12 rounded-full bg-blue-500 text-white text-2xl font-bold hover:bg-blue-600 active:scale-95 transition-all"
    onTouchStart={() => setTempButtonPressed(true)}
    onTouchEnd={() => setTempButtonPressed(false)}
  >
    -
  </button>
  
  <div className="text-3xl md:text-2xl font-bold text-center min-w-[140px]">
    {targetTemp.toFixed(1)}°C
  </div>
  
  <button className="w-16 h-16 md:w-12 md:h-12 rounded-full bg-red-500 text-white text-2xl font-bold hover:bg-red-600 active:scale-95 transition-all">
    +
  </button>
</div>
```

### Loading States
```tsx
// Loading skeletons
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
  </div>
);

// Loading states in components
{loading ? (
  <LoadingSkeleton />
) : (
  <ThermostatCard thermostat={thermostat} />
)}
```

## 9. PWA CAPABILITIES (PLANNED)

### PWA Configuration
```typescript
// vite.config.ts (commented out - planned)
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'HeatBeat Control',
    short_name: 'HeatBeat',
    description: 'Aplikacja do sterowania systemem grzewczym',
    theme_color: '#059669',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png', 
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
})
```

### Offline Strategy (planned)
```typescript
// Service Worker strategy
- Cache-first for static assets
- Network-first for API calls
- Offline fallback for critical data
- Background sync for temperature changes
```

## 10. DEPLOYMENT I CONTAINERIZATION

### Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .
EXPOSE 5173

# Development server with external access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Production Build
```bash
# Build for production
npm run build  # Creates dist/ folder

# Serve static files
npm run preview
# Or serve with nginx/apache
```

## 11. PERFORMANCE OPTIMIZATIONS

### Code Splitting
```tsx
// Lazy loading for heavy components
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ScheduleManager = lazy(() => import('./features/schedule/ScheduleManager'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>
```

### Memoization
```tsx
// Prevent unnecessary re-renders
const ThermostatCard = memo(({ thermostat, onUpdate }) => {
  return (
    <div className="card">
      {/* Component content */}
    </div>
  );
});

// Memoized callbacks
const handleTempChange = useCallback((temp: number) => {
  updateSettings({ target_temp_c: temp });
}, [updateSettings]);
```

### Auto-refresh Strategy
```tsx
// Efficient polling for real-time data
useEffect(() => {
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadThermostats(); // Only refresh if tab is visible
    }
  }, 30000); // 30 second intervals

  return () => clearInterval(interval);
}, []);
```

## 12. ACCESSIBILITY I UX

### Semantic HTML
```tsx
// Proper semantic structure
<main role="main">
  <section aria-label="Thermostat Controls">
    <h2>Temperature Control</h2>
    <button aria-label="Decrease temperature by 0.5 degrees">-</button>
    <input 
      type="number" 
      aria-label="Target temperature"
      value={targetTemp}
      onChange={handleTempChange}
    />
    <button aria-label="Increase temperature by 0.5 degrees">+</button>
  </section>
</main>
```

### Focus Management
```tsx
// Keyboard navigation support
<button 
  className="focus:ring-2 focus:ring-primary-500 focus:outline-none"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Action Button
</button>
```

### Error States
```tsx
// User-friendly error messages
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
    <strong className="font-bold">Błąd!</strong>
    <span className="block sm:inline"> {error}</span>
  </div>
)}
```

## 13. TESTING STRATEGY (PLANNED)

### Component Testing
```tsx
// Test setup example
import { render, screen, fireEvent } from '@testing-library/react';
import { TempControl } from '../components/TempControl';

test('increments temperature when plus button clicked', () => {
  const mockOnTempChange = jest.fn();
  
  render(
    <TempControl 
      currentTemp={20} 
      targetTemp={21} 
      onTempChange={mockOnTempChange} 
      mode="auto"
      onModeChange={jest.fn()}
    />
  );
  
  const plusButton = screen.getByText('+');
  fireEvent.click(plusButton);
  
  expect(mockOnTempChange).toHaveBeenCalledWith(21.5);
});
```

### Integration Testing
```tsx
// API integration tests
test('updates thermostat settings', async () => {
  const mockApi = {
    updateSettings: jest.fn().mockResolvedValue({ success: true })
  };
  
  render(<Dashboard />, { wrapper: AuthProvider });
  
  const tempInput = screen.getByLabelText('Target temperature');
  fireEvent.change(tempInput, { target: { value: '22' } });
  
  await waitFor(() => {
    expect(mockApi.updateSettings).toHaveBeenCalledWith(
      expect.any(String), // token
      1, // thermostat id
      { target_temp_c: 22, mode: 'auto' }
    );
  });
});
```

## 14. MONITORING I ANALYTICS

### Error Tracking
```tsx
// Error boundary for crash reporting
class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
    // Send to monitoring service (Sentry, LogRocket)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### Performance Metrics
```tsx
// Track user interactions
const trackTemperatureChange = (oldTemp: number, newTemp: number) => {
  console.log('Temperature change:', { oldTemp, newTemp, timestamp: Date.now() });
  // Send analytics event
};

// Monitor API performance
const measureApiCall = async (apiCall: () => Promise<any>) => {
  const start = performance.now();
  try {
    const result = await apiCall();
    console.log(`API call took ${performance.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`API call failed after ${performance.now() - start}ms`);
    throw error;
  }
};
```