// src/App.js

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов (убедитесь, что эти файлы существуют и экспортируют компоненты по умолчанию)
import StartupCard from './StartupCard';
import { Auth } from './Auth'; // Компонент с формами входа/регистрации
import MeetupsTabContent from './MeetupsTabContent'; // Компонент для вкладки митапов
import VacanciesTabContent from './VacanciesTabContent'; // Компонент для вкладки вакансий
// Импорт CSS
import './App.css';

// --- Компонент AddStartupForm (можно вынести в отдельный файл src/AddStartupForm.js) ---
// Это определение должно быть здесь ИЛИ импортировано из файла src/AddStartupForm.js
function AddStartupForm({ onAdd, onCancel, isLoading }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !description.trim()) {
            alert('Пожалуйста, заполните имя и описание стартапа.');
            return;
        }
        onAdd({ name, description });
        // Очистка полей опциональна
        // setName('');
        // setDescription('');
    };

    return (
        <form onSubmit={handleSubmit} className="add-startup-form add-form"> {/* Общий класс */}
            <h3>Добавить новый стартап</h3>
            <input
                type="text" placeholder="Название стартапа" value={name}
                onChange={(e) => setName(e.target.value)} required disabled={isLoading}
            />
            <textarea
                placeholder="Краткое описание" value={description}
                onChange={(e) => setDescription(e.target.value)} required disabled={isLoading}
            />
            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>{isLoading ? 'Добавление...' : 'Добавить стартап'}</button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>Отмена</button>
            </div>
        </form>
    );
}


