# Architecture Documentation

## Overview

Task Reminder is a **desktop-first task management application** built with modern web technologies and Rust. The application follows **Clean Architecture** principles to ensure maintainability, testability, and scalability.

## Technology Stack

### Frontend
- **React 18.3** - UI library with hooks and concurrent features
- **TypeScript 5.3** - Type-safe JavaScript
- **Vite 5.1** - Fast build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Zustand 4.5** - Lightweight state management
- **React Router 6.22** - Client-side routing
- **date-fns 3.3** - Date manipulation and formatting
- **Lucide React** - Modern icon library

### Backend
- **Tauri 2.0** - Rust-based desktop application framework
- **Rust 2021 Edition** - Systems programming language
- **rusqlite 0.31** - SQLite database interface
- **tokio** - Async runtime for background tasks
- **chrono 0.4** - Date and time handling
- **serde/serde_json** - Serialization/deserialization

### Database
- **SQLite** - Embedded, serverless database
- **Migrations** - Version-controlled schema changes
- **Offline-first** - Full functionality without internet

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                     Presentation Layer                  │
│  (React Components, Pages, UI Logic)                    │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                    │
│  (Zustand Stores, Routing, State Orchestration)         │
├─────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                  │
│  (Tauri API, HTTP Clients, Local Storage)               │
├─────────────────────────────────────────────────────────┤
│                      Domain Layer                       │
│  (Entities, Types, Business Rules)                      │
└─────────────────────────────────────────────────────────┘

                    Frontend (TypeScript)

═══════════════════════════════════════════════════════════

                    Backend (Rust)

┌─────────────────────────────────────────────────────────┐
│                    Tauri Commands                       │
│  (IPC Bridge between Frontend and Backend)              │
├─────────────────────────────────────────────────────────┤
│                    Service Layer                        │
│  (Business Logic, Validation, Orchestration)            │
├─────────────────────────────────────────────────────────┤
│                   Repository Layer                      │
│  (Data Access, SQL Queries, CRUD Operations)            │
├─────────────────────────────────────────────────────────┤
│                     Model Layer                         │
│  (Data Structures, Entities, DTOs)                      │
├─────────────────────────────────────────────────────────┤
│                    Database Layer                       │
│  (SQLite, Migrations, Seeding)                          │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Directory Structure

```
src/
├── domain/                    # Business entities and types
│   └── entities/
│       ├── Task.ts           # Task entity with business logic
│       ├── Reminder.ts       # Reminder entity
│       ├── Tag.ts            # Tag entity
│       └── AppSettings.ts    # Settings entity
│
├── infrastructure/            # External integrations
│   └── api/
│       ├── taskApi.ts        # Task API client (Tauri invoke)
│       ├── reminderApi.ts    # Reminder API client
│       ├── tagApi.ts         # Tag API client
│       └── settingsApi.ts    # Settings API client
│
├── app/                      # Application state and logic
│   ├── store/
│   │   ├── taskStore.ts      # Task state management
│   │   ├── reminderStore.ts  # Reminder state management
│   │   ├── tagStore.ts       # Tag state management
│   │   ├── toastStore.ts     # Toast notification state
│   │   └── settingsStore.ts  # App settings state
│   ├── hooks/
│   │   ├── useReminderNotifications.ts  # Notification listener
│   │   └── [other custom hooks]
│   ├── routes/
│   │   └── index.tsx         # Route configuration
│   └── providers/
│       ├── AppProvider.tsx   # Root provider
│       └── ThemeProvider.tsx # Theme management
│
├── presentation/             # UI components
│   ├── components/           # Reusable components
│   │   ├── Layout/
│   │   ├── TaskCard.tsx
│   │   ├── ReminderDialog.tsx
│   │   ├── ToastContainer.tsx
│   │   └── [other components]
│   └── pages/                # Page components
│       ├── Dashboard/
│       ├── Tasks/
│       ├── Reminders/
│       ├── Calendar/
│       └── Settings/
│
└── shared/                   # Shared utilities
    ├── styles/
    │   └── globals.css
    ├── constants/
    └── utils/
        ├── errorMessages.ts
        └── [other utilities]
```

### State Management Pattern

```typescript
// Zustand store pattern
interface TaskStore {
  // State
  tasks: Task[];
  selectedTask: Task | null;
  
  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (dto: CreateTaskDto) => Promise<Task>;
  updateTask: (id: string, dto: UpdateTaskDto) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
}
```

### Component Patterns

1. **Container/Presenter Pattern**
   - Containers handle state and side effects
   - Presenters are pure UI components

2. **Compound Components**
   - Dialog components with Dialog.Root, Dialog.Content, etc.
   - Layout components with nested structure

3. **Custom Hooks**
   - Encapsulate reusable logic
   - Handle side effects and API calls

