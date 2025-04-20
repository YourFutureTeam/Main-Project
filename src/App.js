// src/App.js (ПОЛНЫЙ КОД - Гарантированно показывает Auth, если нет токена)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов
import StartupCard from './StartupCard';
import { Auth } from './Auth'; // Компонент входа/регистрации
import MeetupsTabContent from './MeetupsTabContent';
import VacanciesTabContent from './VacanciesTabContent';
import ProfileTabContent from './ProfileTabContent';
import AddStartupForm from './AddStartupForm';
import './App.css';


// --- Основное содержимое приложения (показывается ТОЛЬКО при наличии ВАЛИДНОГО токена) ---
function AppContent({ token, username, userId, userRole, onLogout }) {
    // --- Состояния ---
    const [activeTab, setActiveTab] = useState('startups');
    const isAdmin = userRole === 'admin';
    const [startups, setStartups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyMyStartups, setShowOnlyMyStartups] = useState(false);
    const [showAddStartupForm, setShowAddStartupForm] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [loadingStartups, setLoadingStartups] = useState(true); // Инициализируем как true
    const [fetchError, setFetchError] = useState('');
    const [editingStartupId, setEditingStartupId] = useState(null);
    const [editingFunds, setEditingFunds] = useState({});
    const [updatingFunds, setUpdatingFunds] = useState(false);
    const [userProfileData, setUserProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true); // Инициализируем как true

    // --- Функции ---
    const showMessage = useCallback((text, type = 'info') => {
        setMessage(text); setMessageType(type);
        setTimeout(() => { setMessage(''); setMessageType(''); }, 5000);
    }, []);

    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${token}` };
        console.log(`AuthFetch to ${url}...`); // Лог запроса
        try {
            const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            const data = await response.json().catch(() => ({})); // Пустой объект при ошибке парсинга
            console.log(`AuthFetch response from ${url}: ${response.status}`); // Лог статуса
            if (!response.ok) {
                // ВЫЗЫВАЕМ LOGOUT ПРИ ЛЮБОЙ ОШИБКЕ 401/422 или 404 для /profile
                if (response.status === 401 || response.status === 422 || (response.status === 404 && url.endsWith('/profile'))) {
                    console.error(`Auth Error ${response.status} on ${url} -> Logging out`);
                    onLogout(); // Вызов logout из App
                    // Не бросаем ошибку, чтобы не было лишних сообщений в консоли, logout уже произошел
                    return null; // Возвращаем null, чтобы .then не выполнился
                }
                // Другие ошибки (не связанные с аутентификацией)
                throw new Error(data.error || `Ошибка ${response.status}`);
            }
            return data; // Возвращаем данные при успехе
        } catch (error) {
            console.error(`AuthFetch failed for ${url}:`, error);
            // Перебрасываем только ошибки, не связанные с logout
            if (!error.message?.includes("Сессия") && !error.message?.includes("Данные пользователя не найдены")) {
                 throw error;
            }
             return null; // Возвращаем null если был logout
        }
    }, [token, onLogout]); // Зависимости authFetch

    // Загрузка профиля при монтировании AppContent
    const fetchUserProfile = useCallback(() => {
        console.log("[AppContent] Загрузка профиля...");
        setLoadingProfile(true);
        authFetch('/profile')
            .then(data => {
                if (data) { // Если authFetch вернул данные (не было logout)
                    setUserProfileData(data);
                    console.log("[AppContent] Профиль загружен:", data);
                } else {
                    console.log("[AppContent] Профиль не загружен (вероятно, был logout).");
                    // Ничего не делаем, onLogout уже вызван и скоро произойдет ререндер App
                }
            })
            .catch(err => {
                 console.error("Не удалось загрузить профиль (не auth ошибка):", err);
                 showMessage(`Ошибка загрузки профиля: ${err.message}`, 'error');
            })
            .finally(() => {
                setLoadingProfile(false); // Снимаем лоадер профиля в любом случае
            });
    }, [authFetch, showMessage]); // Зависимости fetchUserProfile

    // Загрузка стартапов (запускается ПОСЛЕ загрузки профиля или при изменении фильтра)
    const fetchStartups = useCallback(() => {
        if (!userProfileData) return; // Не грузим стартапы, если нет профиля
        console.log(`[AppContent] Загрузка стартапов... (Фильтр: ${showOnlyMyStartups})`);
        setLoadingStartups(true); setFetchError('');
        const url = `/startups${showOnlyMyStartups ? '?filter_by_creator=true' : ''}`;
        authFetch(url)
            .then(data => { if (data) setStartups(data); })
            .catch(error => { console.error("Ошибка стартапов:", error); setFetchError(`Ошибка стартапов: ${error.message}`); })
            .finally(() => { setLoadingStartups(false); });
    }, [authFetch, showOnlyMyStartups, userProfileData]); // Зависим от userProfileData

    // Вызов загрузки профиля при монтировании AppContent
    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // Вызов загрузки стартапов после загрузки профиля или при смене фильтра
    useEffect(() => {
        // Запускаем fetchStartups только если профиль УЖЕ загружен
        if (!loadingProfile && userProfileData) {
            fetchStartups();
        }
    }, [loadingProfile, userProfileData, showOnlyMyStartups, fetchStartups]);

    // --- ОБРАБОТЧИКИ ДЕЙСТВИЙ (развернуты) ---
    const handleAddStartup = async (startupData) => {
        if (!userProfileData?.telegram || !userProfileData?.resume_link) {
             showMessage('Заполните Telegram и резюме в ЛК.', 'error'); return; }
        console.log("handleAddStartup (из формы):", startupData);
        setUpdatingFunds(true);
        try {
            const data = await authFetch('/startups', { method: 'POST', body: JSON.stringify(startupData) });
            if (data) {
                showMessage(data.message || 'Стартап на рассмотрении!', 'success');
                fetchStartups();
                setShowAddStartupForm(false);
            }
        } catch (error) { showMessage(`Ошибка добавления: ${error.message}`, 'error'); }
        finally { setUpdatingFunds(false); }
     };
    const handleEditFundsClick = (startup) => { console.log("Ред. средств для:", startup.id); setEditingStartupId(startup.id); const initialFunds = {}; const currentFunds = startup.funds_raised || {}; for (const currency in currentFunds) { initialFunds[currency] = String(currentFunds[currency]); } for (const cur of ['ETH', 'BTC', 'USDT']) { if (!(cur in initialFunds)) { initialFunds[cur] = '0'; } } setEditingFunds(initialFunds); };
    const handleEditingFundsChange = (currency, value) => { const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setEditingFunds(prev => ({ ...prev, [currency]: sanitizedValue })); };
    const handleSaveFunds = async (startupId) => { setUpdatingFunds(true); setMessage(''); const fundsToSend = {}; let validationError = null; for (const currency in editingFunds) { const valueStr = editingFunds[currency].trim(); if (valueStr === '') { fundsToSend[currency] = 0; continue; } try { const amount = parseFloat(valueStr); if (isNaN(amount) || amount < 0) { throw new Error(); } fundsToSend[currency] = amount; } catch (e) { validationError = `Некорректное значение для ${currency}.`; break; } } if (validationError) { showMessage(validationError, 'error'); setUpdatingFunds(false); return; } console.log(`Сохранение средств для ${startupId}:`, fundsToSend); try { const data = await authFetch(`/startups/${startupId}/funds`, { method: 'PUT', body: JSON.stringify(fundsToSend) }); if (data) { showMessage(data.message || 'Средства обновлены!', 'success'); setEditingStartupId(null); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s )); } } catch (error) { showMessage(`Ошибка сохранения: ${error.message}`, 'error'); } finally { setUpdatingFunds(false); } };
    const handleCancelEditFunds = () => { console.log("Отмена ред. средств"); setEditingStartupId(null); setEditingFunds({}); };
    const handleApproveStartup = async (startupId) => { setUpdatingFunds(true); try { const data = await authFetch(`/startups/${startupId}/approve`, { method: 'PUT' }); if (data) { showMessage(data.message || 'Одобрено!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); } } catch (err) { showMessage(`Ошибка: ${err.message}`, 'error'); } finally { setUpdatingFunds(false); } };
    const handleRejectStartup = async (startupId, reason) => { setUpdatingFunds(true); try { const data = await authFetch(`/startups/${startupId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: reason }) }); if (data) { showMessage(data.message || 'Отклонено!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); } } catch (err) { showMessage(`Ошибка: ${err.message}`, 'error'); } finally { setUpdatingFunds(false); } };

    // Фильтрация для поиска
    const filteredStartups = startups.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Показываем лоадер, пока грузится профиль (самое первое действие)
    if (loadingProfile) {
        return <p>Загрузка данных пользователя...</p>;
    }
    // Если профиль НЕ загрузился (onLogout был вызван), этот компонент уже не должен рендериться,
    // но на всякий случай возвращаем null или сообщение об ошибке, чтобы избежать падения.
    if (!userProfileData) {
         return <p className="message error">Не удалось загрузить данные пользователя. Попробуйте войти снова.</p>;
    }

    // --- JSX AppContent ---
    return (
        <div className="app-container">
            <div className="app-header"> <h1 onClick={() => window.location.reload()} style={{cursor: 'pointer'}}>Инвестируйте в Будущее!</h1> <div className="user-info"> <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span> <button onClick={onLogout} className="logout-button">Выйти</button> </div> </div>
            <div className="tabs-navigation"> <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}> Стартапы </button> <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}> Митапы </button> <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}> Вакансии </button> <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}> Личный кабинет </button> </div>
            {fetchError && <p className="message error">{fetchError}</p>} {message && <p className={`message ${messageType}`}>{message}</p>}
            {updatingFunds && <p>Выполняется операция...</p>}

            <div className="tab-content-area">
                {/* Вкладка Стартапы */}
                {activeTab === 'startups' && (
                    <div className="startups-content">
                        <div className="search-and-filter-container">
                            <div className="search-container"> <input type="text" placeholder="Поиск..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loadingStartups || updatingFunds} /> </div>
                            <div className="filter-container"> <input type="checkbox" id="showOnlyMyStartups" checked={showOnlyMyStartups} onChange={(e) => setShowOnlyMyStartups(e.target.checked)} disabled={loadingStartups || updatingFunds} /> <label htmlFor="showOnlyMyStartups">Только мои</label> </div>
                        </div>
                        {!showAddStartupForm && (<button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loadingStartups || updatingFunds}> + Добавить стартап </button>)}
                        {showAddStartupForm && (<AddStartupForm onAdd={handleAddStartup} onCancel={() => setShowAddStartupForm(false)} isLoading={updatingFunds} />)}
                        <div className="startup-list card-list">
                            {loadingStartups && startups.length === 0 && <p>Загрузка стартапов...</p>}
                            {!loadingStartups && startups.length === 0 && !fetchError && <p>Нет стартапов{showOnlyMyStartups ? ', созданных вами' : ''}.</p>}
                            {!loadingStartups && startups.length > 0 && filteredStartups.length === 0 && (<p className="no-results-message">Нет результатов.</p>)}
                            {filteredStartups.map((startup) => ( <StartupCard key={startup.id} startup={startup} currentUserId={userId} isAdmin={isAdmin} isEditing={editingStartupId === startup.id} editingFunds={editingFunds} onEditClick={handleEditFundsClick} onFundsChange={handleEditingFundsChange} onSaveClick={handleSaveFunds} onCancelClick={handleCancelEditFunds} isSaving={updatingFunds && editingStartupId === startup.id} onApprove={handleApproveStartup} onReject={handleRejectStartup} /> ))}
                        </div>
                    </div>
                )}
                {/* Остальные вкладки */}
                {activeTab === 'meetups' && ( <MeetupsTabContent token={token} userId={userId} isAdmin={isAdmin} authFetch={authFetch} showMessage={showMessage} userProfileData={userProfileData} /> )}
                {activeTab === 'vacancies' && ( <VacanciesTabContent token={token} username={username} userId={userId} userRole={userRole} isAdmin={isAdmin} authFetch={authFetch} allStartups={startups} showMessage={showMessage} userProfileData={userProfileData} /> )}
                {activeTab === 'profile' && ( <ProfileTabContent token={token} userId={userId} authFetch={authFetch} showMessage={showMessage} onProfileUpdate={fetchUserProfile} /> )}
            </div>
        </div>
    );
}


