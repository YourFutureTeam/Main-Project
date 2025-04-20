// src/Auth.js (Примерная структура - добавлены initialMode)

import React, { useState, useEffect } from 'react';
// ... другие импорты

export function Auth({ onLoginSuccess, initialMode = 'login' }) { // Принимаем initialMode
  // Устанавливаем начальное состояние формы на основе initialMode
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Сбрасываем ошибку при переключении режима
  useEffect(() => {
    setError('');
  }, [isLogin]);

  // Обработчик отправки формы (адаптируется под isLogin)
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const endpoint = isLogin ? '/login' : '/register';
    const payload = { username, password };

    try {
        const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Ошибка ${isLogin ? 'входа' : 'регистрации'}`);
        }

        if (isLogin) {
            // При успешном ЛОГИНЕ вызываем onLoginSuccess с токеном и данными
            if (data.access_token && data.username && data.role) {
                 onLoginSuccess(data.access_token, data.username, data.role);
            } else {
                throw new Error('Неполные данные от сервера при входе');
            }
        } else {
            // При успешной РЕГИСТРАЦИИ можно предложить войти
            alert(data.message || 'Регистрация успешна! Теперь вы можете войти.');
            setIsLogin(true); // Переключаем на форму входа
            // Не вызываем onLoginSuccess при регистрации
        }
    } catch (err) {
        setError(err.message);
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {error && <p className="message error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Имя пользователя"
          required
          disabled={loading}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          required
          minLength={isLogin ? undefined : 4} // Проверка длины только при регистрации
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? '...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
        </button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} className="switch-auth-mode" disabled={loading}>
        {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
      </button>
    </div>
  );
}
