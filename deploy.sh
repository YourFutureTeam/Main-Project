#!/bin/bash

# Скрипт для деплоя проекта YourFuture

# Переходим в директорию проекта
cd "$(dirname "$0")"

echo "======== Начинаем деплой ========"

# Проверяем наличие переменных окружения
if [ ! -f .env ]; then
    echo "Ошибка: файл .env не найден"
    exit 1
fi

# Подготовка фронтенда
echo "Устанавливаем зависимости React..."
npm install

echo "Собираем React приложение..."
npm run build

# Подготовка бэкенда
echo "Устанавливаем зависимости Python..."
pip install -r requirements.txt

# Создадим requirements.txt если его нет
if [ ! -f requirements.txt ]; then
    echo "Flask==2.0.1
    SQLAlchemy==1.4.23
    python-dotenv==0.19.0
    gunicorn==20.1.0" > requirements.txt
    echo "Создан файл requirements.txt с базовыми зависимостями"
fi

# Копирование файлов на сервер
# Замените user@your-server-ip на фактические данные вашего сервера
echo "Копируем файлы на сервер..."
echo "Раскомментируйте следующие строки и укажите данные вашего сервера:"
# scp -r build user@your-server-ip:/var/www/yourfuture/
# scp -r main.py requirements.txt .env user@your-server-ip:/var/www/yourfuture/

echo "======== Деплой завершен ========"
echo "Для завершения настройки на сервере выполните:"
echo "1. sudo ln -s /etc/nginx/sites-available/yourfuture.conf /etc/nginx/sites-enabled/"
echo "2. sudo systemctl restart nginx"
echo "3. sudo certbot --nginx -d yourfuture.example.com"
echo "4. cd /var/www/yourfuture && pm2 start main.py --interpreter python3 --name yourfuture-backend"