// --- Компонент верхнего уровня App ---
function App() {
    // Инициализируем состояние из localStorage СРАЗУ
    const getInitialState = (key, parse = false) => {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            if (parse) {
                 try { return parseInt(item, 10); } catch { return null; }
            }
            return item;
        } catch (error) { console.error("Ошибка чтения localStorage:", error); return null; }
    };

    const [token, setToken] = useState(() => getInitialState('jwtToken'));
    const [username, setUsername] = useState(() => getInitialState('username'));
    const [userRole, setUserRole] = useState(() => getInitialState('userRole'));
    const [userId, setUserId] = useState(() => getInitialState('userId', true));
    // const [isAuthLoading, setIsAuthLoading] = useState(true); // Больше не нужно

    // Обработчик успешного входа
    const handleLoginSuccess = (newToken, loggedInUsername, loggedInUserRole) => {
        localStorage.setItem('jwtToken', newToken);
        localStorage.setItem('username', loggedInUsername);
        localStorage.setItem('userRole', loggedInUserRole);
        try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            const loggedInUserId = payload.sub;
            if (loggedInUserId) {
                 localStorage.setItem('userId', loggedInUserId);
                 setUserId(parseInt(loggedInUserId, 10));
                 setUsername(loggedInUsername);
                 setUserRole(loggedInUserRole);
                 setToken(newToken); // Ставим токен последним
            } else { console.error("Нет ID в токене"); handleLogout(); }
        } catch (error) { console.error("Ошибка:", error); handleLogout(); }
    };

    // Обработчик выхода
    const handleLogout = useCallback(() => {
        console.log("Выполняется logout...");
        localStorage.clear();
        setToken(null); setUsername(null); setUserRole(null); setUserId(null);
    }, []); // Пустая зависимость

    // useEffect для проверки валидности начального состояния (опционально, но полезно)
    useEffect(() => {
        const storedToken = localStorage.getItem('jwtToken');
        if (storedToken && token) { // Если токен есть и в LS, и в состоянии
            try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                const expiry = payload.exp;
                if (!(expiry * 1000 > Date.now())) {
                    console.warn("Начальный токен из localStorage истек. Выполняется logout.");
                    handleLogout();
                }
                 // Дополнительно можно проверить соответствие ID, username, role, если они тоже в состоянии
                 else if (!userId || !username || !userRole) {
                     console.warn("Неполное начальное состояние при валидном токене. Выполняется logout.");
                     handleLogout();
                 }

            } catch (error) {
                console.error("Ошибка проверки начального токена:", error);
                handleLogout();
            }
        } else if (!storedToken && token) {
            // Если в LS токена нет, а в состоянии есть - рассинхрон
            console.warn("Рассинхрон: токен есть в состоянии, но нет в localStorage. Выполняется logout.");
            handleLogout();
        }
    // Запускаем эту проверку ОДИН РАЗ при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // Рендерим Auth или AppContent СРАЗУ на основе token в состоянии
    return (
        <div>
            {token ? ( // Если токен есть в состоянии, рендерим контент
                <AppContent
                    token={token}
                    username={username} // Данные берем из состояния
                    userId={userId}
                    userRole={userRole}
                    onLogout={handleLogout} // Передаем функцию logout
                />
            ) : ( // Если токена нет, рендерим форму входа
                <Auth onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}
export default App;
