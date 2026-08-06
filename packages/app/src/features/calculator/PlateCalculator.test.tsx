import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlateCalculator } from './PlateCalculator';

describe('PlateCalculator', () => {
  afterEach(cleanup);

  it('renders an exact, mirrored, text-described calibrated load', () => {
    const { container } = render(<PlateCalculator />);

    fireEvent.click(screen.getByRole('button', { name: 'Calibrated' }));
    fireEvent.change(screen.getByLabelText('Target weight (lb)'), { target: { value: '165' } });
    fireEvent.change(screen.getByLabelText('Bar weight (lb)'), { target: { value: '55' } });

    expect(screen.getByText('165 lb')).toBeTruthy();
    expect(screen.getByText('1 × 55 lb red calibrated plate')).toBeTruthy();
    expect(container.querySelectorAll('[data-weight="55"]')).toHaveLength(2);
  });

  it('switches inventories and gives clear validation', () => {
    render(<PlateCalculator />);

    expect(screen.getByRole('button', { name: 'Standard iron' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    fireEvent.change(screen.getByLabelText('Target weight (lb)'), { target: { value: '44' } });

    expect(
      within(screen.getByRole('status')).getByText(
        'Target weight must be at least the 45 lb bar weight.'
      )
    ).toBeTruthy();
  });

  it('accepts a kilogram target and reports the achievable load in both units', () => {
    render(<PlateCalculator />);

    fireEvent.click(screen.getByRole('button', { name: 'Calibrated' }));
    fireEvent.click(screen.getByRole('button', { name: 'kg' }));
    fireEvent.change(screen.getByLabelText('Target weight (kg)'), { target: { value: '200' } });

    expect(screen.getByText('199.6 kg')).toBeTruthy();
    expect(screen.getByText('440 lb')).toBeTruthy();
    expect(screen.getByText('−0.4 kg')).toBeTruthy();
  });
});
