// src/App.js (ПОЛНЫЙ КОД - Включая модальное окно соглашения, все развернуто)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты Компонентов
import StartupCard from './StartupCard';
import LandingPage from './LandingPage'; // Приветственная страница
import MeetupsTabContent from './MeetupsTabContent'; // Вкладка "Митапы"
import VacanciesTabContent from './VacanciesTabContent'; // Вкладка "Вакансии"
import ProfileTabContent from './ProfileTabContent'; // Вкладка "ЛК"
import AddStartupForm from './AddStartupForm'; // Форма добавления стартапа
import AgreementModal from './AgreementModal'; // Модальное окно соглашения
import './App.css'; // Стили
import { STARTUP_STAGES, getStageOrder } from './constants'; // Константы этапов

// --- Основное содержимое приложения (AppContent) ---
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
    const [loadingStartups, setLoadingStartups] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [editingStartupId, setEditingStartupId] = useState(null); // ID стартапа для ред. средств
    const [editingFunds, setEditingFunds] = useState({}); // Данные для ред. средств
    const [editingTimelineStartupId, setEditingTimelineStartupId] = useState(null); // ID стартапа для ред. плана
    const [editingTimelineData, setEditingTimelineData] = useState({}); // Данные для ред. плана
    const [updatingOperation, setUpdatingOperation] = useState(false); // Общий лоадер для PUT/POST/DELETE
    const [userProfileData, setUserProfileData] = useState(null); // Данные профиля
    const [loadingProfile, setLoadingProfile] = useState(true); // Лоадер профиля

    // Состояния для модального окна соглашения
    const [showAgreementModal, setShowAgreementModal] = useState(false);
    const [pendingStartupData, setPendingStartupData] = useState(null); // Временное хранилище данных формы

    // --- Функции ---
    // Показать временное сообщение
    const showMessage = useCallback((text, type = 'info') => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => { setMessage(''); setMessageType(''); }, 5000);
    }, []);

    // Обертка для fetch с добавлением токена и обработкой ошибок
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${token}` };
        try {
            const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            const data = await response.json().catch(() => ({})); // Пытаемся парсить JSON, иначе пустой объект
            if (!response.ok) {
                // Если ошибка аутентификации или профиль не найден - разлогиниваем
                if (response.status === 401 || response.status === 422 || (response.status === 404 && url.endsWith('/profile'))) {
                    console.error(`Auth Error ${response.status} on ${url} -> Logging out`);
                    onLogout();
                    return null; // Возвращаем null, чтобы прервать цепочку .then
                }
                // Другие ошибки пробрасываем
                throw new Error(data.error || `Ошибка ${response.status}`);
            }
            return data; // Возвращаем успешный результат
        } catch (error) {
            console.error(`AuthFetch failed for ${url}:`, error);
            // Не пробрасываем ошибку, если это связано с разлогиниванием
            if (!error.message?.includes("Сессия") && !error.message?.includes("Данные пользователя не найдены")) {
                throw error;
            }
            return null; // Возвращаем null при ошибках, ведущих к logout
        }
    }, [token, onLogout]);

    // Загрузка данных профиля
    const fetchUserProfile = useCallback(() => {
        setLoadingProfile(true);
        authFetch('/profile')
            .then(data => {
                if (data) { setUserProfileData(data); }
            })
            .catch(err => {
                // Показываем ошибку, только если это не ошибка, приведшая к logout
                if (err.message) { showMessage(`Ошибка загрузки профиля: ${err.message}`, 'error'); }
            })
            .finally(() => { setLoadingProfile(false); });
    }, [authFetch, showMessage]);

    // Загрузка стартапов
    const fetchStartups = useCallback(() => {
        if (!userProfileData) return; // Не грузим, если нет данных профиля
        setLoadingStartups(true);
        setFetchError('');
        const url = `/startups${showOnlyMyStartups ? '?filter_by_creator=true' : ''}`;
        authFetch(url)
            .then(data => {
                if (data) { setStartups(data); }
            })
            .catch(error => {
                 if (error.message) { setFetchError(`Ошибка загрузки стартапов: ${error.message}`); }
            })
            .finally(() => { setLoadingStartups(false); });
    }, [authFetch, showOnlyMyStartups, userProfileData]); // Зависим от фильтра и профиля

    // --- Эффекты ---
    // Загружаем профиль при монтировании AppContent
    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // Загружаем стартапы после загрузки профиля или при смене фильтра
    useEffect(() => {
        // Запускаем, только если профиль успешно загружен
        if (!loadingProfile && userProfileData) {
            fetchStartups();
        }
    }, [loadingProfile, userProfileData, showOnlyMyStartups, fetchStartups]); // Зависимости: флаг загрузки, данные профиля, фильтр

    // --- ОБРАБОТЧИКИ ДЕЙСТВИЙ (Полностью развернуты) ---

    // Функция отправки стартапа на бэкенд (вызывается ПОСЛЕ принятия соглашения)
    const handleAddStartup = async (startupData) => {
        if (!startupData) return; // Проверка данных
        if (!userProfileData?.telegram || !userProfileData?.resume_link) {
             showMessage('Пожалуйста, заполните Telegram и ссылку на резюме в Личном кабинете.', 'error');
             return;
        }
        setUpdatingOperation(true); // Включаем лоадер
        try {
            const data = await authFetch('/startups', { method: 'POST', body: JSON.stringify(startupData) });
            if (data) {
                showMessage(data.message || 'Заявка на добавление стартапа отправлена!', 'success');
                fetchStartups(); // Обновляем список стартапов
                setShowAddStartupForm(false); // Скрываем форму добавления (если она еще видна)
            }
        } catch (error) {
            if (error.message) { showMessage(`Ошибка добавления стартапа: ${error.message}`, 'error'); }
        } finally {
            setUpdatingOperation(false); // Выключаем лоадер
        }
     };

    // Обработчик клика на кнопку "Ред. средства"
    const handleEditFundsClick = (startup) => {
        setEditingTimelineStartupId(null); // Закрываем редактирование плана, если открыто
        setEditingStartupId(startup.id);
        const initialFunds = {};
        const currentFunds = startup.funds_raised || {};
        for (const currency in currentFunds) { initialFunds[currency] = String(currentFunds[currency]); }
        for (const cur of ['ETH', 'BTC', 'USDT']) { if (!(cur in initialFunds)) { initialFunds[cur] = '0'; } } // Добавляем нулевые значения для отсутствующих валют
        setEditingFunds(initialFunds);
    };

    // Обработчик изменения значения в поле редактирования средств
    const handleEditingFundsChange = (currency, value) => {
         const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); // Оставляем только цифры и одну точку
         setEditingFunds(prev => ({ ...prev, [currency]: sanitizedValue }));
     };

    // Обработчик сохранения отредактированных средств
    const handleSaveFunds = async (startupId) => {
        setUpdatingOperation(true);
        const fundsToSend = {};
        let validationError = null;
        for (const currency in editingFunds) { // Валидируем введенные значения
            const valueStr = editingFunds[currency].trim();
            if (valueStr === '') { fundsToSend[currency] = 0; continue; } // Пустое поле - ноль
            try {
                const amount = parseFloat(valueStr);
                if (isNaN(amount) || amount < 0) throw new Error(); // Проверка на число и > 0
                fundsToSend[currency] = amount;
            } catch (e) { validationError = `Некорректное значение для ${currency}. Введите число >= 0.`; break; }
        }
        if (validationError) { showMessage(validationError, 'error'); setUpdatingOperation(false); return; }

        try {
            const data = await authFetch(`/startups/${startupId}/funds`, { method: 'PUT', body: JSON.stringify(fundsToSend) });
            if (data && data.startup) { // Успешно, если вернулся обновленный стартап
                showMessage(data.message || 'Средства успешно обновлены!', 'success');
                setEditingStartupId(null); // Выходим из режима редактирования
                // Обновляем стартап в локальном состоянии
                setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s ));
            } else if (data) { // Если вернулось только сообщение
                showMessage(data.message || 'Средства обновлены!', 'success');
                setEditingStartupId(null);
                fetchStartups(); // Перезагружаем список на всякий случай
            }
        } catch (error) {
            if (error.message) { showMessage(`Ошибка сохранения средств: ${error.message}`, 'error'); }
        } finally {
            setUpdatingOperation(false);
        }
    };

    // Обработчик отмены редактирования средств
    const handleCancelEditFunds = () => {
        setEditingStartupId(null);
        setEditingFunds({});
    };

    // Обработчик одобрения стартапа (для админа)
    const handleApproveStartup = async (startupId) => {
        setUpdatingOperation(true);
        try {
            const data = await authFetch(`/startups/${startupId}/approve`, { method: 'PUT' });
            if (data && data.startup) {
                showMessage(data.message || 'Стартап одобрен!', 'success');
                setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s));
            } else if (data) {
                 showMessage(data.message || 'Стартап одобрен!', 'success');
                 fetchStartups();
            }
        } catch (err) {
            if (err.message) { showMessage(`Ошибка одобрения: ${err.message}`, 'error'); }
        } finally {
            setUpdatingOperation(false);
        }
    };

    // Обработчик отклонения стартапа (для админа)
    const handleRejectStartup = async (startupId, reason) => {
        setUpdatingOperation(true);
        try {
            const data = await authFetch(`/startups/${startupId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: reason }) });
             if (data && data.startup) {
                showMessage(data.message || 'Стартап отклонен.', 'info'); // Используем info для отклонения
                setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s));
            } else if (data) {
                 showMessage(data.message || 'Стартап отклонен.', 'info');
                 fetchStartups();
            }
        } catch (err) {
            if (err.message) { showMessage(`Ошибка отклонения: ${err.message}`, 'error'); }
        } finally {
            setUpdatingOperation(false);
        }
    };

    // Обработчик клика на кнопку "Ред. план"
    const handleEditTimelineClick = (startup) => {
        setEditingStartupId(null); // Закрываем редактирование средств
        setEditingTimelineStartupId(startup.id);
        const currentOrder = getStageOrder(startup.current_stage);
        const initialTimeline = {};
        // Заполняем начальные данные для инпутов будущих этапов
        for (const stage of STARTUP_STAGES) {
            if (stage.order > currentOrder) {
                initialTimeline[stage.key] = startup.stage_timeline?.[stage.key] || ''; // Пустая строка, если даты нет
            }
        }
        setEditingTimelineData(initialTimeline);
    };

    // Обработчик изменения даты в инпуте плана
    const handleTimelineDateChange = (stageKey, dateValue) => {
        setEditingTimelineData(prev => ({ ...prev, [stageKey]: dateValue }));
    };

    // Обработчик сохранения отредактированного плана
    const handleSaveTimeline = async (startupId) => {
        setUpdatingOperation(true);
        const timelineToSend = {};
        // Формируем данные для отправки (пустая строка -> null)
        for (const key in editingTimelineData) {
            timelineToSend[key] = editingTimelineData[key] || null; // Отправляем null, если дата пустая
        }
        try {
            const data = await authFetch(`/startups/${startupId}/timeline`, { method: 'PUT', body: JSON.stringify(timelineToSend) });
             if (data && data.startup) {
                showMessage(data.message || 'План развития обновлен!', 'success');
                setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s));
                setEditingTimelineStartupId(null); // Выходим из режима редактирования
            } else if (data) {
                 showMessage(data.message || 'План развития обновлен!', 'success');
                 setEditingTimelineStartupId(null);
                 fetchStartups();
            }
        } catch (error) {
             if (error.message) { showMessage(`Ошибка обновления плана: ${error.message}`, 'error'); }
        } finally {
            setUpdatingOperation(false);
        }
    };

    // Обработчик отмены редактирования плана
    const handleCancelEditTimeline = () => {
        setEditingTimelineStartupId(null);
        setEditingTimelineData({});
    };

    // Обработчик переключения статуса is_held (Приостановить/Вернуть)
    const handleToggleHold = async (startupId) => {
        setUpdatingOperation(true);
        try {
            const data = await authFetch(`/startups/${startupId}/toggle_hold`, { method: 'PUT' });
             if (data && data.startup) {
                showMessage(data.message || 'Статус стартапа обновлен!', 'success');
                setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s));
            } else if (data) {
                showMessage(data.message || 'Статус стартапа обновлен!', 'success');
                fetchStartups(); // Перезагружаем на всякий случай
            }
        } catch (error) {
             if (error.message) { showMessage(`Ошибка обновления статуса: ${error.message}`, 'error'); }
        } finally {
            setUpdatingOperation(false);
        }
    };

     // --- Обработчики для модального окна соглашения ---
    const handleAttemptSubmit = (formData) => {
        setPendingStartupData(formData);
        setShowAgreementModal(true);
        setShowAddStartupForm(false); // Скрываем форму добавления
    };
    const handleAgreementAccept = () => {
        setShowAgreementModal(false);
        if (pendingStartupData) {
            handleAddStartup(pendingStartupData); // Вызываем отправку
        }
        setPendingStartupData(null);
    };
    const handleAgreementCancel = () => {
        setShowAgreementModal(false);
        setPendingStartupData(null);
    };


    // Фильтрация стартапов для отображения
    const filteredStartups = startups.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase())
        // Здесь можно добавить и другие фильтры, если нужно
    );

    // Рендеринг основного контента
    if (loadingProfile) {
        return <div className="loading-container"><p>Загрузка данных пользователя...</p></div>; // Можно добавить стилизованный лоадер
    }
    // Если профиль не загрузился (например, из-за ошибки, приведшей к logout), показываем сообщение
    if (!userProfileData) {
        return <div className="error-container"><p className="message error">Не удалось загрузить данные пользователя. Попробуйте войти снова.</p></div>;
    }

    // Основной JSX для авторизованного пользователя
    return (
        <div className="app-container">
            {/* Шапка */}
            <div className="app-header">
                <h1 onClick={() => window.location.reload()} style={{cursor: 'pointer', userSelect: 'none'}}>YourFuture</h1>
                <div className="user-info">
                    <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span>
                    <button onClick={onLogout} className="logout-button">Выйти</button>
                </div>
            </div>

            {/* Навигация по вкладкам */}
            <div className="tabs-navigation">
                <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}>Стартапы</button>
                <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}>Митапы</button>
                <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}>Вакансии</button>
                <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Личный кабинет</button>
            </div>

            {/* Сообщения и лоадеры */}
            {fetchError && <p className="message error">{fetchError}</p>}
            {message && <p className={`message ${messageType}`}>{message}</p>}
            {updatingOperation && <div className="loading-indicator"><p>Выполняется операция...</p></div>} {/* Можно сделать лоадер заметнее */}

            {/* Модальное окно соглашения (рендерится, только если isOpen=true) */}
            <AgreementModal
                isOpen={showAgreementModal}
                onAccept={handleAgreementAccept}
                onCancel={handleAgreementCancel}
            />

            {/* Контент активной вкладки */}
            <div className="tab-content-area">
                {/* Вкладка Стартапы */}
                {activeTab === 'startups' && (
                    <div className="startups-content tab-pane"> {/* Добавлен tab-pane для единообразия анимации */}
                        {/* Поиск и фильтры */}
                        <div className="search-and-filter-container">
                             <div className="search-container">
                                 <input
                                     type="text"
                                     placeholder="Поиск по названию..."
                                     className="search-input"
                                     value={searchQuery}
                                     onChange={(e) => setSearchQuery(e.target.value)}
                                     disabled={loadingStartups || updatingOperation}
                                 />
                             </div>
                             <div className="filter-container">
                                 <input
                                     type="checkbox"
                                     id="showOnlyMyStartups"
                                     checked={showOnlyMyStartups}
                                     onChange={(e) => setShowOnlyMyStartups(e.target.checked)}
                                     disabled={loadingStartups || updatingOperation}
                                 />
                                 <label htmlFor="showOnlyMyStartups">Только мои стартапы</label>
                             </div>
                        </div>

                        {/* Кнопка Добавить / Форма добавления */}
                        {!showAddStartupForm && !showAgreementModal && (
                            <button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loadingStartups || updatingOperation}>
                                + Добавить свой стартапПП
                            </button>
                        )}
                        {showAddStartupForm && (
                            <AddStartupForm
                                onAttemptSubmit={handleAttemptSubmit} // Передаем новую функцию
                                onCancel={() => setShowAddStartupForm(false)}
                                isLoading={updatingOperation} // Используем общий лоадер
                            />
                        )}

                        {/* Список стартапов */}
                        <div className="startup-list card-list">
                            {loadingStartups && startups.length === 0 && <p>Загрузка стартапов...</p>}
                            {!loadingStartups && startups.length === 0 && !fetchError && <p>Нет стартапов для отображения{showOnlyMyStartups ? ', созданных вами' : ''}.</p>}
                            {!loadingStartups && startups.length > 0 && filteredStartups.length === 0 && (<p className="no-results-message">По вашему запросу ничего не найдено.</p>)}

                            {filteredStartups.map((startup) => (
                                <StartupCard
                                    key={startup.id}
                                    startup={startup}
                                    currentUserId={userId}
                                    isAdmin={isAdmin}
                                    // Пропсы для редактирования средств
                                    isEditingFunds={editingStartupId === startup.id}
                                    editingFunds={editingFunds}
                                    onEditFundsClick={handleEditFundsClick}
                                    onFundsChange={handleEditingFundsChange}
                                    onSaveFundsClick={handleSaveFunds}
                                    onCancelEditFundsClick={handleCancelEditFunds}
                                    // Пропсы для модерации
                                    onApprove={handleApproveStartup}
                                    onReject={handleRejectStartup}
                                    // Пропсы для редактирования плана
                                    isEditingTimeline={editingTimelineStartupId === startup.id}
                                    editingTimelineData={editingTimelineData}
                                    onEditTimelineClick={handleEditTimelineClick}
                                    onTimelineDateChange={handleTimelineDateChange}
                                    onSaveTimelineClick={handleSaveTimeline}
                                    onCancelEditTimelineClick={handleCancelEditTimeline}
                                    // Пропс для приостановки
                                    onToggleHold={handleToggleHold}
                                    // Общий флаг сохранения/обновления для блокировки кнопок
                                    isSaving={updatingOperation && (editingStartupId === startup.id || editingTimelineStartupId === startup.id)}
                                />
                             ))}
                        </div>
                    </div>
                )}

                {/* Вкладка Митапы */}
                {activeTab === 'meetups' && (
                    <MeetupsTabContent // Передаем необходимые пропсы
                        token={token}
                        userId={userId}
                        isAdmin={isAdmin}
                        authFetch={authFetch}
                        showMessage={showMessage}
                        userProfileData={userProfileData}
                        isUpdatingParent={updatingOperation} // Передаем флаг лоадера, если нужно
                    />
                )}

                {/* Вкладка Вакансии */}
                {activeTab === 'vacancies' && (
                     <VacanciesTabContent // Передаем необходимые пропсы
                        token={token}
                        username={username}
                        userId={userId}
                        userRole={userRole}
                        isAdmin={isAdmin}
                        authFetch={authFetch}
                        allStartups={startups} // Передаем загруженные стартапы
                        showMessage={showMessage}
                        userProfileData={userProfileData}
                        isUpdatingParent={updatingOperation} // Передаем флаг лоадера, если нужно
                    />
                )}

                {/* Вкладка Личный кабинет */}
                {activeTab === 'profile' && (
                     <ProfileTabContent // Передаем необходимые пропсы
                        token={token}
                        userId={userId}
                        authFetch={authFetch}
                        isAdmin={isAdmin} // <--- ВОТ ЭТА СТРОКА БЫЛА ПРОПУЩЕНА! ДОБАВЬ ЕЕ!
                        showMessage={showMessage}
                        onProfileUpdate={fetchUserProfile} // Функция для обновления данных после сохранения
                        isUpdatingParent={updatingOperation} // Передаем флаг лоадера, если нужно
                    />
                )}
            </div> {/* Конец .tab-content-area */}
        </div> // Конец .app-container
    );
}

