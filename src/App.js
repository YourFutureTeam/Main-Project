// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import StartupCard from './StartupCard';
import { Auth } from './Auth'; // Импортируем компонент аутентификации
import './App.css'; // Основные стили остаются

// --- Компонент формы добавления стартапа (без изменений) ---
function AddStartupForm({ onAdd, onCancel, isLoading }) {
    // ... (код AddStartupForm без изменений, можно добавить isLoading для кнопки) ...
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !description.trim()) {
            alert('Пожалуйста, заполните имя и описание стартапа.');
            return;
        }
        onAdd({ name, description });
        setName('');
        setDescription('');
    };

    return (
        <form onSubmit={handleSubmit} className="add-startup-form">
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

// --- Основное содержимое приложения (когда пользователь вошел) ---
function AppContent({ token, username, onLogout }) {
  const [startups, setStartups] = useState([]);
  const [selectedStartupId, setSelectedStartupId] = useState(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ETH');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false); // Общий индикатор загрузки для действий
  const [fetchError, setFetchError] = useState(''); // Ошибка загрузки стартапов
  // ---> ДОБАВЛЕНО: Состояние для поискового запроса <---
  const [searchQuery, setSearchQuery] = useState('');

  const showMessage = (text, type) => {
      setMessage(text);
      setMessageType(type);
      setTimeout(() => { setMessage(''); setMessageType(''); }, 5000);
  };

   // --- Обертка для fetch с добавлением токена ---
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}` // Токен должен быть здесь
    };

    console.log(`AuthFetch to ${url}: Method=${options.method || 'GET'}, Headers=`, headers);

    try {
        const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401 || response.status === 422) {
                console.error(`AuthFetch Error ${response.status} to ${url}, logging out.`);
                onLogout();
                throw new Error(data.error || data.message || data.msg || "Сессия недействительна. Выполнен выход.");
            }
            throw new Error(data.error || data.message || data.msg || `Ошибка сервера ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error('AuthFetch failed:', error);
        throw (error instanceof Error ? error : new Error(error || 'Неизвестная ошибка сети'));
    }

  }, [token, onLogout]);


  // Загрузка списка стартапов
  const fetchStartups = useCallback(() => {
      setLoading(true);
      setFetchError('');
      fetch('http://127.0.0.1:5000/startups')
        .then(response => {
          if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
          return response.json();
        })
        .then(data => setStartups(data))
        .catch(error => {
            console.error("Ошибка загрузки стартапов:", error);
            setFetchError(`Не удалось загрузить стартапы: ${error.message}`);
        })
        .finally(() => setLoading(false));
    }, []); // Зависимости не нужны, если fetch URL статичен

  useEffect(() => {
      fetchStartups();
  }, [fetchStartups]);

  const handleSelectStartup = (startupId) => {
      setSelectedStartupId(startupId);
      setMessage('');
  };

  // Обработчик инвестирования (использует authFetch)
  const handleInvest = async () => {
      if (!selectedStartupId || !amount) return;
      const investmentAmount = parseFloat(amount);
       if (isNaN(investmentAmount) || investmentAmount <= 0) {
          showMessage('Введите корректную положительную сумму', 'error');
          return;
       }

      setLoading(true);
      try {
          const data = await authFetch('/invest', {
              method: 'POST',
              body: JSON.stringify({
                  startup_id: parseInt(selectedStartupId),
                  amount: investmentAmount,
                  currency
              })
          });
          showMessage(data.message || 'Инвестиция прошла успешно!', 'success');
          setAmount('');
          fetchStartups(); // Обновляем список
      } catch (error) {
          showMessage(`Ошибка инвестирования: ${error.message}`, 'error');
      } finally {
          setLoading(false);
      }
  };

  // Обработчик добавления стартапа (использует authFetch)
  const handleAddStartup = async (startupData) => {
      setLoading(true);
      try {
          const data = await authFetch('/startups', {
              method: 'POST',
              body: JSON.stringify(startupData)
          });
          showMessage(data.message || 'Стартап успешно добавлен!', 'success');
          fetchStartups(); // Обновляем список
          setShowAddForm(false); // Скрываем форму
      } catch (error) {
          showMessage(`Ошибка добавления стартапа: ${error.message}`, 'error');
      } finally {
          setLoading(false);
      }
  };

  // ---> ДОБАВЛЕНО: Логика фильтрации стартапов <---
  const filteredStartups = startups.filter(startup =>
      startup.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ищем выбранный стартап в *исходном* массиве, чтобы инфо не пропадало при фильтрации
  const selectedStartupInfo = selectedStartupId
      ? startups.find(s => s.id === parseInt(selectedStartupId))
      : null;


  // --- Начало JSX разметки ---
  return (
      <div className="app-container">
          {/* Шапка приложения */}
          <div className="app-header">
               <h1>Инвестируйте в Будущее!</h1>
               <div className="user-info">
                  <span className="user-greeting">Привет, <span>{username}!</span></span>
                  <button onClick={onLogout} className="logout-button">Выйти</button>
               </div>
          </div>

          {/* Сообщение об ошибке загрузки */}
          {fetchError && <p className="message error">{fetchError}</p>}

          {/* Кнопка и форма добавления стартапа */}
          {!showAddForm && (
              <button onClick={() => setShowAddForm(true)} className="add-startup-button" disabled={loading}>
                  + Добавить новый стартап
              </button>
          )}
          {showAddForm && (
              // Предполагается, что компонент AddStartupForm определен выше или импортирован
              <AddStartupForm
                  onAdd={handleAddStartup}
                  onCancel={() => setShowAddForm(false)}
                  isLoading={loading}
              />
          )}

          {/* ---> ДОБАВЛЕНО: Поле для поиска <--- */}
          <div className="search-container">
              <input
                  type="text"
                  placeholder="Поиск по названию стартапа..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
              />
          </div>


          {/* Список карточек стартапов */}
          <div className="startup-list">
              {/* Улучшенная логика отображения сообщений */}
              {loading && startups.length === 0 && <p>Загрузка стартапов...</p>}
              {!loading && startups.length === 0 && !fetchError && <p>Стартапов пока нет. Добавьте первый!</p>}
              {!loading && startups.length > 0 && filteredStartups.length === 0 && (
                  <p className="no-results-message">По вашему запросу "{searchQuery}" ничего не найдено.</p>
              )}

              {/* Рендерим отфильтрованные стартапы */}
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
              <input
                  id="amount" type='number' placeholder='0.00' value={amount}
                  onChange={e => setAmount(e.target.value)} min="0"
                  disabled={!selectedStartupId || loading}
              />
              <label htmlFor="currency">Валюта:</label>
              <select id="currency" value={currency} onChange={e => setCurrency(e.target.value)} disabled={!selectedStartupId || loading}>
                  <option value='ETH'>ETH</option>
                  <option value='BTC'>BTC</option>
                  <option value='USDT'>USDT</option>
              </select>
              <button onClick={handleInvest} disabled={!selectedStartupId || !amount || loading}>
                  {loading ? 'Обработка...' : 'Инвестировать'}
              </button>
              {selectedStartupInfo && (
                  <div className="selected-startup-info">
                      Выбрано: <span>{selectedStartupInfo.name}</span>
                  </div>
              )}
          </div>

          {/* Сообщения для пользователя */}
          {message && <p className={`message ${messageType}`}>{message}</p>}
      </div>
  );
}


