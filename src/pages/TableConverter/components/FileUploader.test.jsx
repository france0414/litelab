import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileUploader from './FileUploader.jsx';

afterEach(() => {
  cleanup();
});

describe('FileUploader', () => {
  it('renders a labeled file input', () => {
    render(<FileUploader onFileSelect={() => {}} status="idle" />);

    expect(screen.getByLabelText('上傳檔案')).toBeInTheDocument();
  });

  it('calls onFileSelect with chosen file', async () => {
    const onFileSelect = vi.fn();
    const user = userEvent.setup();
    const file = new File(['test'], 'sample.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    render(<FileUploader onFileSelect={onFileSelect} status="idle" />);

    const inputs = screen.getAllByLabelText('上傳檔案');
    const input = inputs[inputs.length - 1];
    await user.upload(input, file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });
});
