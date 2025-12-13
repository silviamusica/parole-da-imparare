import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock document.execCommand per clipboard
global.document.execCommand = vi.fn(() => true);

describe('Giochi di Parole - Test Funzionalità Critiche', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('1. Rendering iniziale', () => {
    it('dovrebbe renderizzare il titolo principale', () => {
      render(<App />);
      expect(screen.getByText(/Giochi di parole/i)).toBeInTheDocument();
    });

    it('dovrebbe mostrare il pulsante per caricare CSV', () => {
      render(<App />);
      expect(screen.getByText(/Carica il tuo CSV/i)).toBeInTheDocument();
    });

    it('dovrebbe mostrare il pulsante formato CSV', () => {
      render(<App />);
      const formatButton = screen.getByLabelText(/Formato CSV e istruzioni/i);
      expect(formatButton).toBeInTheDocument();
    });
  });

  describe('2. Modale Formato CSV', () => {
    it('dovrebbe aprire e chiudere il modale formato CSV', async () => {
      render(<App />);

      // Apri modale formato
      const formatButton = screen.getByLabelText(/Formato CSV e istruzioni/i);
      fireEvent.click(formatButton);

      await waitFor(() => {
        expect(screen.getByText(/Come preparare il CSV/i)).toBeInTheDocument();
      });

      // Chiudi modale
      const closeButtons = screen.getAllByText('✕');
      fireEvent.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText(/Come preparare il CSV/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('3. Upload CSV', () => {
    it('dovrebbe accettare file CSV', async () => {
      const { container } = render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.queryByText(/Carica il tuo CSV/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('4. Filtri', () => {
    it('dovrebbe aprire il pannello filtri', async () => {
      const { container } = render(<App />);

      // Carica CSV prima
      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Scegli')).toBeInTheDocument();
      });

      // Clicca su scegli (apre pannello filtri)
      const filterButton = screen.getByText('Scegli');
      fireEvent.click(filterButton);

      await waitFor(() => {
        // Verifica che il pannello filtri sia aperto cercando il titolo
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Imposta i filtri')).toBeInTheDocument();
      });
    });

    it('dovrebbe avere il pulsante Reset nei filtri', async () => {
      const { container } = render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Scegli')).toBeInTheDocument();
      });

      const filterButton = screen.getByText('Scegli');
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeInTheDocument();
      });
    });
  });

  describe('5. Export e Copia', () => {
    it('dovrebbe mostrare i flag di export', async () => {
      const { container } = render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const resultsButton = screen.getByText('Risultati');
        fireEvent.click(resultsButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Cosa includere nell'export TXT/i)).toBeInTheDocument();
      });
    });

    it('dovrebbe avere checkbox per export', async () => {
      const { container } = render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const resultsButton = screen.getByText('Risultati');
        fireEvent.click(resultsButton);
      });

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('6. Modalità Studio', () => {
    it('dovrebbe permettere di accedere a Studio → Elenco', async () => {
      const { container } = render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Studio')).toBeInTheDocument();
      });

      const studioButton = screen.getByText('Studio');
      fireEvent.click(studioButton);

      await waitFor(() => {
        expect(screen.getByText('Elenco')).toBeInTheDocument();
      });

      const elencoButton = screen.getByText('Elenco');
      fireEvent.click(elencoButton);

      await waitFor(() => {
        // Verifica che sia visibile il selettore per lettera nella modalità elenco
        expect(screen.getByText(/Lettera T/i)).toBeInTheDocument();
      });
    });

    it('dovrebbe permettere di accedere a Frasi personali', async () => {
      const { container } = render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const studioButton = screen.getByText('Studio');
        fireEvent.click(studioButton);
      });

      await waitFor(() => {
        const frasiButton = screen.getByText('Frasi personali');
        fireEvent.click(frasiButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Scrivi la tua frase/i)).toBeInTheDocument();
      });
    });
  });

  describe('7. Volpe animata', () => {
    it('dovrebbe renderizzare la volpe', async () => {
      const { container } = render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const foxImages = screen.getAllByAltText(/Logo/i);
        expect(foxImages.length).toBeGreaterThan(0);
      });
    });
  });
});