## Backend Architecture

### Directory Structure

```
src-tauri/src/
├── main.rs                   # Application entry point
├── lib.rs                    # Library root (if needed)
│
├── commands/                 # Tauri command handlers
│   ├── mod.rs
│   ├── task_commands.rs      # Task CRUD commands
│   ├── reminder_commands.rs  # Reminder CRUD commands
│   ├── tag_commands.rs       # Tag CRUD commands
│   └── settings_commands.rs  # Settings commands
│
├── services/                 # Business logic layer
│   ├── mod.rs
│   ├── task_service.rs       # Task business logic
│   ├── reminder_service.rs   # Reminder business logic
│   └── notification_service.rs # Legacy notification service
│
├── repositories/             # Data access layer
│   ├── mod.rs
│   ├── task_repository.rs    # Task database operations
│   ├── reminder_repository.rs # Reminder database operations
│   └── tag_repository.rs     # Tag database operations
│
├── models/                   # Data structures
│   ├── mod.rs
│   ├── task.rs               # Task model and DTOs
│   ├── reminder.rs           # Reminder model and DTOs
│   ├── tag.rs                # Tag model
│   └── settings.rs           # Settings model
│
├── notification/             # Background notification system
│   └── mod.rs                # NotificationService with 30s polling
│
├── db/                       # Database management
│   ├── mod.rs                # Database connection and setup
│   ├── migrations.rs         # Schema migrations
│   └── seed.rs               # Sample data seeding
│
└── error.rs                  # Error types and handling
```

### Command Pattern

Tauri commands act as the IPC bridge between frontend and backend:

```rust
#[tauri::command]
pub async fn get_tasks(
    db_state: State<'_, Arc<Mutex<Database>>>,
    filters: Option<TaskFilters>,
    pagination: Option<PaginationParams>,
) -> Result<TaskListResponse, String> {
    let db = db_state.lock().map_err(|e| e.to_string())?;
    let repo = TaskRepository::new(&db);
    
    // Business logic...
    
    Ok(response)
}
```

### Repository Pattern

Repositories abstract database operations:

```rust
pub struct TaskRepository<'a> {
    db: &'a Database,
}

impl<'a> TaskRepository<'a> {
    pub fn find_all(&self, filters: TaskFilters) -> Result<Vec<Task>> {
        // SQL query and mapping
    }
    
    pub fn create(&self, dto: CreateTaskDto) -> Result<Task> {
        // Insert and return created task
    }
}
```

### Service Layer

Services contain business logic and validation:

```rust
pub struct TaskService<'a> {
    db: &'a Database,
}

impl<'a> TaskService<'a> {
    pub fn create_task(&self, dto: CreateTaskDto) -> DomainResult<Task> {
        // Validation
        dto.validate()?;
        
        // Business rules
        if dto.due_date.is_some_and(|d| d < Utc::now()) {
            return Err(DomainError::InvalidDueDate);
        }
        
        // Delegate to repository
        let repo = TaskRepository::new(self.db);
        repo.create(dto).map_err(Into::into)
    }
}
```

## Core Features

### 1. Task Management

**Entities:**
- Task: title, description, status, priority, due_date, tags, estimated_minutes, actual_minutes
- TaskStatus: Pending, InProgress, Completed, Cancelled
- TaskPriority: Low, Medium, High, Critical

**Operations:**
- CRUD operations with validation
- Status transitions with business rules
- Tag associations (many-to-many)
- Overdue detection and auto-status updates
- Pagination and filtering

### 2. Reminder System

**Features:**
- Custom repeat intervals: `{type}_{value}_{unit}`
  - Types: none, after, every
  - Units: seconds, minutes, hours, days, weeks, months, years
- Date format: dd/MM/yyyy, 24-hour time (HH:mm)
- Background polling every 30 seconds
- System notifications via Tauri
- Toast notifications in-app
- Audio notification (Web Audio API beep)

**Architecture:**
```rust
// Backend: NotificationService
impl NotificationService {
    pub fn start(&self) {
        // Spawn background thread
        thread::spawn(move || {
            loop {
                thread::sleep(Duration::from_secs(30));
                
                // Check due reminders
                let reminders = repo.find_due_reminders()?;
                
                for reminder in reminders {
                    // Emit event to frontend
                    app_handle.emit("reminder-triggered", &reminder)?;
                    
                    // Show system notification
                    notification().show()?;
                    
                    // Mark as triggered
                    repo.mark_as_triggered(&reminder.id)?;
                }
            }
        });
    }
}
```

```typescript
// Frontend: useReminderNotifications hook
export function useReminderNotifications() {
  useEffect(() => {
    const unlisten = listen<Reminder>('reminder-triggered', (event) => {
      // Play sound
      playNotificationSound();
      
      // Show toast
      toast.info('⏰ Reminder', event.payload.title);
      
      // Browser notification
      new Notification('Task Reminder', { body: event.payload.title });
    });
    
    return () => unlisten.then(fn => fn());
  }, []);
}
```

