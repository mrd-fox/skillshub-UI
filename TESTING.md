# Testing Guide

## Setup

This project uses Vitest and React Testing Library for unit and integration testing.

### Dependencies

- **vitest**: Fast unit test framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom jest matchers for DOM
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM implementation for Node.js
- **@vitest/coverage-v8**: Code coverage provider

## Scripts

- `npm run test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Writing Tests

### Example Test File

Create test files with `.test.ts` or `.test.tsx` extension:

```typescript
import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
    it('should render correctly', () => {
        render(<MyComponent / >);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should handle user interaction', async () => {
        const user = userEvent.setup();
        render(<MyComponent / >);

        const button = screen.getByRole('button');
        await user.click(button);

        expect(screen.getByText('Clicked')).toBeInTheDocument();
    });
});
```

### Mocking API Calls

```typescript
import {vi} from 'vitest';
import api from '@/api/axios';

vi.mock('@/api/axios');

describe('API Tests', () => {
    it('should fetch data', async () => {
        const mockData = {id: 1, name: 'Test'};
        vi.mocked(api.get).mockResolvedValue({data: mockData});

        // Your test logic here
    });
});
```

## Configuration

- **vitest.config.ts**: Main configuration file
- **src/test/setup.ts**: Test setup file (imports jest-dom matchers)

## Coverage

Coverage reports are generated in the `coverage/` directory after running `npm run test:coverage`.

The configuration excludes:

- node_modules/
- src/test/
- Type definition files (*.d.ts)
- Config files
- Mock data
- Distribution folder
