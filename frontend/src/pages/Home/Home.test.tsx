import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Home } from './Home';

describe('Home', () => {
  it('renderiza a página inicial corretamente', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', {
        name: /dados que impulsionam o turismo em santa rita do sapucaí/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /informação, análise e transparência para o desenvolvimento sustentável do nosso destino/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /acesse rapidamente/i,
      })
    ).toBeInTheDocument();
  });

  it('exibe os principais indicadores e publicações', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('Visitantes')).toBeInTheDocument();
    expect(screen.getByText('24,8 mil')).toBeInTheDocument();

    expect(screen.getByText('Ocupação hoteleira')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();

    expect(screen.getByText('Receita turística')).toBeInTheDocument();
    expect(screen.getByText('R$ 4,2 mi')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /publicações recentes/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/inventário da oferta turística/i)
    ).toBeInTheDocument();
  });
});