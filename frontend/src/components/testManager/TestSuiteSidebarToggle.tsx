import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TestSuiteSidebarToggleProps {
    isOpen: boolean;
    onToggle: () => void;
    openOffsetClass: string;
    controlsId?: string;
    buttonRef?: React.Ref<HTMLButtonElement>;
    size?: 'sm' | 'md';
    visible?: boolean;
    onReveal?: () => void;
}

const TestSuiteSidebarToggle: React.FC<TestSuiteSidebarToggleProps> = ({
    isOpen,
    onToggle,
    openOffsetClass,
    controlsId,
    buttonRef,
    size = 'md',
    visible = true,
    onReveal,
}) => (
    <button
        ref={buttonRef}
        type="button"
        data-testid="suite-sidebar-toggle"
        onClick={onToggle}
        onMouseMove={onReveal}
        aria-label={isOpen ? 'Close test suites' : 'Open test suites'}
        aria-expanded={isOpen}
        aria-controls={controlsId}
        aria-hidden={!visible}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center rounded-r-xl bg-system-blue text-white shadow-lg hover:bg-system-darkBlue active:scale-95 transition-all duration-300 ease-in-out motion-reduce:transition-none ${
            size === 'sm' ? 'h-10 w-7' : 'h-12 w-9'
        } ${isOpen ? openOffsetClass : ''} ${
            visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
    >
        {isOpen ? (
            <ChevronLeft className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
        ) : (
            <ChevronRight className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
        )}
    </button>
);

export default TestSuiteSidebarToggle;
