# Contributing to Unsloth MCP Server

Thank you for your interest in contributing to the Unsloth MCP Server! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- Python 3.10-3.12
- Git
- CUDA-capable GPU (for testing fine-tuning features)

### Setting Up Development Environment

1. **Fork and Clone**

```bash
git fork https://github.com/ScientiaCapital/unsloth-mcp-server
git clone https://github.com/YOUR_USERNAME/unsloth-mcp-server
cd unsloth-mcp-server
```

2. **Install Dependencies**

```bash
# Node.js dependencies
npm install

# Python dependencies (for testing)
pip install unsloth
```

3. **Build the Project**

```bash
npm run build
```

4. **Run Tests**

```bash
npm test
```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation changes

### Creating a Feature

1. **Create a Branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**

Edit code, add tests, update documentation

3. **Test Your Changes**

```bash
npm run lint
npm test
npm run build
```

4. **Commit Changes**

```bash
git add .
git commit -m "feat: add new feature description"
```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

**Examples:**
```
feat(cache): add TTL-based cache expiration
fix(validation): handle empty model names correctly
docs(readme): update installation instructions
test(progress): add progress tracker tests
```

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit types when not obvious
- Add JSDoc comments for public APIs
- Follow existing code patterns

### Formatting

We use Prettier and ESLint:

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Organization

```
src/
├── index.ts           # Main MCP server
├── cli.ts             # CLI tool
├── utils/            # Utility modules
│   ├── logger.ts
│   ├── validation.ts
│   ├── security.ts
│   ├── metrics.ts
│   ├── config.ts
│   ├── cache.ts
│   └── progress.ts
└── __tests__/        # Test files
    ├── validation.test.ts
    ├── security.test.ts
    └── metrics.test.ts
```

## Testing

### Writing Tests

- Place tests in `src/__tests__/`
- Name test files as `*.test.ts`
- Use Jest for testing
- Aim for >80% code coverage

### Test Structure

```typescript
import { describe, it, expect } from '@jest/globals';
import { yourFunction } from '../utils/yourModule.js';

describe('YourModule', () => {
  describe('yourFunction', () => {
    it('should do something expected', () => {
      const result = yourFunction('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      expect(() => yourFunction(null)).toThrow();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/__tests__/validation.test.ts
```

## Submitting Changes

### Pull Request Process

1. **Update Documentation**

- Update README.md if needed
- Add/update JSDoc comments
- Update CHANGELOG.md

2. **Ensure Tests Pass**

```bash
npm run lint
npm test
npm run build
```

3. **Push Changes**

```bash
git push origin feature/your-feature-name
```

4. **Create Pull Request**

- Go to GitHub and create a PR
- Fill out the PR template
- Link related issues
- Request reviews

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No merge conflicts
- [ ] Commits follow conventional format

### Review Process

- Maintainers will review your PR
- Address feedback promptly
- Keep PRs focused and small
- Be patient and respectful

## Reporting Issues

### Bug Reports

Include:

1. **Description** - What's the bug?
2. **Steps to Reproduce** - How to trigger it?
3. **Expected Behavior** - What should happen?
4. **Actual Behavior** - What actually happens?
5. **Environment** - OS, Node version, etc.
6. **Logs** - Error messages and stack traces

### Feature Requests

Include:

1. **Use Case** - What problem does it solve?
2. **Proposed Solution** - How should it work?
3. **Alternatives** - Other ways to solve it?
4. **Additional Context** - Any other details?

## Development Tips

### Running the Server Locally

```bash
# Build first
npm run build

# Run the server
npm start

# Or use dev mode (auto-reload)
npm run dev
```

### Testing CLI Tools

```bash
# Run CLI
npm run cli help

# Or use built version
node build/cli.js check
```

### Debugging

Add debug logs:

```typescript
import logger from './utils/logger.js';

logger.debug('Debug message', { data: someData });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { error: err });
```

### Performance Testing

Use the metrics system:

```typescript
import { metricsCollector } from './utils/metrics.js';

const startTime = Date.now();
// ... your code ...
metricsCollector.endTool('your-tool', startTime, true);

const stats = metricsCollector.getStats('your-tool');
console.log('Performance:', stats);
```

## Project Structure

```
unsloth-mcp-server/
├── src/                  # Source code
│   ├── index.ts         # Main server
│   ├── cli.ts           # CLI tool
│   ├── utils/           # Utilities
│   └── __tests__/       # Tests
├── examples/            # Usage examples
├── build/               # Compiled output
├── logs/                # Log files
├── .cache/              # Cache directory
├── .github/             # GitHub workflows
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── jest.config.js       # Jest config
├── .eslintrc.json       # ESLint config
├── .prettierrc.json     # Prettier config
└── README.md            # Documentation
```

## Questions?

- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: [Project maintainer email if available]

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.

---

Thank you for contributing to Unsloth MCP Server! 🚀
