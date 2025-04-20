// src/App.js (ПОЛНЫЙ КОД - ВСЕ ФУНКЦИИ РАСКРЫТЫ)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов
import StartupCard from './StartupCard';
import { Auth } from './Auth';
import MeetupsTabContent from './MeetupsTabContent'; // Импортируем обновленный
import VacanciesTabContent from './VacanciesTabContent';
import ProfileTabContent from './ProfileTabContent';
import AddStartupForm from './AddStartupForm'; // Определен ниже или импортирован
import './App.css';


// --- Основное содержимое приложения (для залогиненного пользователя) ---
function AppContent({ token, username, userId, userRole, onLogout }) {
    const [activeTab, setActiveTab] = useState('startups'); // Текущая вкладка
    const isAdmin = userRole === 'admin'; // Флаг админа

    // Состояния для стартапов
    const [startups, setStartups] = useState([]); // Список всех стартапов
    const [searchQuery, setSearchQuery] = useState(''); // Поисковый запрос для стартапов
    const [showAddStartupForm, setShowAddStartupForm] = useState(false); // Показ формы добавления стартапа

    // Общие состояния
    const [message, setMessage] = useState(''); // Сообщения для пользователя
    const [messageType, setMessageType] = useState('');
    const [loading, setLoading] = useState(false); // Общий лоадер для ЗАГРУЗКИ списков
    const [fetchError, setFetchError] = useState(''); // Ошибка загрузки списков

    // Состояния для РЕДАКТИРОВАНИЯ СРЕДСТВ стартапа
    const [editingStartupId, setEditingStartupId] = useState(null); // ID редактируемого стартапа
    const [editingFunds, setEditingFunds] = useState({}); // Временные данные для формы редактирования
    const [updatingFunds, setUpdatingFunds] = useState(false); // Лоадер для ОПЕРАЦИИ обновления средств

    // Состояние для ДАННЫХ ПРОФИЛЯ текущего пользователя
    const [userProfileData, setUserProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true); // Индикатор загрузки профиля

    // --- ФУНКЦИИ ---

    // Показать временное сообщение
    const showMessage = (text, type = 'info') => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 5000);
    };

    // Обертка для fetch с добавлением токена
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
        console.log(`AuthFetch to ${url}: Method=${options.method || 'GET'}`);
        try {
            const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401 || response.status === 422) {
                    console.error(`Auth Error ${response.status}`);
                    onLogout();
                    throw new Error(data.error || "Сессия недействительна");
                }
                throw new Error(data.error || `Ошибка ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error('AuthFetch failed:', error);
            throw error;
        }
    }, [token, onLogout]);

    // Загрузка списка стартапов
    const fetchStartups = useCallback(() => {
        setLoading(true); setFetchError('');
        fetch('http://127.0.0.1:5000/startups')
            .then(response => {
                if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
                return response.json();
            })
            .then(data => { setStartups(data); })
            .catch(error => {
                console.error("Ошибка загрузки стартапов:", error);
                setFetchError(`Не удалось загрузить стартапы: ${error.message}`);
            })
            .finally(() => { setLoading(false); });
    }, []);

    // Загрузка профиля пользователя
    const fetchUserProfile = useCallback(() => {
        console.log("[AppContent] Загрузка/Обновление профиля пользователя...");
        setLoadingProfile(true);
        authFetch('/profile')
            .then(data => {
                setUserProfileData(data);
                console.log("[AppContent] Профиль загружен/обновлен:", data);
            })
            .catch(err => {
                console.error("Ошибка загрузки/обновления профиля в AppContent:", err);
                showMessage(`Не удалось загрузить/обновить данные профиля: ${err.message}`, 'error');
                setUserProfileData(null);
            })
            .finally(() => { setLoadingProfile(false); });
    }, [authFetch, showMessage]);

    // Загружаем стартапы и профиль ТОЛЬКО ОДИН РАЗ при монтировании
    useEffect(() => {
        fetchStartups();
        fetchUserProfile();
    }, []); // Пустой массив зависимостей

    // Обработчик добавления стартапа
    const handleAddStartup = async (startupData) => {
        console.log("handleAddStartup вызван с:", startupData);
        setLoading(true);
        try {
            const data = await authFetch('/startups', {
                method: 'POST',
                body: JSON.stringify(startupData)
            });
            showMessage(data.message || 'Стартап успешно добавлен!', 'success');
            fetchStartups();
            setShowAddStartupForm(false);
        } catch (error) {
            showMessage(`Ошибка добавления стартапа: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
     };

    // Обработчик клика на "Ред. средства"
    const handleEditFundsClick = (startup) => {
        console.log("Начало редактирования средств для:", startup.id);
        setEditingStartupId(startup.id);
        const initialFunds = {};
        const currentFunds = startup.funds_raised || {};
        for (const currency in currentFunds) { initialFunds[currency] = String(currentFunds[currency]); }
        for (const cur of ['ETH', 'BTC', 'USDT']) { if (!(cur in initialFunds)) { initialFunds[cur] = '0'; } }
        setEditingFunds(initialFunds);
    };

    // Обработчик изменения полей средств
    const handleEditingFundsChange = (currency, value) => {
        const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        setEditingFunds(prev => ({ ...prev, [currency]: sanitizedValue }));
    };

    // Обработчик сохранения средств
    const handleSaveFunds = async (startupId) => {
        setUpdatingFunds(true); setMessage('');
        const fundsToSend = {}; let validationError = null;
        for (const currency in editingFunds) {
            const valueStr = editingFunds[currency].trim();
            if (valueStr === '') { fundsToSend[currency] = 0; continue; }
            try {
                const amount = parseFloat(valueStr);
                if (isNaN(amount) || amount < 0) { throw new Error(); }
                fundsToSend[currency] = amount;
            } catch (e) { validationError = `Некорректное значение "${valueStr}" для ${currency}.`; break; }
        }
        if (validationError) { showMessage(validationError, 'error'); setUpdatingFunds(false); return; }

        console.log(`[AppContent] Сохранение средств для ${startupId}:`, fundsToSend);
        try {
            const data = await authFetch(`/startups/${startupId}/funds`, { method: 'PUT', body: JSON.stringify(fundsToSend) });
            showMessage(data.message || 'Средства обновлены!', 'success');
            setEditingStartupId(null);
            setStartups(prev => prev.map(s =>
                 s.id === startupId
                 ? { ...s, funds_raised: data.startup.funds_raised, creator_username: data.startup.creator_username }
                 : s
             ));
        } catch (error) { console.error("Ошибка сохранения средств:", error); showMessage(`Ошибка: ${error.message}`, 'error'); }
        finally { setUpdatingFunds(false); }
    };

    // Обработчик отмены редактирования средств
    const handleCancelEditFunds = () => {
        console.log("Отмена редактирования средств");
        setEditingStartupId(null); setEditingFunds({});
     };

    // Фильтрация стартапов для поиска
    const filteredStartups = startups.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Лог для проверки isAdmin перед рендером
    console.log("[AppContent] Rendering, isAdmin:", isAdmin, "userRole:", userRole);

    // --- JSX Рендеринг ---
    return (
        <div className="app-container">
            {/* Шапка */}
            <div className="app-header">
                 <h1>Инвестируйте в Будущее!</h1>
                 <div className="user-info">
                    <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span>
                    <button onClick={onLogout} className="logout-button">Выйти</button>
                 </div>
            </div>

            {/* Навигация по вкладкам */}
            <div className="tabs-navigation">
                 <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}> Стартапы </button>
                 <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}> Митапы </button>
                 <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}> Вакансии </button>
                 <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}> Личный кабинет </button>
            </div>

             {/* Сообщения об ошибках и успехах */}
             {fetchError && <p className="message error">{fetchError}</p>}
             {message && <p className={`message ${messageType}`}>{message}</p>}
             {/* Лоадер во время начальной загрузки стартапов или профиля */}
             {(loading || (loadingProfile && !userProfileData)) && <p>Загрузка данных...</p>}

            {/* Область контента вкладок */}
            <div className="tab-content-area">
                {/* Вкладка Стартапы */}
                {activeTab === 'startups' && (
                    <div className="startups-content">
                         <div className="search-container">
                             <input type="text" placeholder="Поиск по названию стартапа..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loading || updatingFunds} />
                         </div>
                         {!showAddStartupForm && (<button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loading || updatingFunds}> + Добавить стартап </button>)}
                         {showAddStartupForm && (<AddStartupForm onAdd={handleAddStartup} onCancel={() => setShowAddStartupForm(false)} isLoading={loading || updatingFunds} />)}
                         <div className="startup-list card-list">
                             {loading && startups.length === 0 && <p>Загрузка стартапов...</p>}
                             {!loading && startups.length === 0 && !fetchError && <p>Стартапов пока нет.</p>}
                             {!loading && startups.length > 0 && filteredStartups.length === 0 && (<p className="no-results-message">По вашему запросу "{searchQuery}" ничего не найдено.</p>)}
                             {filteredStartups.map((startup) => (
                                 <StartupCard
                                     key={startup.id}
                                     startup={startup}
                                     currentUserId={userId}
                                     isAdmin={isAdmin}
                                     isEditing={editingStartupId === startup.id}
                                     editingFunds={editingFunds}
                                     onEditClick={handleEditFundsClick}
                                     onFundsChange={handleEditingFundsChange}
                                     onSaveClick={handleSaveFunds}
                                     onCancelClick={handleCancelEditFunds}
                                     isSaving={updatingFunds && editingStartupId === startup.id}
                                 />
                             ))}
                         </div>
                    </div>
                )}
                {/* Вкладка Митапы */}
                {activeTab === 'meetups' && (
                    <MeetupsTabContent
                        token={token}
                        userId={userId} // Передаем ID текущего пользователя
                        isAdmin={isAdmin} // Передаем флаг админа
                        authFetch={authFetch}
                        showMessage={showMessage} // Передаем функцию сообщений
                    />
                 )}
                {/* Вкладка Вакансии */}
                {activeTab === 'vacancies' && (
                    <VacanciesTabContent
                        token={token}
                        username={username}
                        userId={userId}
                        userRole={userRole}
                        isAdmin={isAdmin} // Передаем isAdmin
                        authFetch={authFetch}
                        allStartups={startups}
                        showMessage={showMessage}
                        userProfileData={userProfileData} // Передаем загруженные данные профиля
                    />
                 )}
                {/* Вкладка Личный кабинет */}
                {activeTab === 'profile' && (
                    <ProfileTabContent
                        token={token}
                        userId={userId}
                        authFetch={authFetch}
                        showMessage={showMessage}
                        onProfileUpdate={fetchUserProfile} // Передаем колбэк для обновления профиля
                    />
                 )}
            </div>
        </div>
    );
}