// --- Компонент верхнего уровня App ---
function App() {
    // Получение начального состояния из localStorage
    const getInitialState = (key, parse = false) => { try { const item = localStorage.getItem(key); if (!item) return null; if (parse) { try { return parseInt(item, 10); } catch { return null; } } return item; } catch (error) { console.error("Ошибка чтения localStorage:", error); return null; } };
    const [token, setToken] = useState(() => getInitialState('jwtToken'));
    const [username, setUsername] = useState(() => getInitialState('username'));
    const [userRole, setUserRole] = useState(() => getInitialState('userRole'));
    const [userId, setUserId] = useState(() => getInitialState('userId', true)); // Парсим ID как число

    // Обработчик успешного входа
    const handleLoginSuccess = (newToken, loggedInUsername, loggedInUserRole) => {
        localStorage.setItem('jwtToken', newToken); localStorage.setItem('username', loggedInUsername); localStorage.setItem('userRole', loggedInUserRole);
        try { const payload = JSON.parse(atob(newToken.split('.')[1])); const loggedInUserId = payload.sub; if (loggedInUserId !== undefined && loggedInUserId !== null) { const userIdNumber = parseInt(loggedInUserId, 10); localStorage.setItem('userId', loggedInUserId); setUserId(userIdNumber); setUsername(loggedInUsername); setUserRole(loggedInUserRole); setToken(newToken); } else { console.error("User ID ('sub') не найден в токене."); handleLogout(); } } catch (error) { console.error("Ошибка парсинга токена или установки состояния:", error); handleLogout(); }
    };

    // Обработчик выхода
    const handleLogout = useCallback(() => { console.log("Выполняется logout..."); localStorage.clear(); setToken(null); setUsername(null); setUserRole(null); setUserId(null); }, []);

    // Рендеринг: LandingPage или AppContent
    return (
        <div>
            {/* Проверяем наличие всех данных перед рендерингом AppContent */}
            {token && userId !== null && username && userRole ? (
                <AppContent
                    token={token}
                    username={username}
                    userId={userId}
                    userRole={userRole}
                    onLogout={handleLogout}
                />
            ) : (
                // Показываем приветственную страницу, если не авторизован
                <LandingPage onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}

export default App; // Экспортируем главный компонент
