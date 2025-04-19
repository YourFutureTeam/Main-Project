// src/Auth.js
import React, { useState } from 'react';

// Стили можно вынести в Auth.css или добавить в App.css
const authStyles = `
.auth-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  text-align: center;
}
.auth-container h2 {
  margin-bottom: 25px;
  color: #2c3e50;
}
.auth-form input {
  display: block;
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1em;
}
.auth-form button {
  width: 100%;
  padding: 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1em;
  transition: background-color 0.2s ease;
  margin-bottom: 15px; /* Отступ снизу кнопки */
}
.auth-form button:hover {
  background-color: #2980b9;
}
.auth-switch {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  padding: 5px;
  font-size: 0.95em;
}
.auth-switch:hover {
  text-decoration: underline;
}
.auth-error {
    color: #e74c3c;
    margin-bottom: 15px;
    font-size: 0.9em;
}
.welcome-message {
    font-size: 1.1em;
    color: #555;
    margin-bottom: 20px;
    line-height: 1.5;
}
`;

export function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin ? '/login' : '/register';
    try {
      const response = await fetch(`http://127.0.0.1:5000${url}`, { // Полный URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Ошибка ${response.status}`);
      }

      if (isLogin) {
        // Успешный вход - вызываем колбэк и передаем токен и имя
        onLoginSuccess(data.access_token, data.username, data.role);
      } else {
        // Успешная регистрация - переключаем на форму входа
        setIsLogin(true);
        alert('Регистрация прошла успешно! Теперь вы можете войти.'); // Простое уведомление
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Инлайновые стили или подключить CSS файл */}
      <style>{authStyles}</style>
      <div className="auth-container">
        {/* Приветственное сообщение */}
        {!isLogin && ( // Показываем только на экране регистрации для краткости, можно и на логине
             <p className="welcome-message">
               Добро пожаловать! Зарегистрируйтесь, чтобы добавлять свои стартапы и инвестировать в будущее.
            </p>
        )}
         {isLogin && (
             <p className="welcome-message">
               Войдите, чтобы получить доступ к платформе, или зарегистрируйтесь, если у вас еще нет аккаунта.
            </p>
        )}

        <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
        <form onSubmit={handleAuth} className="auth-form">
          <input
            type="text"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
           {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Обработка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
        <button onClick={() => {setIsLogin(!isLogin); setError('');}} className="auth-switch" disabled={loading}>
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </>
  );
}
