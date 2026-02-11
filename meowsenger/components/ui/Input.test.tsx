import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    // Default border when not error
    expect(input).toHaveClass('border-zinc-200');
  });

  it('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(<Input description="Enter your unique username" />);
    expect(screen.getByText('Enter your unique username')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(<Input error="Invalid username" />);
    expect(screen.getByText('Invalid username')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('border-red-500');
    expect(input).toHaveClass('animate-shake');
  });

  it('handles user input', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('Hello');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    const input = screen.getByTestId('input');
    // Note: The component applies className to the input element
    expect(input).toHaveClass('custom-class');
  });

  it('renders endContent', () => {
    render(<Input endContent={<span data-testid="icon">Icon</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('supports disabled state', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  it('renders bordered variant', () => {
    render(<Input variant="bordered" placeholder="Bordered" />);
    const input = screen.getByPlaceholderText('Bordered');
    expect(input).toHaveClass('border-2');
  });

  it('associates aria-describedby with error or description', () => {
      const { rerender } = render(<Input description="Help text" />);
      const input = screen.getByRole('textbox');
      // Should point to description id
      expect(input.getAttribute('aria-describedby')).toMatch(/-desc$/);

      rerender(<Input error="Error text" description="Help text" />);
      // Should point to error id when error is present
      expect(input.getAttribute('aria-describedby')).toMatch(/-error$/);
  });
});