// --- Основное содержимое приложения (для залогиненного пользователя) ---
function AppContent({ token, username, userId, userRole, onLogout }) { // Принимаем userId
    // Состояние для активной вкладки
    const [activeTab, setActiveTab] = useState('startups'); // 'startups', 'meetups', 'vacancies'
    const isAdmin = userRole === 'admin'; // Флаг админа

    // --- Состояния для вкладки СТАРТАПЫ ---
    const [startups, setStartups] = useState([]); // Храним ВСЕ стартапы здесь
    const [selectedStartupId, setSelectedStartupId] = useState(null);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('ETH');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddStartupForm, setShowAddStartupForm] = useState(false);

    // --- Общие состояния ---
    const [message, setMessage] = useState(''); // Для общих сообщений (н-р, от инвестиций)
    const [messageType, setMessageType] = useState('');
    const [loading, setLoading] = useState(false); // Общий лоадер для загрузки стартапов и других действий
    const [fetchError, setFetchError] = useState(''); // Общая ошибка загрузки стартапов

    // Функция для отображения временных сообщений
    const showMessage = (text, type) => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => { setMessage(''); setMessageType(''); }, 5000);
    };

    // --- Обертка для fetch с добавлением токена авторизации ---
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
            'Authorization': `Bearer ${token}` // Добавляем токен
        };
        console.log(`AuthFetch to ${url}: Method=${options.method || 'GET'}, Headers=`, headers); // Лог запроса
        try {
            const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            // Попытка получить JSON даже при ошибке (может содержать сообщение об ошибке)
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Если токен невалиден или истек, вызываем выход
                if (response.status === 401 || response.status === 422) {
                    console.error(`AuthFetch Error ${response.status} to ${url}, logging out.`);
                    onLogout(); // Выходим из системы
                    // Выбрасываем ошибку, чтобы остановить выполнение .then/.catch в вызывающей функции
                    throw new Error(data.error || data.message || data.msg || "Сессия недействительна. Выполнен выход.");
                }
                // Другие ошибки сервера
                throw new Error(data.error || data.message || data.msg || `Ошибка сервера ${response.status}`);
            }
            return data; // Возвращаем данные успешного ответа
        } catch (error) {
            console.error('AuthFetch failed:', error); // Логируем любую ошибку
            // Перебрасываем ошибку дальше, убедившись, что это объект Error
            throw (error instanceof Error ? error : new Error(error || 'Неизвестная ошибка сети'));
        }
    }, [token, onLogout]); // Зависимости: токен и функция выхода

    // --- Загрузка ВСЕХ стартапов (нужны для вкладки Стартапы и для формы вакансий) ---
    const fetchStartups = useCallback(() => {
        setLoading(true); // Используем общий индикатор загрузки
        setFetchError('');
        fetch('http://127.0.0.1:5000/startups') // Публичный эндпоинт
            .then(response => {
                if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
                return response.json();
            })
            .then(data => setStartups(data)) // Сохраняем полученные стартапы
            .catch(error => {
                console.error("Ошибка загрузки стартапов:", error);
                setFetchError(`Не удалось загрузить стартапы: ${error.message}`); // Сохраняем ошибку
            })
            .finally(() => setLoading(false)); // Выключаем индикатор загрузки
    }, []); // Нет внешних зависимостей

    // Загружаем стартапы один раз при монтировании AppContent
    useEffect(() => {
        fetchStartups();
        // Данные для других вкладок (митапы, вакансии) загружаются внутри их компонентов
    }, [fetchStartups]); // Зависимость от fetchStartups (стабильна из-за useCallback)

    // --- Обработчики действий для вкладки СТАРТАПЫ ---
    const handleSelectStartup = (startupId) => { setSelectedStartupId(startupId); setMessage(''); };

    const handleInvest = async () => {
        if (!selectedStartupId || !amount) return; // Проверка входных данных
        const investmentAmount = parseFloat(amount);
        if (isNaN(investmentAmount) || investmentAmount <= 0) {
            showMessage('Введите корректную положительную сумму', 'error');
            return;
        }
        setLoading(true); // Используем общий лоадер
        try {
            // Выполняем запрос на инвестирование через authFetch
            const data = await authFetch('/invest', {
                method: 'POST',
                body: JSON.stringify({
                    startup_id: parseInt(selectedStartupId),
                    amount: investmentAmount,
                    currency
                })
            });
            showMessage(data.message || 'Инвестиция прошла успешно!', 'success');
            setAmount(''); // Очищаем поле суммы
            fetchStartups(); // Обновляем список стартапов, чтобы увидеть изменения
        } catch (error) {
            showMessage(`Ошибка инвестирования: ${error.message}`, 'error'); // Показываем ошибку пользователю
        } finally {
            setLoading(false); // Выключаем индикатор загрузки
        }
    };

    const handleAddStartup = async (startupData) => {
        setLoading(true); // Используем общий лоадер
        try {
            // Выполняем запрос на добавление стартапа через authFetch
            const data = await authFetch('/startups', {
                method: 'POST',
                body: JSON.stringify(startupData)
            });
            showMessage(data.message || 'Стартап успешно добавлен!', 'success');
            fetchStartups(); // Обновляем список стартапов
            setShowAddStartupForm(false); // Скрываем форму добавления
        } catch (error) {
            showMessage(`Ошибка добавления стартапа: ${error.message}`, 'error'); // Показываем ошибку
        } finally {
            setLoading(false); // Выключаем индикатор загрузки
        }
    };

    // Фильтрация стартапов для строки поиска
    const filteredStartups = startups.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Поиск информации о выбранном стартапе (для формы инвестирования) в исходном списке
    const selectedStartupInfo = selectedStartupId ? startups.find(s => s.id === parseInt(selectedStartupId)) : null;

    // --- Начало JSX разметки AppContent ---
    return (
        <div className="app-container">
            {/* Шапка приложения */}
            <div className="app-header">
                 <h1>Инвестируйте в Будущее!</h1>
                 <div className="user-info">
                    {/* Отображение приветствия, имени и пометки (Админ) */}
                    <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span>
                    {/* Кнопка выхода */}
                    <button onClick={onLogout} className="logout-button">Выйти</button>
                 </div>
            </div>

            {/* Навигация по вкладкам */}
            <div className="tabs-navigation">
                <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}> Стартапы </button>
                <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}> Митапы </button>
                <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}> Вакансии </button>
            </div>

             {/* Отображение общей ошибки загрузки стартапов (если она есть) */}
             {fetchError && <p className="message error">{fetchError}</p>}
             {/* Отображение общих сообщений (например, от инвестиций) */}
             {message && <p className={`message ${messageType}`}>{message}</p>}


            {/* Условный рендеринг контента вкладок */}
            <div className="tab-content-area">

                {/* --- Содержимое вкладки СТАРТАПЫ --- */}
                {activeTab === 'startups' && (
                    <div className="startups-content">
                         {/* Поле поиска стартапов */}
                         <div className="search-container">
                            <input
                                type="text"
                                placeholder="Поиск по названию стартапа..."
                                className="search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={loading} // Блокируем во время загрузки
                            />
                         </div>

                         {/* Кнопка и форма добавления стартапа */}
                         {!showAddStartupForm && (
                             <button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loading}>
                                 + Добавить новый стартап
                             </button>
                         )}
                         {showAddStartupForm && (
                             <AddStartupForm
                                 onAdd={handleAddStartup}
                                 onCancel={() => setShowAddStartupForm(false)}
                                 isLoading={loading} // Передаем индикатор загрузки
                             />
                         )}

                         {/* Список карточек стартапов */}
                         <div className="startup-list card-list">
                             {/* Сообщения о состоянии загрузки/отсутствии результатов */}
                             {loading && startups.length === 0 && <p>Загрузка стартапов...</p>}
                             {!loading && startups.length === 0 && !fetchError && <p>Стартапов пока нет. Добавьте первый!</p>}
                             {!loading && startups.length > 0 && filteredStartups.length === 0 && (
                                 <p className="no-results-message">По вашему запросу "{searchQuery}" ничего не найдено.</p>
                             )}
                             {/* Рендер отфильтрованных карточек */}
                             {filteredStartups.map((startup) => (
                                 <StartupCard
                                     key={startup.id}
                                     startup={startup}
                                     isSelected={selectedStartupId === startup.id.toString()}
                                     onClick={() => !loading && handleSelectStartup(startup.id.toString())}
                                 />
                             ))}
                         </div>

                         {/* Форма инвестирования */}
                         <div className="investment-form">
                             <label htmlFor="amount">Сумма:</label>
                             <input id="amount" type='number' placeholder='0.00' value={amount} onChange={e => setAmount(e.target.value)} min="0" disabled={!selectedStartupId || loading} />
                             <label htmlFor="currency">Валюта:</label>
                             <select id="currency" value={currency} onChange={e => setCurrency(e.target.value)} disabled={!selectedStartupId || loading}>
                                 <option value='ETH'>ETH</option>
                                 <option value='BTC'>BTC</option>
                                 <option value='USDT'>USDT</option>
                             </select>
                             <button onClick={handleInvest} disabled={!selectedStartupId || !amount || loading}>
                                 {loading ? 'Обработка...' : 'Инвестировать'}
                             </button>
                             {selectedStartupInfo && (<div className="selected-startup-info"> Выбрано: <span>{selectedStartupInfo.name}</span> </div>)}
                         </div>
                    </div>
                )} {/* Конец вкладки Стартапы */}

                {/* --- Содержимое вкладки МИТАПЫ --- */}
                {activeTab === 'meetups' && (
                    <MeetupsTabContent
                        token={token}
                        isAdmin={isAdmin}
                        authFetch={authFetch} // Передаем функцию для запросов
                    />
                )} {/* Конец вкладки Митапы */}

                {/* --- Содержимое вкладки ВАКАНСИИ --- */}
                {activeTab === 'vacancies' && (
                    <VacanciesTabContent
                        token={token}
                        username={username}
                        userId={userId} // ID текущего пользователя
                        userRole={userRole}
                        authFetch={authFetch} // Функция для запросов
                        allStartups={startups} // Весь список стартапов для формы
                    />
                )} {/* Конец вкладки Вакансии */}

            </div> {/* Конец tab-content-area */}

        </div> // Конец app-container
    );
} // Конец AppContent


