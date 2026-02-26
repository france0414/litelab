import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TablePreview from './TablePreview.jsx';

describe('TablePreview', () => {
  it('renders provided HTML', () => {
    render(<TablePreview html="<table><tbody><tr><td>Hi</td></tr></tbody></table>" />);

    expect(screen.getByText('Hi')).toBeInTheDocument();
  });
});
