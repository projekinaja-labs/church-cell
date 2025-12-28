import { useLanguage } from '../context/LanguageContext';
import { FiGlobe } from 'react-icons/fi';

export default function LanguageSwitcher() {
    const { language, toggleLanguage } = useLanguage();

    return (
        <div className="lang-switcher">
            <FiGlobe className="lang-icon" />
            <button
                className="lang-toggle"
                onClick={toggleLanguage}
                aria-label="Toggle language"
            >
                <span className={`lang-option ${language === 'en' ? 'active' : ''}`}>
                    EN
                </span>
                <span className={`lang-option ${language === 'ko' ? 'active' : ''}`}>
                    한
                </span>
                <span
                    className="lang-slider"
                    style={{ transform: language === 'ko' ? 'translateX(100%)' : 'translateX(0)' }}
                />
            </button>
        </div>
    );
}
