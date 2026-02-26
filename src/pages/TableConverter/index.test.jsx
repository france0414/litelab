import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TableConverter from './index.jsx';

describe('TableConverter page', () => {
  it('renders the upload section', () => {
    render(
      <MemoryRouter>
        <TableConverter />
      </MemoryRouter>,
    );

    expect(screen.getByText('上傳你的表格')).toBeInTheDocument();
  });
});
