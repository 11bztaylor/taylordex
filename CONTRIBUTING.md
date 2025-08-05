# Contributing to TaylorDx Docker Dashboard

Thank you for your interest in contributing to TaylorDx! This guide will help you get started with development and contribution.

## 🚀 Quick Start

### Development Environment Setup

1. **Prerequisites**
   ```bash
   # Required
   node >= 18.0.0
   docker >= 20.0.0
   docker-compose >= 2.0.0
   git
   
   # Recommended
   VS Code with extensions:
   - ES7+ React/Redux/React-Native snippets
   - Tailwind CSS IntelliSense
   - Docker
   ```

2. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd docker-dashboard
   
   # Start development environment
   docker-compose up -d
   
   # Or for local development
   cd backend && npm install && npm run dev
   cd frontend && npm install && npm run dev
   ```

3. **Verify Setup**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

## 📁 Project Structure

```
docker-dashboard/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── modules/        # Service integrations
│   │   ├── database/       # Database schemas
│   │   └── utils/          # Shared utilities
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── utils/          # Frontend utilities
│   └── package.json
├── docs/                   # Documentation
├── docker-compose.yml      # Development setup
└── README.md
```

## 🏗️ Architecture Guidelines

### Backend (Node.js/Express)

- **Modular Design**: Each service integration is a separate module
- **Base Service Pattern**: Extend `BaseService` for new integrations
- **Database**: PostgreSQL with connection pooling
- **API Design**: RESTful endpoints with consistent response format

### Frontend (React)

- **Component Structure**: Functional components with hooks
- **Styling**: Tailwind CSS with dark theme
- **State Management**: React Context + useState/useEffect
- **Error Handling**: Error boundaries for robust UX

### Service Integration Pattern

1. Create new module in `backend/src/modules/{service}/`
2. Extend `BaseService` class
3. Implement required methods: `testConnection()`, `getStats()`
4. Add routes and controller
5. Add frontend components in `frontend/src/components/services/`

## 💻 Development Workflow

### Branch Naming
- `feature/service-name` - New service integrations
- `feature/component-name` - New UI components
- `fix/issue-description` - Bug fixes
- `docs/update-description` - Documentation updates

### Commit Messages
Use conventional commit format:
```
type(scope): description

feat(backend): add Jellyfin service integration
fix(frontend): resolve service card loading state
docs(readme): update installation instructions
```

### Pull Request Process

1. **Before Starting**
   - Check existing issues and PRs
   - Create an issue to discuss major changes
   - Fork the repository

2. **Development**
   - Create feature branch from `main`
   - Make atomic commits with clear messages
   - Test your changes thoroughly
   - Update documentation if needed

3. **Pull Request**
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots for UI changes
   - Ensure CI checks pass

4. **Review Process**
   - Address review feedback promptly
   - Keep PR scope focused and manageable
   - Update tests and docs as requested

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm run test          # Run test suite
npm run test:watch    # Watch mode
npm run lint          # ESLint check
```

### Frontend Testing
```bash
cd frontend
npm run test          # Jest/React Testing Library
npm run test:watch    # Watch mode
npm run lint          # ESLint check
```

### Integration Testing
```bash
# Start services and run full integration tests
docker-compose up -d
npm run test:integration
```

## 📝 Code Style

### JavaScript/React
- Use modern ES6+ features
- Prefer functional components with hooks
- Use descriptive variable and function names
- Add JSDoc comments for complex functions

### CSS/Tailwind
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and colors
- Use CSS custom properties for theme values

### General
- Maximum line length: 100 characters
- Use 2 spaces for indentation
- Always use semicolons
- Prefer `const` over `let`, avoid `var`

## 🔧 Adding New Services

### Service Integration Checklist

1. **Backend Integration**
   - [ ] Create service module extending `BaseService`
   - [ ] Implement `testConnection()` method
   - [ ] Implement `getStats()` method
   - [ ] Add routes and controller
   - [ ] Add service to main router
   - [ ] Update database schema if needed

2. **Frontend Integration**
   - [ ] Add service type to `ServiceCard` component
   - [ ] Create service-specific stats display
   - [ ] Add service icon/logo
   - [ ] Update service type options in modals
   - [ ] Add service-specific detail view

3. **Documentation**
   - [ ] Update supported services list
   - [ ] Add configuration guide
   - [ ] Document API endpoints
   - [ ] Add troubleshooting notes

4. **Testing**
   - [ ] Write unit tests for service methods
   - [ ] Test frontend components
   - [ ] Verify integration with real service
   - [ ] Test error handling scenarios

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment**: OS, browser, Docker version
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Logs**: Relevant error messages or logs

## 💡 Feature Requests

For new features, please provide:

- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other approaches considered
- **Implementation**: Technical approach if known

## 📚 Documentation

### Writing Guidelines
- Use clear, concise language
- Include code examples where helpful
- Keep README and docs up to date
- Use consistent formatting and structure

### Required Documentation for PRs
- Update README if adding new features
- Add inline code comments for complex logic
- Update API documentation for backend changes
- Include setup instructions for new dependencies

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers get started
- Assume positive intent

### Getting Help
- Check existing documentation first
- Search issues and discussions
- Ask questions in discussions
- Join community chat if available

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special thanks for major features or fixes

## 📄 License

By contributing to TaylorDx, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to TaylorDx! Your contributions help make homelab management better for everyone. 🚀