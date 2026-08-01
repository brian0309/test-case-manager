import React, { useEffect, useId, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TestSuiteSidebarDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onToggle: () => void;
    children: React.ReactNode;
}

const DRAWER_WIDTH_CLASS = 'w-72';

const TestSuiteSidebarDrawer: React.FC<TestSuiteSidebarDrawerProps> = ({
    isOpen,
    onClose,
    onToggle,
    children,
}) => {
    const drawerId = useId();
    const drawerRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);

    // Close with Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Lock body scrolling while the drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Focus management: move focus into the drawer on open, return it to the toggle on close
    useEffect(() => {
        if (isOpen) {
            drawerRef.current?.focus();
        } else {
            toggleRef.current?.focus();
        }
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div
                data-testid="suite-sidebar-backdrop"
                className={`absolute inset-0 z-30 bg-black/40 dark:bg-black/60 transition-opacity duration-300 motion-reduce:transition-none ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                aria-hidden={!isOpen}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                id={drawerId}
                data-testid="suite-sidebar-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Test suites"
                tabIndex={-1}
                className={`absolute inset-y-0 left-0 z-30 ${DRAWER_WIDTH_CLASS} flex flex-col shadow-xl outline-none transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {children}
            </div>

            {/* Floating edge toggle */}
            <button
                ref={toggleRef}
                type="button"
                data-testid="suite-sidebar-toggle"
                onClick={onToggle}
                aria-label={isOpen ? 'Close test suites' : 'Open test suites'}
                aria-expanded={isOpen}
                aria-controls={drawerId}
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 flex h-12 w-9 items-center justify-center rounded-r-xl bg-system-blue text-white shadow-lg hover:bg-system-darkBlue active:scale-95 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
                    isOpen ? 'translate-x-72' : ''
                }`}
            >
                {isOpen ? (
                    <ChevronLeft className="h-5 w-5" />
                ) : (
                    <ChevronRight className="h-5 w-5" />
                )}
            </button>
        </>
    );
};

export default TestSuiteSidebarDrawer;