// --- Компонент верхнего уровня App ---
function App() {
    // Состояния для данных аутентификации
    const [token, setToken] = useState(localStorage.getItem('jwtToken'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
    const [userId, setUserId] = useState(localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId'), 10) : null); // Храним и читаем ID

    // Функция при успешном входе
    const handleLoginSuccess = (newToken, loggedInUsername, loggedInUserRole) => {
        localStorage.setItem('jwtToken', newToken);
        localStorage.setItem('username', loggedInUsername);
        localStorage.setItem('userRole', loggedInUserRole);

        try {
            // Декодируем токен, чтобы получить ID пользователя ('sub' claim)
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            const loggedInUserId = payload.sub; // 'sub' содержит identity (ID как строку)
            if (loggedInUserId) {
                 localStorage.setItem('userId', loggedInUserId); // Сохраняем строковый ID
                 setUserId(parseInt(loggedInUserId, 10)); // Устанавливаем числовой ID в состояние
            } else {
                console.error("Не удалось извлечь ID пользователя (sub) из токена.");
                 handleLogout(); // Разлогиниваем, если ID не найден
                 return;
            }
        } catch (error) {
             console.error("Ошибка декодирования токена или извлечения ID:", error);
             handleLogout(); // Разлогиниваем при ошибке
             return;
        }

        // Устанавливаем остальные состояния
        setToken(newToken);
        setUsername(loggedInUsername);
        setUserRole(loggedInUserRole);
    };

    // Функция выхода (используем useCallback для стабильной ссылки)
    const handleLogout = useCallback(() => {
        // Очищаем localStorage
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        // Сбрасываем состояния
        setToken(null);
        setUsername(null);
        setUserRole(null);
        setUserId(null);
    }, []); // Нет зависимостей

    // Эффект для проверки данных в localStorage при загрузке приложения
    useEffect(() => {
        const storedToken = localStorage.getItem('jwtToken');
        const storedUsername = localStorage.getItem('username');
        const storedUserRole = localStorage.getItem('userRole');
        const storedUserIdStr = localStorage.getItem('userId');

        // Если все данные есть в localStorage
        if (storedToken && storedUsername && storedUserRole && storedUserIdStr) {
            // Опционально: добавить здесь проверку валидности токена на бэкенде
            // fetch('http://127.0.0.1:5000/profile', { headers: { Authorization: `Bearer ${storedToken}` }})
            // .then(res => { if (!res.ok) handleLogout(); }) // Разлогинить, если токен невалиден
            // .catch(handleLogout);

            // Устанавливаем состояния из localStorage
            setToken(storedToken);
            setUsername(storedUsername);
            setUserRole(storedUserRole);
            setUserId(parseInt(storedUserIdStr, 10));
        } else if (token || username || userRole || userId !== null) {
            // Если в состоянии что-то есть, а в localStorage не все данные - разлогиниваем для консистентности
             handleLogout();
        }
        // Этот эффект должен запускаться только один раз при монтировании, но
        // добавление handleLogout и текущих состояний в зависимости помогает избежать предупреждений линтера
        // и гарантирует правильное поведение при редких сценариях изменения handleLogout.
    }, [handleLogout, token, username, userRole, userId]);


    // Рендер либо компонента аутентификации, либо основного контента приложения
    return (
        <div>
            {token && username && userRole && userId !== null ? ( // Показываем контент, только если ВСЕ данные аутентификации есть
                <AppContent
                    token={token}
                    username={username}
                    userId={userId} // Передаем ID пользователя
                    userRole={userRole}
                    onLogout={handleLogout} // Передаем функцию выхода
                />
            ) : (
                // Показываем форму входа/регистрации
                <Auth onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}

export default App; // Экспортируем основной компонент приложения
