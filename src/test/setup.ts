import '@testing-library/jest-dom';
import {beforeEach} from 'vitest';

// Clear sessionStorage before each test to avoid state leakage
beforeEach(() => {
    sessionStorage.clear();
});