// --- Компонент верхнего уровня App ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('jwtToken'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
    const [userId, setUserId] = useState(localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId'), 10) : null);

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
            } else {
                console.error("Не удалось извлечь ID пользователя (sub) из токена.");
                 handleLogout(); return;
            }
        } catch (error) {
             console.error("Ошибка декодирования токена или извлечения ID:", error);
             handleLogout(); return;
        }
        setToken(newToken);
        setUsername(loggedInUsername);
        setUserRole(loggedInUserRole);
    };

    // Обработчик выхода
    const handleLogout = useCallback(() => {
        localStorage.clear();
        setToken(null); setUsername(null); setUserRole(null); setUserId(null);
    }, []);

    // Эффект для проверки данных в localStorage при загрузке
    useEffect(() => {
        const storedToken = localStorage.getItem('jwtToken');
        const storedUsername = localStorage.getItem('username');
        const storedUserRole = localStorage.getItem('userRole');
        const storedUserIdStr = localStorage.getItem('userId');

        if (storedToken && storedUsername && storedUserRole && storedUserIdStr) {
            setToken(storedToken); setUsername(storedUsername);
            setUserRole(storedUserRole); setUserId(parseInt(storedUserIdStr, 10));
        } else if (token || username || userRole || userId !== null) {
             handleLogout();
        }
    }, [handleLogout, token, username, userRole, userId]);

    // Рендер приложения
    return (
        <div>
            {token && username && userRole && userId !== null ? (
                <AppContent
                    token={token} username={username} userId={userId}
                    userRole={userRole} onLogout={handleLogout}
                />
            ) : (
                <Auth onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}

export default App;
