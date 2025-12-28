import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
    const { login, error } = useAuth();
    const { t } = useLanguage();
    const [cellId, setCellId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setLoading(true);

        try {
            await login(cellId, password);
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-lang-switcher" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ThemeToggle />
                <LanguageSwitcher />
            </div>
            <div className="login-card slide-up">
                <div className="login-header">
                    <div className="login-logo">⛪</div>
                    <h1 className="login-title">{t('login.title')}</h1>
                    <p className="login-subtitle">{t('login.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('login.cellId')}</label>
                        <div style={{ position: 'relative' }}>
                            <FiUser
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }}
                            />
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('login.cellIdPlaceholder')}
                                value={cellId}
                                onChange={(e) => setCellId(e.target.value)}
                                style={{ paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('login.password')}</label>
                        <div style={{ position: 'relative' }}>
                            <FiLock
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }}
                            />
                            <input
                                type="password"
                                className="form-input"
                                placeholder={t('login.passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    {(localError || error) && (
                        <div className="form-error" style={{ marginBottom: 'var(--space-md)', textAlign: 'center' }}>
                            {localError || error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                {t('login.signingIn')}
                            </>
                        ) : (
                            <>
                                <FiLogIn />
                                {t('login.signIn')}
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-muted mt-lg">
                    {t('login.contactAdmin')}
                </p>
            </div>
        </div>
    );
}

