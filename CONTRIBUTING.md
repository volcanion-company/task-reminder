# Contributing to Task Reminder

Thank you for your interest in contributing to Task Reminder! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Debugging](#debugging)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept criticism gracefully
- Prioritize the community's best interests

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or insults
- Publishing others' private information
- Trolling or inflammatory comments
- Other unprofessional conduct

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** v20+ and Yarn v1.22+
- **Rust** (latest stable via [rustup](https://rustup.rs/))
- **Git** for version control

Platform-specific requirements:
- **Windows**: Visual Studio C++ Build Tools, WebView2
- **macOS**: Xcode Command Line Tools
- **Linux**: webkit2gtk-4.1-dev, build-essential, and other dependencies (see README)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/task-reminder.git
   cd task-reminder
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/volcanion-company/task-reminder.git
   ```

## Development Setup

### Install Dependencies

```bash
# Install frontend dependencies with Yarn
yarn install

# Rust dependencies are managed by Cargo
cd src-tauri
cargo fetch
```

### Run Development Server

```bash
# From project root
yarn tauri dev
```

This command:
- Starts Vite dev server on `http://localhost:5173`
- Compiles Rust backend in debug mode
- Opens the application window
- Enables hot-reload for frontend changes
- Rebuilds backend on Rust file changes

### Database Seeding

In development mode, the app automatically seeds sample data on first run. Check console for:
```
🔧 Development mode detected
🌱 Seeding database with sample data...
✓ Created task: Example Task
```

Create `.env` file in project root (optional):
```env
VITE_API_URL=http://localhost:5173
RUST_LOG=debug
```

## Project Structure

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
├── repositories/    # Data access layer
├── models/          # Data structures and DTOs
├── notification/    # Background notification service
├── db/             # Database, migrations, seeding
└── error.rs        # Error types
```

## Coding Standards

### TypeScript/React Guidelines

#### File Naming
- Components: `PascalCase.tsx` (e.g., `TaskCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useTaskManager.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `PascalCase.ts` (e.g., `Task.ts`)

#### Component Structure
```typescript
// 1. Imports
import { useState } from 'react';
import type { Task } from '@domain/entities/Task';

// 2. Types/Interfaces
interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

// 3. Component
export function TaskCard({ task, onUpdate }: TaskCardProps) {
  // Hooks
  const [isEditing, setIsEditing] = useState(false);
  
  // Event handlers
  const handleEdit = () => setIsEditing(true);
  
  // Render
  return (
    <div className="task-card">
      {/* JSX */}
    </div>
  );
}
```

#### State Management
- Use Zustand for global state
- Use React hooks (useState, useReducer) for local state
- Avoid prop drilling - lift state appropriately
- Keep stores focused on specific domains

```typescript
// Zustand store pattern
interface TaskStore {
  // State
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (dto: CreateTaskDto) => Promise<Task>;
  
  // Selectors (if needed)
  getTaskById: (id: string) => Task | undefined;
}
```

#### CSS/Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use semantic color tokens (primary, secondary, accent)
- Avoid inline styles unless dynamic

```tsx
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
  Click me
</button>
```

### Rust Guidelines

#### File Organization
- One main struct/enum per file
- Related DTOs in same file as model
- Use `mod.rs` for module exports

#### Naming Conventions
- Structs/Enums: `PascalCase`
- Functions/methods: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`
- Modules: `snake_case`

#### Error Handling
```rust
// Use Result type for fallible operations
pub fn find_by_id(&self, id: &str) -> Result<Option<Task>> {
    // Implementation
}

// Use thiserror for custom errors
#[derive(Debug, thiserror::Error)]
pub enum DatabaseError {
    #[error("Task not found: {0}")]
    NotFound(String),
    
    #[error("Database error: {0}")]
    SqliteError(#[from] rusqlite::Error),
}
```

#### Database Operations
```rust
// Use prepared statements and parameter binding
let mut stmt = conn.prepare(
    "SELECT id, title FROM tasks WHERE status = ?1"
)?;

let tasks = stmt.query_map([status], |row| {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
    })
})?;
```

#### Async/Await
```rust
// Use async for Tauri commands
#[tauri::command]
pub async fn get_tasks(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Task>, String> {
    // Implementation
}
```

## Commit Guidelines

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Add or modify tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD configuration changes

#### Examples
```
feat(tasks): add drag-and-drop reordering

Implement drag-and-drop functionality for task list
using react-beautiful-dnd library.

Closes #123
```

```
fix(reminders): correct repeat interval calculation

Fixed bug where monthly intervals were calculated
incorrectly (used 30 days instead of actual month length).

Fixes #456
```

```
docs(architecture): update database schema documentation

- Added reminder table details
- Documented custom repeat interval format
- Updated ERD diagram
```

### Branch Naming

- Feature: `feature/task-drag-drop`
- Bug fix: `fix/reminder-calculation`
- Documentation: `docs/update-readme`
- Refactor: `refactor/task-repository`

## Pull Request Process

### Before Submitting

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**
   ```bash
   # Frontend
   yarn type-check
   yarn lint
   yarn test --run
   
   # Backend
   cd src-tauri
   cargo test
   cargo clippy
   cargo fmt --check
   ```

3. **Test manually**
   - Run the app in dev mode
   - Test your changes thoroughly
   - Check for console errors
   - Test on your target platform

4. **Update documentation**
   - Update README if adding features
   - Update ARCHITECTURE.md if changing structure
   - Add inline comments for complex logic

### Creating Pull Request

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature
   ```

2. **Open PR on GitHub**
   - Use descriptive title
   - Fill out PR template
   - Link related issues
   - Add screenshots/videos if UI changes

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Tested on Windows
   - [ ] Tested on macOS
   - [ ] Tested on Linux
   - [ ] Added unit tests
   - [ ] Manual testing completed
   
   ## Screenshots
   (if applicable)
   
   ## Related Issues
   Closes #123
   ```

### Code Review

- Respond to feedback promptly
- Make requested changes in new commits
- Squash commits before merge (if requested)
- Be open to suggestions and learning

## Testing

### Frontend Testing

```bash
# Type checking
yarn type-check

# Linting
yarn lint

# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

### Backend Testing

```bash
cd src-tauri

# Run all tests
cargo test

# Run specific test
cargo test test_task_creation

# Run with output
cargo test -- --nocapture

# Check for common mistakes
cargo clippy

# Format code
cargo fmt
```

### Writing Tests

#### Rust Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_task_validation() {
        let task = Task {
            id: "test".to_string(),
            title: "Test Task".to_string(),
            status: TaskStatus::Pending,
            // ...
        };
        
        assert!(task.validate().is_ok());
    }
}
```

#### TypeScript Tests (example)
```typescript
describe('TaskCard', () => {
  it('renders task title', () => {
    const task = createMockTask();
    render(<TaskCard task={task} />);
    expect(screen.getByText(task.title)).toBeInTheDocument();
  });
});
```

## Debugging

### Frontend Debugging

#### Browser DevTools
- Open DevTools: `F12` or `Ctrl+Shift+I`
- React DevTools: Install browser extension
- Network tab: Monitor Tauri invoke calls

#### Console Logging
```typescript
console.log('Task created:', task);
console.error('Error creating task:', error);
```

#### Zustand DevTools
```typescript
import { devtools } from 'zustand/middleware';

export const useTaskStore = create<TaskStore>()(
  devtools(
    (set, get) => ({
      // Store implementation
    }),
    { name: 'TaskStore' }
  )
);
```

### Backend Debugging

#### Rust Logging
```rust
// Add to main.rs
env_logger::init();

// In code
use log::{debug, info, warn, error};

info!("Starting notification service");
debug!("Found {} due reminders", reminders.len());
error!("Database error: {}", err);
```

#### Run with Logs
```bash
RUST_LOG=debug npm run tauri dev
```

#### Print Debugging
```rust
println!("Task ID: {:?}", task.id);
dbg!(&task); // Pretty-print debug output
```

#### VS Code Debugging
Add to `.vscode/launch.json`:
```json
{
  "type": "lldb",
  "request": "launch",
  "name": "Tauri Debug",
  "cargo": {
    "args": ["build", "--manifest-path=./src-tauri/Cargo.toml"]
  }
}
```

### Common Issues

#### Build Errors

**WebView2 missing (Windows)**
```bash
# Download and install WebView2 Runtime
# https://developer.microsoft.com/microsoft-edge/webview2/
```

**SQLite errors**
```bash
# Rebuild with bundled SQLite
cd src-tauri
cargo clean
cargo build
```

**Type errors**
```bash
# Regenerate TypeScript bindings
npm run tauri dev
```

#### Runtime Errors

**Database locked**
- Close other instances of the app
- Check for zombie processes

**Notification not showing**
- Check notification permissions
- Verify NotificationService started
- Check console for errors

**State not updating**
- Verify Zustand store actions are called
- Check React DevTools for state changes
- Ensure component is subscribed to correct store slice

## Development Workflow

### Typical Workflow

1. **Pick an issue** from GitHub Issues
2. **Create branch** from `main`
3. **Implement changes** with tests
4. **Test thoroughly** on your platform
5. **Commit** with conventional commit message
6. **Push** to your fork
7. **Open PR** with description
8. **Address review** feedback
9. **Squash and merge** when approved

### Communication

- **Issues**: Report bugs, request features
- **Discussions**: Ask questions, share ideas
- **Discord/Slack**: Real-time chat (if available)
- **Email**: For private concerns

## CI/CD Pipeline

### Continuous Integration

The project uses GitHub Actions for automated testing and quality checks. Every push and pull request triggers:

1. **Frontend Tests**: Runs on Node.js 18.x and 20.x
   - Linting and type checking
   - Unit and integration tests
   - Code coverage reporting
   - Build verification

2. **Backend Tests**: Runs on Ubuntu, Windows, and macOS
   - Rust formatting check (`cargo fmt`)
   - Clippy linting
   - Unit and integration tests
   - Build verification

3. **Security Audit**: 
   - npm audit for frontend dependencies
   - cargo audit for Rust dependencies

4. **Code Quality**:
   - Linting checks
   - TODO/FIXME scanning

### Running CI Checks Locally

Before pushing, run these commands to match CI checks:

```bash
# Frontend
npm run lint
npm run type-check
npm test -- --run --coverage
npm run build

# Backend
cd src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
```

### Continuous Deployment

Releases are automated when you push a version tag:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This triggers:
- Multi-platform builds (Windows, macOS, Linux)
- Installer generation
- GitHub release creation
- Asset uploads

See [.github/CI_CD.md](.github/CI_CD.md) for detailed CI/CD documentation.

### Dependabot

The project uses Dependabot for automated dependency updates:
- Weekly checks for npm, Cargo, and GitHub Actions updates
- Automatic PRs for security patches
- Review and merge Dependabot PRs regularly

## Resources

### Documentation
- [Tauri Documentation](https://tauri.app/v2/guides/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [CI/CD Guide](.github/CI_CD.md)

### Tools
- [VS Code](https://code.visualstudio.com/) with Rust Analyzer extension
- [GitHub Desktop](https://desktop.github.com/) for Git GUI
- [Postman](https://www.postman.com/) for API testing (if applicable)

## Questions?

- Check [existing issues](https://github.com/volcanion-company/task-reminder/issues)
- Read [documentation](README.md)
- Ask in [GitHub Discussions](https://github.com/volcanion-company/task-reminder/discussions)
- Email: support@volcanion.vn

---

Thank you for contributing to Task Reminder! 🎉
- Ask in [discussions](https://github.com/OWNER/task-reminder/discussions)

Thank you for contributing to Task Reminder! 🎉
