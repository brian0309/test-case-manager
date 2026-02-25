import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    suggestions?: string[];
    placeholder?: string;
    maxTags?: number;
}

/**
 * TagInput component with auto-suggest dropdown.
 * Allows adding/removing tags with keyboard and mouse interaction.
 */
const TagInput: React.FC<TagInputProps> = ({
    tags,
    onChange,
    suggestions = [],
    placeholder = 'Add a tag...',
    maxTags = 20,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input and already-selected tags
    const filteredSuggestions = suggestions.filter(
        (s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(s)
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset highlight index when filtered suggestions change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [inputValue]);

    const addTag = useCallback(
        (tag: string) => {
            const trimmed = tag.trim();
            if (!trimmed) return;
            if (tags.includes(trimmed)) return;
            if (tags.length >= maxTags) return;
            onChange([...tags, trimmed]);
            setInputValue('');
            setShowSuggestions(false);
            inputRef.current?.focus();
        },
        [tags, onChange, maxTags]
    );

    const removeTag = useCallback(
        (tag: string) => {
            onChange(tags.filter((t) => t !== tag));
            inputRef.current?.focus();
        },
        [tags, onChange]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                addTag(filteredSuggestions[highlightedIndex]);
            } else if (inputValue.trim()) {
                addTag(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setShowSuggestions(true);
            setHighlightedIndex((prev) =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : filteredSuggestions.length - 1
            );
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div
                className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[38px] cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(tag);
                            }}
                            className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => {
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    disabled={tags.length >= maxTags}
                />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                index === highlightedIndex
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Hint text */}
            {tags.length > 0 && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Press Enter or comma to add. Backspace to remove last tag.
                </p>
            )}
        </div>
    );
};

export default TagInput;
