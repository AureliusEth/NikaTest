'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DarkModeContextType {
	isDark: boolean;
	toggleDark: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		// Load from localStorage on mount
		const saved = localStorage.getItem('darkMode');
		if (saved !== null) {
			setIsDark(saved === 'true');
		} else {
			// Default to system preference
			setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
		}
	}, []);

	useEffect(() => {
		// Save to localStorage
		localStorage.setItem('darkMode', isDark.toString());
	}, [isDark]);

	const toggleDark = () => {
		setIsDark((prev) => !prev);
	};

	return (
		<DarkModeContext.Provider value={{ isDark, toggleDark }}>
			{children}
		</DarkModeContext.Provider>
	);
}

export function useDarkMode() {
	const context = useContext(DarkModeContext);
	if (context === undefined) {
		throw new Error('useDarkMode must be used within DarkModeProvider');
	}
	return context;
}

