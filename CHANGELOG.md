# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Subtasks support
- Task dependencies
- Recurring tasks (not just reminders)
- Export/import data (JSON, CSV)
- Cloud sync (optional)
- Plugin system

## [0.1.0] - 2026-02-06

### Added

#### Core Features
- Full task management with CRUD operations
- Task priority system (Low, Medium, High, Critical)
- Task status tracking (Pending, In Progress, Completed, Cancelled)
- Tag-based organization with color coding
- Multi-tag support for tasks
- Advanced filtering by status, priority, tags, and dates
- Full-text search functionality
- Due date tracking with overdue detection
- Time estimation and tracking

#### Reminder System
- Smart reminder system with task linking
- One-time and repeating reminders
- Custom repeat intervals:
  - After X units (e.g., `after_5_minutes`, `after_1_hour`)
  - Every X units (e.g., `every_10_seconds`, `every_2_weeks`)
  - Supports: seconds, minutes, hours, days, weeks, months, years
- Background notification service (30-second polling)
- Auto-reschedule for repeating reminders
- Multi-channel notifications:
  - System notifications (native OS)
  - In-app toast notifications
  - Audio alerts (alarm.wav)
- Date/time formatting: dd/MM/yyyy, 24-hour time (HH:mm)

#### User Interface
- Modern, clean design with Tailwind CSS
- Dark/Light mode toggle (default: Dark)
- Responsive layout for various screen sizes
- Smooth animations and transitions
- Dashboard with task statistics
- Calendar view for task timeline
- Timeline view for task history
- Sidebar navigation
- Settings page

#### Technical Implementation
- **Frontend**:
  - React 18.3 with TypeScript 5.3
  - Vite 5.1 for fast development
  - Zustand 4.5 for state management
  - React Router 6.22 for routing
  - date-fns 3.3 for date handling
  - Lucide React for icons
  - Tailwind CSS 3.4 for styling
- **Backend**:
  - Tauri 2.0 desktop framework
  - Rust 2021 edition
  - rusqlite 0.31 for database
  - tokio for async runtime
  - chrono 0.4 for date/time
  - serde/serde_json for serialization
- **Database**:
  - SQLite embedded database
  - SQL migrations for schema versioning
  - Offline-first architecture
  - Seed data for development
- **Architecture**:
  - Clean Architecture principles
  - Service layer for business logic
  - Repository pattern for data access
  - Command handlers for Tauri IPC
  - Type-safe API contracts

#### Testing & Quality
- Frontend test suite with Vitest:
  - 169 tests across components and stores
  - Integration tests for critical flows
  - Coverage: 53.45%
- Backend test suite with Cargo:
  - Unit tests for services and repositories
  - Test coverage for business logic
- CI/CD Pipeline:
  - Frontend tests on Node 20.x and 22.x
  - Backend tests on Ubuntu, Windows, macOS
  - Code quality checks with linters
  - SonarQube integration for code analysis
  - Automated security audits
- Release Pipeline:
  - Multi-platform builds (Linux, Windows, macOS Intel, macOS ARM)
  - Automated GitHub Releases
  - Signed installers

#### Documentation
- Comprehensive README.md
- Detailed ARCHITECTURE.md
- Contributing guidelines
- Issue templates (bug reports, feature requests)
- Pull request template
- MIT License
- Changelog

### Fixed
- Recurring reminders now properly reschedule after triggering
- Database CHECK constraint removed for custom repeat intervals
- Theme system simplified (removed system mode)
- Fixed seed data status values (`in-progress` → `in_progress`)
- Rust code formatting issues resolved
- Line ending normalization with .gitattributes
- Test compatibility with jsdom@28.0.0 (Node 20+)
- LoadingSpinner test icon class (`lucide-loader2` → `lucide-loader-circle`)

### Changed
- Default theme set to Dark mode
- Package manager: npm → Yarn
- Node version requirement: v18+ → v20+
- Linux WebKit dependency: webkit2gtk-4.0 → webkit2gtk-4.1
- Theme toggle removed from Topbar (moved to Settings)
- Audio notification path: `src/app/alarm.wav` → `public/alarm.wav`
- Coverage reporter added: lcov format for SonarQube

### Infrastructure
- GitHub Actions workflows for CI/CD
- Dependabot for automated dependency updates
- .gitignore expanded for build artifacts
- .gitattributes for cross-platform line endings
- SonarQube configuration (sonar-project.properties)
- Issue templates for standardized reporting
- Comprehensive .gitignore patterns

### Database Schema
- Tasks table with all core fields
- Reminders table with flexible repeat_interval
- Tags table with color support
- Task_tags junction table
- Settings table for user preferences
- SQL migrations support
- Database migration to remove CHECK constraint

### Known Issues
- None

---

For more details, see the full commit history at [GitHub](https://github.com/volcanion-company/task-reminder/commits/master).

### Technical Stack
- **Frontend**: React 18.3 + TypeScript 5.3 + Vite 5.4
- **Backend**: Rust + Tauri 2.0
- **State Management**: Zustand 4.5
- **Styling**: Tailwind CSS 3.4
- **Database**: SQLite with rusqlite 0.31
- **Testing**: Vitest 4.0 + React Testing Library 16.3

### Known Limitations
- No cloud sync (local storage only)
- No mobile application
- No collaborative features
- No data export/import

## Release Notes Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in upcoming releases

### Removed
- Features that were removed

### Fixed
- Bug fixes

### Security
- Security improvements or vulnerability fixes
```

---

## Versioning Guide

- **MAJOR** (X.0.0): Incompatible API changes
- **MINOR** (0.X.0): New functionality in a backwards compatible manner
- **PATCH** (0.0.X): Backwards compatible bug fixes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.
