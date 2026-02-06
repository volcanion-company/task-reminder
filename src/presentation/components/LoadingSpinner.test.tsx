import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders spinner icon', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('lucide', 'lucide-loader-circle');
  });

  it('applies medium size by default', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.w-8.h-8');
    expect(spinner).toBeInTheDocument();
  });

  it('applies small size when specified', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.w-4.h-4');
    expect(spinner).toBeInTheDocument();
  });

  it('applies large size when specified', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.w-12.h-12');
    expect(spinner).toBeInTheDocument();
  });

  it('has animate-spin class for animation', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has text-primary class for color', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.text-primary');
    expect(spinner).toBeInTheDocument();
  });

  it('does not render message by default', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByText(/./)).not.toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<LoadingSpinner message="Loading tasks..." />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('applies correct message styling', () => {
    render(<LoadingSpinner message="Please wait" />);
    const message = screen.getByText('Please wait');
    expect(message).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('renders with flex column layout', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.querySelector('.flex.flex-col');
    expect(wrapper).toBeInTheDocument();
  });

  it('centers content with flexbox', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.querySelector('.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });

  it('has gap between spinner and message', () => {
    const { container } = render(<LoadingSpinner message="Loading..." />);
    const wrapper = container.querySelector('.gap-3');
    expect(wrapper).toBeInTheDocument();
  });

  it('has padding around content', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.querySelector('.p-8');
    expect(wrapper).toBeInTheDocument();
  });

  it('combines size and message correctly', () => {
    const { container } = render(<LoadingSpinner size="lg" message="Loading data..." />);
    
    const spinner = container.querySelector('.w-12.h-12');
    expect(spinner).toBeInTheDocument();
    
    const message = screen.getByText('Loading data...');
    expect(message).toBeInTheDocument();
  });

  it('renders multiple loading spinners independently', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    const { container: container1 } = render(<LoadingSpinner size="lg" message="Large" />);
    
    expect(container1.querySelector('.w-12.h-12')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    
    rerender(<LoadingSpinner size="md" message="Medium" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });
});
