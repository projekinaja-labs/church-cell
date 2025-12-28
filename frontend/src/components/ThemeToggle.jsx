import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <div className="theme-toggle-track">
                <div className={`theme-toggle-thumb ${isDark ? 'dark' : 'light'}`}>
                    {isDark ? <FiMoon /> : <FiSun />}
                </div>
            </div>
        </button>
    );
}
