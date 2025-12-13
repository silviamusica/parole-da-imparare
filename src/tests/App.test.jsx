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
      expect(screen.getByText(/Giochi di Parole/i)).toBeInTheDocument();
    });

    it('dovrebbe mostrare il pulsante per caricare CSV', () => {
      render(<App />);
      expect(screen.getByText(/Carica il tuo CSV/i)).toBeInTheDocument();
    });

    it('dovrebbe mostrare il pulsante istruzioni', () => {
      render(<App />);
      const instructionsButton = screen.getByLabelText(/Mostra istruzioni/i);
      expect(instructionsButton).toBeInTheDocument();
    });
  });

  describe('2. Modale Istruzioni', () => {
    it('dovrebbe aprire e chiudere le istruzioni', async () => {
      render(<App />);

      // Apri istruzioni
      const instructionsButton = screen.getByLabelText(/Mostra istruzioni/i);
      fireEvent.click(instructionsButton);

      await waitFor(() => {
        expect(screen.getByText(/Benvenuto!/i)).toBeInTheDocument();
      });

      // Chiudi istruzioni
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Benvenuto!/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('3. Upload CSV', () => {
    it('dovrebbe accettare file CSV', async () => {
      render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.queryByText(/Carica il tuo CSV/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('4. Filtri', () => {
    it('dovrebbe aprire il pannello filtri', async () => {
      render(<App />);

      // Carica CSV prima
      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Imposta i filtri/i)).toBeInTheDocument();
      });

      // Clicca su imposta filtri
      const filterButton = screen.getByText(/Imposta i filtri/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('dovrebbe avere il pulsante Reset nei filtri', async () => {
      render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const filterButton = screen.getByText(/Imposta i filtri/i);
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeInTheDocument();
      });
    });
  });

  describe('5. Export e Copia', () => {
    it('dovrebbe mostrare i flag di export', async () => {
      render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const resultsButton = screen.getByText('Risultati');
        fireEvent.click(resultsButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Cosa includere nell'export TXT/i)).toBeInTheDocument();
      });
    });

    it('dovrebbe avere checkbox per Ripasso, Preferite, Risposte corrette, Apprese, Frasi personali', async () => {
      render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const resultsButton = screen.getByText('Risultati');
        fireEvent.click(resultsButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Ripasso')).toBeInTheDocument();
        expect(screen.getByText('Preferite')).toBeInTheDocument();
        expect(screen.getByText('Risposte corrette')).toBeInTheDocument();
        expect(screen.getByText('Apprese')).toBeInTheDocument();
        expect(screen.getByText('Frasi personali')).toBeInTheDocument();
      });
    });
  });

  describe('6. Modalità Studio', () => {
    it('dovrebbe permettere di accedere a Studio → Vista Schede', async () => {
      render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const studioButton = screen.getByText('Studio');
        fireEvent.click(studioButton);
      });

      await waitFor(() => {
        const vistaSchedeButton = screen.getByText('Vista Schede');
        fireEvent.click(vistaSchedeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
      });
    });

    it('dovrebbe permettere di accedere a Frasi personali', async () => {
      render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);
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
      render(<App />);

      const csvContent = `Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali
14-10-25,test,tèst,Una prova,prova,,,esempio 1,,,alta,NO,NO,NO,NO,`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText(/Carica il tuo CSV/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const foxImages = screen.getAllByAltText(/volpe/i);
        expect(foxImages.length).toBeGreaterThan(0);
      });
    });
  });
});
