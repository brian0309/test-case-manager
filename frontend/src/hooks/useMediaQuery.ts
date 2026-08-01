import { useEffect, useState } from 'react';

/**
 * Custom hook that returns whether the given media query currently matches.
 * @param query The CSS media query string to evaluate
 * @returns Whether the media query currently matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.matchMedia(query).matches : false
    );

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);
        const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

        setMatches(mediaQueryList.matches);
        mediaQueryList.addEventListener('change', handleChange);
        return () => mediaQueryList.removeEventListener('change', handleChange);
    }, [query]);

    return matches;
}

export default useMediaQuery;
