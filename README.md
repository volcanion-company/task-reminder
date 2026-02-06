# Task Reminder

> A modern, offline-first desktop task management and reminder application built with Tauri, React, TypeScript, and SQLite

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6.svg)
![CI](https://github.com/volcanion-company/task-reminder/workflows/CI%2FCD%20Pipeline/badge.svg)
![Coverage](https://img.shields.io/badge/coverage-53%25-yellow.svg)

## ✨ Features

### Task Management
- 📝 **Full CRUD Operations** - Create, read, update, and delete tasks with ease
- 🏷️ **Smart Tagging** - Organize tasks with color-coded tags and multi-tag support
- 📊 **Priority System** - Four priority levels (Low, Medium, High, Critical)
- ⏱️ **Time Tracking** - Estimate and track actual time spent on tasks
- 📅 **Due Dates** - Set deadlines with automatic overdue detection
- 🔄 **Status Management** - Pending, In Progress, Completed, Cancelled states
- 🔍 **Advanced Filtering** - Filter by status, priority, tags, and date ranges
- 🔎 **Full-Text Search** - Quickly find tasks by title or description

### Reminder System
- ⏰ **Smart Reminders** - Set one-time or repeating reminders for tasks
- 🔔 **Custom Intervals** - Flexible repeat patterns:
  - After X units: `after_5_minutes`, `after_1_hour`
  - Every X units: `every_10_seconds`, `every_2_weeks`, `every_1_month`
  - Units: seconds, minutes, hours, days, weeks, months, years
- 📆 **Date/Time Formatting** - dd/MM/yyyy date format with 24-hour time (HH:mm)
- 🔊 **Multi-Channel Notifications**:
  - System notifications (native OS notifications)
  - In-app toast notifications
  - Audio alerts (pleasant two-tone beep)
  - Browser notifications (with permission)
- 🔄 **Background Service** - 30-second polling for due reminders
- ♻️ **Auto-Repeat** - Automatically reschedule repeating reminders
- 🎯 **Task-Linked** - Each reminder associated with a specific task

### User Interface
- 🎨 **Modern Design** - Clean, intuitive interface built with Tailwind CSS
- 🌙 **Dark/Light Mode** - Toggle between dark and light themes (default: dark)
- 📱 **Responsive Layout** - Optimized for various screen sizes
- 🚀 **Fast Performance** - Native desktop performance with Rust backend
- ⌨️ **Keyboard Shortcuts** - Quick actions without leaving the keyboard
- 🎭 **Smooth Animations** - Polished transitions and interactions
- 📊 **Dashboard View** - Overview of tasks, reminders, and statistics
- 📅 **Calendar Integration** - Visual task timeline

### Technical Features
- 💾 **Offline-First** - Full functionality without internet connection
- 🔒 **Local Storage** - All data stored securely on your device
- ⚡ **Real-Time Updates** - Instant UI updates with Zustand state management
- 🏗️ **Clean Architecture** - Maintainable, testable codebase
- 🔄 **Auto-Save** - Changes saved automatically to SQLite database
- 🛡️ **Type Safety** - Full TypeScript and Rust type checking
- 🚦 **Error Handling** - User-friendly error messages
- 🔧 **Dev Tools** - Hot reload, logging, and debugging support

## 📸 Screenshots

```
[Dashboard]  [Task List]  [Reminder Dialog]  [Settings]
```

## 🏗️ Architecture

This application follows **Clean Architecture** principles with clear separation of concerns:

### Frontend (TypeScript/React)
```
src/
├── domain/          # Business entities (Task, Reminder, Tag)
├── infrastructure/  # API clients (Tauri invoke wrappers)
├── app/            # State management (Zustand stores)
│   ├── store/      # Global state stores
│   ├── hooks/      # Custom React hooks
│   ├── routes/     # Route configuration
│   └── providers/  # Context providers
├── presentation/   # UI components and pages
│   ├── components/ # Reusable components
│   └── pages/      # Page-level components
└── shared/         # Utilities, constants, helpers
```

### Backend (Rust/Tauri)
```
src-tauri/src/
├── main.rs          # Application entry point
├── commands/        # Tauri command handlers (IPC bridge)
├── services/        # Business logic layer
├── repositories/    # Data access layer (SQL)
├── models/          # Data structures and DTOs
├── notification/    # Background notification service
├── db/             # Database, migrations, seeding
└── error.rs        # Error types
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

## 🛠️ Technology Stack

### Frontend
- **React 18.3** - UI library with hooks
- **TypeScript 5.3** - Type-safe JavaScript
- **Vite 5.1** - Fast build tool
- **Tailwind CSS 3.4** - Utility-first CSS
- **Zustand 4.5** - State management
- **React Router 6.22** - Client-side routing
- **date-fns 3.3** - Date utilities
- **Lucide React** - Icon library

### Backend
- **Tauri 2.0** - Desktop application framework
- **Rust 2021** - Systems programming language
- **rusqlite 0.31** - SQLite interface
- **tokio** - Async runtime
- **chrono 0.4** - Date/time handling
- **serde** - Serialization

### Database
- **SQLite** - Embedded database
- **SQL Migrations** - Version-controlled schema

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js** (v20 or higher) - [Download](https://nodejs.org/)
- **Yarn** (v1.22 or higher) - [Install](https://classic.yarnpkg.com/en/docs/install)
- **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)

### Platform-Specific Requirements

#### Windows
- **Microsoft Visual Studio C++ Build Tools** - [Download](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- **WebView2** - Usually pre-installed on Windows 10/11

#### macOS
- **Xcode Command Line Tools**
  ```bash
  xcode-select --install
  ```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    patchelf \
    libxdo-dev
```

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/volcanion-company/task-reminder.git
cd task-reminder
```

### 2. Install Dependencies

```bash
# Install frontend dependencies with Yarn
yarn install

# Tauri CLI will automatically manage Rust dependencies
```

### 3. Run in Development Mode

```bash
yarn tauri dev
```

This will:
- Start the Vite development server on `http://localhost:5173`
- Compile the Rust backend in debug mode
- Launch the desktop application
- Enable hot-reload for frontend changes
- Auto-rebuild backend on Rust file changes
- Seed sample data in development mode

### 4. Build for Production

```bash
yarn tauri build
```

Output locations:
- **Windows**: `src-tauri/target/release/bundle/msi/` and `nsis/`
- **macOS**: `src-tauri/target/release/bundle/dmg/` and `macos/`
- **Linux**: `src-tauri/target/release/bundle/deb/` and `appimage/`

## 📖 Usage Guide

### Creating Tasks

1. Click "**+ New Task**" button
2. Fill in task details:
   - **Title** (required)
   - **Description** (optional)
   - **Priority**: Low, Medium, High, Critical
   - **Status**: Pending, In Progress, Completed, Cancelled
   - **Due Date**: Select date and time
   - **Tags**: Add or select existing tags
   - **Time Estimate**: Estimated minutes to complete
3. Click "**Create Task**"

### Setting Reminders

1. Open a task or go to Reminders page
2. Click "**+ Add Reminder**"
3. Configure reminder:
   - **Title** and **Description**
   - **Date and Time**: dd/MM/yyyy format, 24-hour time
   - **Repeat Interval**:
     - **None**: One-time reminder
     - **After X units**: Reminder triggers once after delay
     - **Every X units**: Repeating reminder
   - **Units**: seconds, minutes, hours, days, weeks, months, years
4. Click "**Create Reminder**"

### Managing Tags

1. Go to **Settings** > **Tags**
2. Create new tags with name and color
3. Edit or delete existing tags
4. Tags are automatically updated on all associated tasks

### Customizing Settings

1. Open **Settings** page
2. Configure:
   - **Theme**: Light or Dark (default: Dark)
   - **Notification Sound**: Enable/disable audio alerts (alarm.wav)
   - **Show Completed Tasks**: Toggle visibility
   - **Default Priority**: Set default for new tasks

## 🔧 Development

### Running Tests

```bash
# Frontend tests with Vitest
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage

# Backend tests with Cargo
cd src-tauri
cargo test

# With output
cargo test -- --nocapture
```

### Code Quality

```bash
# Lint TypeScript
yarn lint

# Format code
yarn format

# Type checking
yarn type-check

# Rust formatting
cd src-tauri
cargo fmt

# Rust linting
cargo clippy
```

### Database

Database file location:
- **Windows**: `C:\Users\{username}\AppData\Roaming\com.task-reminder.app\task_reminder.db`
- **macOS**: `~/Library/Application Support/com.task-reminder.app/task_reminder.db`
- **Linux**: `~/.local/share/com.task-reminder.app/task_reminder.db`

### CI/CD

The project uses GitHub Actions for:
- **CI Pipeline**: Frontend/backend tests, code quality checks, SonarQube analysis
- **Release Pipeline**: Multi-platform builds (Linux, Windows, macOS Intel & ARM)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code of Conduct
- Development setup
- Coding standards
- Commit guidelines
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop application framework
- [React](https://react.dev/) - UI library
- [Rust](https://www.rust-lang.org/) - Systems programming language
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide](https://lucide.dev/) - Icon library

## 📞 Support

- 📧 Email: support@volcanion.vn
- 🐛 Issues: [GitHub Issues](https://github.com/volcanion-company/task-reminder/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/volcanion-company/task-reminder/discussions)

## 🗺️ Roadmap

### Version 1.1
- [ ] Subtasks support
- [ ] Task dependencies
- [ ] Recurring tasks
- [ ] Export/import data (JSON, CSV)
- [ ] Keyboard shortcuts customization

### Version 1.2
- [ ] Cloud sync (optional)
- [ ] Mobile companion app
- [ ] Collaboration features
- [ ] Advanced analytics
- [ ] Plugin system

---

**Built with ❤️ by the Volcanion Team**

## 🎯 Key Features Explained

### Custom Repeat Intervals

The reminder system supports highly flexible repeat intervals:

**Format**: `{type}_{value}_{unit}`

**Examples**:
- `none` - No repeat (one-time reminder)
- `after_5_minutes` - Trigger once after 5 minutes
- `after_1_hour` - Trigger once after 1 hour
- `every_10_seconds` - Repeat every 10 seconds
- `every_1_day` - Daily reminder
- `every_2_weeks` - Bi-weekly reminder
- `every_1_month` - Monthly reminder (every 30 days)
- `every_1_year` - Yearly reminder (every 365 days)

**UI**: Three-input system with dropdowns and number input (1-9999)

### Background Notification Service

The app includes a sophisticated notification system:

1. **Polling**: Checks for due reminders every 30 seconds
2. **Triggering**: When a reminder is due:
   - Emits event to frontend
   - Shows system notification (native OS)
   - Displays in-app toast notification
   - Plays audio beep (Web Audio API)
   - Updates `last_triggered_at` timestamp
3. **Repeat Logic**:
   - Non-repeating: Reminder is deactivated after trigger
   - Repeating: `last_triggered_at` updated, reminder stays active
4. **Multi-Threading**: Background service runs in separate thread (Rust)

### Date and Time Formatting

- **Date Input**: dd/MM/yyyy (e.g., 04/02/2026)
- **Time Input**: HH:mm 24-hour format (e.g., 14:30)
- **Auto-Formatting**: Slash and colon automatically inserted while typing
- **Validation**: Real-time validation with error messages
- **ISO Conversion**: Internally converts to ISO 8601 for storage

### Task Status Workflow

```
Pending ──────> In Progress ──────> Completed
   │                                     ▲
   │                                     │
   └────────────────> Cancelled ─────────┘
```

- **Pending**: Task created, not started
- **In Progress**: Currently working on task
- **Completed**: Task finished successfully
- **Cancelled**: Task abandoned or no longer relevant

### Tag System

- **Color Coding**: Visual identification with hex colors
- **Multi-Tag**: Tasks can have multiple tags
- **Filtering**: Filter task list by one or more tags
- **Many-to-Many**: Junction table for efficient queries
- **Cascading**: Deleting a tag updates all associated tasks

## 🔧 Development

### Project Commands

```bash
# Frontend development
npm run dev              # Start Vite dev server only
npm run build            # Build frontend for production
npm run type-check       # TypeScript type checking
npm run lint             # ESLint code linting
npm run format           # Prettier code formatting

# Tauri development
npm run tauri dev        # Run app in development mode
npm run tauri build      # Build app for production
npm run tauri info       # Show Tauri environment info

# Backend (in src-tauri/)
cargo test               # Run Rust tests
cargo clippy             # Rust linter
cargo fmt                # Format Rust code
cargo build              # Build Rust backend only
cargo build --release    # Production build
```

### Hot Reload

- **Frontend**: Vite provides instant hot-reload for React components
- **Backend**: Rust code recompiles automatically when files change
- **Database**: Schema changes require restart and migration

### Debugging

#### Frontend
- **Browser DevTools**: Press `F12` to open
- **React DevTools**: Install browser extension for component inspection
- **Console Logging**: Use `console.log`, `console.error` for debugging
- **Zustand DevTools**: Enable in store configuration

#### Backend
- **Rust Logging**: Set `RUST_LOG=debug` environment variable
- **Print Debugging**: Use `println!` or `dbg!` macros
- **VS Code Debugger**: Configure with CodeLLDB extension
- **Database Inspection**: Use SQLite browser or command-line tool

### Testing

```bash
# Frontend tests (when implemented)
npm test
npm run test:watch
npm run test:coverage

# Backend tests
cd src-tauri
cargo test
cargo test --test integration_tests
cargo test -- --nocapture  # Show println! output
```

## 📂 Database Schema

### Core Tables

#### Tasks
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_date TEXT,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

#### Reminders
```sql
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    remind_at TEXT NOT NULL,
    repeat_interval TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

#### Tags
```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

#### Task_Tags (Junction)
```sql
CREATE TABLE task_tags (
    task_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### Settings
```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Coding standards
- Commit guidelines
- Pull request process
- Testing requirements

### Quick Start for Contributors

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/task-reminder.git`
3. Create a branch: `git checkout -b feature/amazing-feature`
4. Make changes and commit: `git commit -m "feat: add amazing feature"`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tauri Team** - For the amazing desktop framework
- **React Team** - For the powerful UI library
- **Rust Community** - For the systems programming language
- **SQLite Team** - For the reliable embedded database
- **Contributors** - Everyone who has contributed to this project

## 📞 Support

- **Documentation**: See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- **Issues**: [GitHub Issues](https://github.com/OWNER/task-reminder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OWNER/task-reminder/discussions)
- **Email**: support@taskreminder.app (if applicable)

## 🗺️ Roadmap

### Version 1.0 (Current)
- ✅ Task CRUD operations
- ✅ Custom repeat reminders
- ✅ Multi-channel notifications
- ✅ Tag system
- ✅ Background service
- ✅ Settings management

### Version 1.1 (Planned)
- [ ] Task subtasks and dependencies
- [ ] Bulk operations (multi-select)
- [ ] Export/Import (JSON, CSV)
- [ ] Task templates
- [ ] Enhanced search (filters, operators)

### Version 2.0 (Future)
- [ ] Cloud sync (optional, encrypted)
- [ ] Mobile companion app
- [ ] Pomodoro timer integration
- [ ] Task statistics and insights
- [ ] Collaboration features
- [ ] Plugin system

## 🐛 Known Issues

- Notification sound may require user interaction on first launch (browser security)
- Some Linux distributions may need additional WebKit dependencies
- System notifications require user permission on macOS

See [GitHub Issues](https://github.com/OWNER/task-reminder/issues) for full list.

---

**Made with ❤️ using Tauri, React, TypeScript, and Rust**

**Star ⭐ this repository if you find it useful!**

- Launch the desktop app
- Enable hot-reload for frontend changes
- **Auto-seed the database** with sample tasks (development only)

### 4. Build for Production

```bash
npm run tauri build
```

The compiled application will be in `src-tauri/target/release/`.

## 📦 Project Scripts

```bash
# Frontend Development
npm run dev          # Start Vite dev server only
npm run build        # Build frontend for production
npm run preview      # Preview production build

# Tauri Commands
npm run tauri dev    # Run app in development mode
npm run tauri build  # Build production app
npm run tauri info   # Show system info

# Code Quality
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## 🗄️ Database

The app uses **SQLite** for local data storage:

- **Location**: `~/.local/share/task-reminder/tasks.db` (Linux/macOS) or `%APPDATA%\task-reminder\tasks.db` (Windows)
- **Schema**: Automatically created on first launch
- **Migrations**: Located in `src-tauri/src/db/schema.sql`
- **Seed Data**: Sample tasks auto-load in development mode

### Database Schema

```sql
-- Tasks table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    due_date TEXT,
    notes TEXT,
    estimated_minutes INTEGER,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Reminders table
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    reminder_time TEXT NOT NULL,
    message TEXT,
    is_sent INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

## 🛠️ Development Guide

### Adding New Features

1. **Domain Layer** - Define entities and types in `src/domain/`
2. **Backend Service** - Implement business logic in `src-tauri/src/services/`
3. **API Binding** - Create Tauri commands and TypeScript API in `src/infrastructure/api/`
4. **State Management** - Update Zustand store in `src/app/store/`
5. **UI Components** - Build React components in `src/presentation/`

### Logging

The app includes a comprehensive logging system:

```typescript
import { logger, log } from '@shared/utils/logger';

// Basic logging
logger.info('User created a task', { taskId: '123' });
logger.error('Failed to save', error);
logger.debug('State updated', newState);

// Specialized loggers
log.api.request('POST', '/tasks', data);
log.store.action('CREATE_TASK', task);
log.ui.mount('TaskList');
```

**Log Levels**:
- **Development**: All logs (debug, info, warn, error)
- **Production**: Only warnings and errors

### Error Handling

Use the error utilities for consistent, user-friendly messages:

```typescript
import { toast } from '@app/store/toastStore';

try {
  await createTask(data);
  toast.success('Task created successfully');
} catch (error) {
  // Automatically converts technical errors to user-friendly messages
  toast.fromError(error);
}
```

## 🧪 Testing

### Backend Tests

```bash
cd src-tauri
cargo test
```

### Frontend Tests

```bash
npm test
```

## 📝 Code Style

The project uses:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Conventional Commits** for commit messages

Run before committing:
```bash
npm run type-check
npm run lint
npm run format
```

## 🐛 Troubleshooting

### Issue: "Failed to initialize database"

**Solution**: Delete the database file and restart the app:
- Windows: `%APPDATA%\task-reminder\tasks.db`
- macOS: `~/Library/Application Support/task-reminder/tasks.db`
- Linux: `~/.local/share/task-reminder/tasks.db`

### Issue: "Tauri command not found"

**Solution**: Make sure the command is registered in `src-tauri/src/main.rs`:
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        your_command_here
    ])
```

### Issue: Build fails on Windows

**Solutions**:
1. Install Visual Studio Build Tools
2. Run as Administrator
3. Clear build cache: `cd src-tauri && cargo clean`

### Issue: Hot reload not working

**Solutions**:
1. Check firewall settings
2. Restart dev server: `Ctrl+C` then `npm run tauri dev`
3. Clear browser cache if using webview

### Issue: Notifications not showing

**Permissions**:
- **Windows**: Check Settings → System → Notifications
- **macOS**: Check System Preferences → Notifications
- **Linux**: Install `libnotify` and enable notifications

## 📚 Additional Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - [GitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Note**: This is a desktop application and does not require a server or cloud service to function.
