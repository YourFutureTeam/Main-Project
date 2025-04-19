// src/App.js
import React, { useState, useEffect } from 'react';
import StartupCard from './StartupCard';
import './App.css';

// --- Компонент формы добавления стартапа ---
function AddStartupForm({ onAdd, onCancel }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault(); // Предотвращаем перезагрузку страницы
        if (!name.trim() || !description.trim()) {
            alert('Пожалуйста, заполните имя и описание стартапа.');
            return;
        }
        onAdd({ name, description }); // Вызываем колбэк добавления
        setName(''); // Очищаем поля
        setDescription('');
    };

    return (
        <form onSubmit={handleSubmit} className="add-startup-form">
            <h3>Добавить новый стартап</h3>
            <input
                type="text"
                placeholder="Название стартапа"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            <textarea
                placeholder="Краткое описание"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
            />
            <div className="form-buttons">
                <button type="submit">Добавить стартап</button>
                <button type="button" onClick={onCancel} className="cancel-button">Отмена</button>
            </div>
        </form>
    );
}


// --- Основной компонент приложения ---
function App() {
  // Используем массив для стартапов, т.к. бэкенд теперь возвращает список
  const [startups, setStartups] = useState([]);
  const [selectedStartupId, setSelectedStartupId] = useState(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ETH');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' или 'error'
  const [showAddForm, setShowAddForm] = useState(false); // Состояние для показа формы добавления

  // Функция для отображения сообщений
  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => { setMessage(''); setMessageType(''); }, 5000);
  };

  // Загрузка списка стартапов
  const fetchStartups = () => {
    // Указываем полный URL, так как убрали proxy из package.json
    fetch('http://127.0.0.1:5000/startups')
      .then(response => {
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        return response.json();
      })
      .then(data => setStartups(data)) // data теперь массив
      .catch(error => showMessage(`Ошибка загрузки стартапов: ${error.message}`, 'error'));
  };

  // Загружаем стартапы при первом рендере
  useEffect(() => {
    fetchStartups();
  }, []);

  // Обработчик выбора стартапа
  const handleSelectStartup = (startupId) => {
    setSelectedStartupId(startupId);
    setMessage('');
  };

  // Обработчик инвестирования
  const handleInvest = () => {
    // ... (логика валидации остается прежней) ...
     if (!selectedStartupId) {
      showMessage('Пожалуйста, выберите стартап, кликнув на его карточку', 'error');
      return;
    }
    if (!amount) {
        showMessage('Пожалуйста, введите сумму инвестиции', 'error');
      return;
    }
    const investmentAmount = parseFloat(amount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      showMessage('Пожалуйста, введите корректную положительную сумму инвестиции', 'error');
      return;
    }

    // Отправляем POST-запрос на инвестирование
    fetch('http://127.0.0.1:5000/invest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startup_id: parseInt(selectedStartupId), // Убедимся что ID это число
        amount: investmentAmount,
        currency
      })
    })
      .then(response => response.json().then(data => ({ status: response.status, body: data })))
      .then(({ status, body }) => {
        if (status >= 400) { throw new Error(body.error || `Ошибка сервера ${status}`); }

        // Обновляем состояние *локально* или перезапрашиваем все стартапы
        // Проще перезапросить для синхронизации
        fetchStartups();
        showMessage(`Инвестиция в стартап #${selectedStartupId} на сумму ${investmentAmount} ${currency} прошла успешно!`, 'success');
        setAmount(''); // Очистка поля суммы
        // Можно сбросить выбор стартапа после инвестиции, если нужно
        // setSelectedStartupId(null);
      })
      .catch(error => showMessage(`Ошибка инвестирования: ${error.message}`, 'error'));
  };

  // Обработчик добавления нового стартапа
  const handleAddStartup = (startupData) => {
    fetch('http://127.0.0.1:5000/startups', { // POST запрос на /startups
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startupData) // Отправляем name и description
    })
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(({ status, body }) => {
        if (status >= 400) { throw new Error(body.error || `Ошибка сервера ${status}`); }

        showMessage(body.message || 'Стартап успешно добавлен!', 'success');
        fetchStartups(); // Перезагружаем список стартапов
        setShowAddForm(false); // Скрываем форму после успеха
    })
    .catch(error => showMessage(`Ошибка добавления стартапа: ${error.message}`, 'error'));
  };


  // Получаем информацию о выбранном стартапе из массива
  const selectedStartupInfo = selectedStartupId
        ? startups.find(s => s.id === parseInt(selectedStartupId)) // Ищем по id в массиве
        : null;

  return (
    <div className="app-container">
      <h1>Инвестируйте в Будущее с Криптовалютой</h1>

      {/* Кнопка и форма добавления стартапа */}
      {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="add-startup-button">
              + Добавить новый стартап
          </button>
      )}
      {showAddForm && (
          <AddStartupForm
              onAdd={handleAddStartup}
              onCancel={() => setShowAddForm(false)}
          />
      )}


      {/* Список карточек стартапов */}
      <div className="startup-list">
        {/* startups теперь массив, итерируемся по нему */}
        {startups.map((startup) => (
          <StartupCard
            key={startup.id} // Используем ID из данных стартапа
            startup={startup}
            isSelected={selectedStartupId === startup.id.toString()} // Сравниваем ID (приводим к строке на всякий случай)
            onClick={() => handleSelectStartup(startup.id.toString())} // Передаем ID как строку или число
          />
        ))}
      </div>

      {/* Форма для инвестирования */}
      <div className="investment-form">
        <label htmlFor="amount">Сумма:</label>
        <input
          id="amount" type='number' placeholder='0.00' value={amount}
          onChange={e => setAmount(e.target.value)} min="0"
          disabled={!selectedStartupId}
        />
        <label htmlFor="currency">Валюта:</label>
        <select id="currency" value={currency} onChange={e => setCurrency(e.target.value)} disabled={!selectedStartupId}>
          <option value='ETH'>ETH</option>
          <option value='BTC'>BTC</option>
          <option value='USDT'>USDT</option>
        </select>
        <button onClick={handleInvest} disabled={!selectedStartupId || !amount}>Инвестировать</button>
        {selectedStartupInfo && (
          <div className="selected-startup-info">
            Выбрано: <span>{selectedStartupInfo.name}</span>
          </div>
        )}
      </div>

      {/* Сообщения */}
      {message && <p className={`message ${messageType}`}>{message}</p>}
    </div>
  );
}

export default App;

