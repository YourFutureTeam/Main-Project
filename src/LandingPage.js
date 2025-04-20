// src/LandingPage.js

import React, { useState } from 'react';
import { Auth } from './Auth'; // Импортируем компонент с формами
import './App.css'; // Импортируем общие стили

function LandingPage({ onLoginSuccess }) {
  // Состояние для отображения формы: null (скрыто), 'login' или 'register'
  const [authMode, setAuthMode] = useState(null);

  const showLogin = () => setAuthMode('login');
  const showRegister = () => setAuthMode('register');
  const hideAuth = () => setAuthMode(null); // Функция для кнопки "Назад"

  return (
    <div className="landing-page-container">

      {/* Показываем приветствие и кнопки, если authMode не установлен */}
      {!authMode && (
        <>
          <div className="landing-hero">
            <h1>Добро пожаловать в YourFuture!</h1>
            <p className="landing-subtitle">
              Ваша стартовая площадка для инноваций и инвестиций в мире Web3.
            </p>
            <p>
              Мы создали экосистему, где амбициозные стартапы находят поддержку,
              инвесторы открывают прорывные проекты, а талантливые специалисты
              присоединяются к командам будущего. От идеи до глобального масштаба —
              ваш путь начинается здесь.
            </p>
          </div>

          <div className="landing-features">
            <h2>Ключевые возможности платформы:</h2>
            <ul>
              <li>
                🚀 <strong>Витрина стартапов:</strong> Изучайте проекты на разных стадиях — от концепта и MVP до масштабирования. Оценивайте потенциал и следите за развитием.
              </li>
              <li>
                🗺️ <strong>Дорожные карты:</strong> Прозрачное отслеживание прогресса стартапов. Узнайте их планы и ключевые вехи достижения целей.
              </li>
              <li>
                🤝 <strong>Сообщество и нетворкинг:</strong> Связывайтесь напрямую с основателями, инвесторами и экспертами. Обсуждайте идеи и находите партнеров.
              </li>
              <li>
                💼 <strong>Карьера и таланты:</strong> Открытые вакансии в перспективных Web3-проектах. Найдите работу мечты или опубликуйте вакансию для своего стартапа.
              </li>
              <li>
                🗓️ <strong>Митапы и события:</strong> Будьте в курсе актуальных онлайн и офлайн мероприятий индустрии. Делитесь опытом и знаниями.
              </li>
              <li>
                💰 <strong>Инвестиции:</strong> Механизмы для поддержки понравившихся проектов на ранних стадиях.
              </li>
            </ul>
          </div>

          <hr className="landing-divider" />

          {/* Кнопки входа и регистрации */}
          <div className="landing-actions">
            <h2>Присоединяйтесь к экосистеме!</h2>
            <p>Войдите в свой аккаунт или создайте новый, чтобы получить доступ ко всем возможностям платформы.</p>
            <div className="landing-buttons">
              <button onClick={showLogin} className="btn btn-primary landing-btn">Войти</button>
              <button onClick={showRegister} className="btn btn-secondary landing-btn">Зарегистрироваться</button>
            </div>
          </div>
        </>
      )}

      {/* Показываем форму Auth, если authMode установлен */}
      {authMode && (
        <div className="landing-auth-section">
           {/* Кнопка "Назад" */}
           <button onClick={hideAuth} className="btn-back">
             &larr; Назад к описанию
           </button>
          <h2>{authMode === 'login' ? 'Вход в аккаунт' : 'Создание аккаунта'}</h2>
          {/* Передаем initialMode в Auth, чтобы он знал, какую форму показать */}
          <Auth onLoginSuccess={onLoginSuccess} initialMode={authMode} />
        </div>
      )}

    </div>
  );
}

export default LandingPage;
