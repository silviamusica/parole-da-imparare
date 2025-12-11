import { render, screen } from '@testing-library/react';
import App from './App';

// Smoke test: verifica che il titolo principale sia renderizzato
describe('App', () => {
  test('mostra il titolo Giochi di parole', () => {
    render(<App />);
    expect(screen.getByText(/Giochi di parole/i)).toBeInTheDocument();
  });
});
