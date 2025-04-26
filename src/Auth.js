import React, { useState, useEffect } from 'react';
// ... другие импорты

// Важно! Используем полный URL API-сервера на порту 5000
const API_BASE_URL = 'https://ur-future.ru:5000'; // URL вашего сервера с портом Python-бэкенда

export function Auth({ onLoginSuccess, initialMode = 'login' }) {
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

    console.log(`Отправка запроса на: ${API_BASE_URL}${endpoint}`);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'cors',  // Явно указываем режим CORS
        });
        
        // Для отладки
        console.log('Статус ответа:', response.status);
        
        // Получаем текст ответа для анализа
        const textResponse = await response.text();
        console.log('Текст ответа:', textResponse);
        
        // Пытаемся преобразовать в JSON
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (e) {
            throw new Error(`Сервер вернул некорректный формат (${response.status}): ${textResponse.substring(0, 100)}...`);
        }

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
        console.error('Ошибка:', err);
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