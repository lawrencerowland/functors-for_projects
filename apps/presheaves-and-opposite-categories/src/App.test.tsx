import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('renders heading', () => {
  render(<App />);
  const heading = screen.getByText(/Presheaf Visualization/i);
  expect(heading).toBeDefined();
});