// --- Компонент верхнего уровня ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('jwtToken'));
    const [username, setUsername] = useState(localStorage.getItem('username'));

    // Функция для сохранения токена и имени пользователя
    const handleLoginSuccess = (newToken, loggedInUsername) => {
        localStorage.setItem('jwtToken', newToken);
        localStorage.setItem('username', loggedInUsername);
        setToken(newToken);
        setUsername(loggedInUsername);
    };

    // Функция для выхода
    const handleLogout = useCallback(() => { // Используем useCallback для стабильности ссылки
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        setToken(null);
        setUsername(null);
    }, []); // Пустой массив зависимостей

    // Проверка токена при загрузке (можно добавить запрос к /profile на бэкенде для валидации)
    useEffect(() => {
        const storedToken = localStorage.getItem('jwtToken');
        const storedUsername = localStorage.getItem('username');
        if (storedToken && storedUsername) {
            // Тут можно добавить проверку токена на бэкенде, если нужно
            // fetch('http://127.0.0.1:5000/profile', { headers: { Authorization: `Bearer ${storedToken}` }})
            // .then(res => { if (!res.ok) handleLogout(); })
            // .catch(handleLogout);
            setToken(storedToken);
            setUsername(storedUsername);
        }
    }, [handleLogout]); // Добавляем handleLogout в зависимости

    return (
        <div>
            {token ? (
                <AppContent token={token} username={username} onLogout={handleLogout} />
            ) : (
                <Auth onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}

export default App;