### 3. Tag System

**Features:**
- Color-coded tags
- Many-to-many relationship with tasks
- Tag filtering and search
- Tag management UI

### 4. Settings Management

**Configurable Settings:**
- Theme (light/dark/system)
- Language preference
- Notification sound toggle
- Show completed tasks
- Default task priority
- Auto-start application

## Data Flow

### Task Creation Flow

```
1. User fills form in TaskDialog component
   ↓
2. Form data converted to CreateTaskDto
   ↓
3. taskStore.createTask() called
   ↓
4. taskApi.createTask() invokes Tauri command
   ↓
5. create_task command receives data
   ↓
6. TaskRepository.create() inserts into SQLite
   ↓
7. Created task returned through layers
   ↓
8. taskStore updates state
   ↓
9. UI re-renders with new task
```

### Reminder Notification Flow

```
1. NotificationService polls every 30 seconds
   ↓
2. ReminderRepository.find_due_reminders() queries DB
   ↓
3. Reminder.is_due() validates business logic
   ↓
4. For each due reminder:
   - Emit "reminder-triggered" event
   - Show system notification
   - Mark as triggered in DB
   ↓
5. Frontend listens to "reminder-triggered"
   ↓
6. useReminderNotifications hook handles event:
   - Play audio beep
   - Show toast notification
   - Show browser notification
```

## Database Schema

### Tasks Table
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    due_date TEXT,
    image_path TEXT,
    notes TEXT,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Reminders Table
```sql
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    remind_at TEXT NOT NULL,
    repeat_interval TEXT NOT NULL,  -- Format: "{type}_{value}_{unit}"
    is_active INTEGER NOT NULL DEFAULT 1,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

### Tags Table
```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

### Task_Tags Junction Table
```sql
CREATE TABLE task_tags (
    task_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

### Settings Table
```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## Performance Considerations

### Frontend
- **Code Splitting**: Lazy load routes and heavy components
- **Memoization**: Use React.memo and useMemo for expensive calculations
- **Virtualization**: Implement virtual scrolling for large task lists
- **Debouncing**: Debounce search inputs and filters

### Backend
- **Connection Pooling**: Single SQLite connection wrapped in Arc<Mutex<>>
- **Indexes**: Database indexes on frequently queried columns
- **Batch Operations**: Use transactions for multiple operations
- **Background Threading**: Notification service runs in separate thread

### Database
- **Prepared Statements**: Reuse SQL statements for better performance
- **Transactions**: ACID compliance with rollback support
- **Foreign Keys**: Enforce referential integrity
- **Cascading Deletes**: Automatic cleanup of related data

## Security

### Data Protection
- **Local Storage**: All data stored locally, no cloud sync
- **SQL Injection**: Parameterized queries prevent injection attacks
- **Input Validation**: Both frontend and backend validation
- **Error Handling**: No sensitive data in error messages

### Application Security
- **Tauri Allowlist**: Only allowed commands can be invoked from frontend
- **CSP Headers**: Content Security Policy prevents XSS
- **No Eval**: No dynamic code execution
- **Signed Builds**: Production builds are code-signed

## Testing Strategy

### Frontend Testing
```bash
# Unit tests for stores and utilities
npm run test

# E2E tests with Playwright
npm run test:e2e
```

### Backend Testing
```bash
# Rust unit tests
cd src-tauri
cargo test

# Integration tests
cargo test --test integration_tests
```

## Build & Deployment

### Development Build
```bash
npm run tauri dev
```

### Production Build
```bash
npm run tauri build
```

Output:
- Windows: `.msi`, `.exe` installers
- macOS: `.dmg`, `.app` bundle
- Linux: `.deb`, `.AppImage`

## Future Enhancements

### Planned Features
- [ ] Cloud sync (optional, end-to-end encrypted)
- [ ] Task templates for recurring workflows
- [ ] Pomodoro timer integration
- [ ] Task dependencies and subtasks
- [ ] Export to CSV/JSON
- [ ] Import from other task managers
- [ ] Keyboard shortcuts customization
- [ ] Multiple reminder sounds
- [ ] Task statistics and insights
- [ ] Mobile companion app

### Technical Improvements
- [ ] Incremental SQLite backups
- [ ] WebSocket for real-time updates (multi-window)
- [ ] Plugin system for extensions
- [ ] Custom themes and CSS variables
- [ ] Accessibility improvements (ARIA, keyboard nav)
- [ ] Performance profiling and optimization
- [ ] Automated testing suite
- [ ] CI/CD pipeline with GitHub Actions

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and how to contribute to the project.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.
