import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TestSuiteSidebarDrawer from '../components/testManager/TestSuiteSidebarDrawer';

const DrawerWrapper: React.FC = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div>
            <TestSuiteSidebarDrawer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onToggle={() => setIsOpen(prev => !prev)}
            >
                <div>Suite List</div>
            </TestSuiteSidebarDrawer>
        </div>
    );
};

describe('TestSuiteSidebarDrawer', () => {
    it('renders the toggle collapsed and the drawer hidden by default', () => {
        render(<DrawerWrapper />);

        const toggle = screen.getByTestId('suite-sidebar-toggle');
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(toggle).toHaveAccessibleName('Open test suites');
    });

    it('opens the drawer when the toggle is pressed and closes when pressed again', async () => {
        const user = userEvent.setup();
        render(<DrawerWrapper />);

        const toggle = screen.getByTestId('suite-sidebar-toggle');
        await user.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(toggle).toHaveAccessibleName('Close test suites');
        const drawer = screen.getByTestId('suite-sidebar-drawer');
        expect(drawer).toHaveAttribute('role', 'dialog');
        expect(drawer).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByText('Suite List')).toBeInTheDocument();

        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('moves focus into the drawer when opened', async () => {
        const user = userEvent.setup();
        render(<DrawerWrapper />);

        await user.click(screen.getByTestId('suite-sidebar-toggle'));
        expect(screen.getByTestId('suite-sidebar-drawer')).toHaveFocus();
    });

    it('closes when the backdrop is tapped', async () => {
        const user = userEvent.setup();
        render(<DrawerWrapper />);

        await user.click(screen.getByTestId('suite-sidebar-toggle'));
        expect(screen.getByTestId('suite-sidebar-toggle')).toHaveAttribute('aria-expanded', 'true');

        await user.click(screen.getByTestId('suite-sidebar-backdrop'));
        expect(screen.getByTestId('suite-sidebar-toggle')).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes when the Escape key is pressed', async () => {
        const user = userEvent.setup();
        render(<DrawerWrapper />);

        await user.click(screen.getByTestId('suite-sidebar-toggle'));
        expect(screen.getByTestId('suite-sidebar-toggle')).toHaveAttribute('aria-expanded', 'true');

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByTestId('suite-sidebar-toggle')).toHaveAttribute('aria-expanded', 'false');
    });

    it('wires the toggle to the drawer with aria-controls', () => {
        render(<DrawerWrapper />);

        const toggle = screen.getByTestId('suite-sidebar-toggle');
        const drawer = screen.getByTestId('suite-sidebar-drawer');
        expect(toggle).toHaveAttribute('aria-controls', drawer.id);
    });
});
