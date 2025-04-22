# YourFuture Project

## О проекте
YourFuture - это платформа для встреч, вакансий и стартапов.

## Установка и запуск для разработки

### Требования
- Node.js версии 14 или выше
- Python 3.8 или выше
- SQLite

### Шаги для локального запуска
1. Клонируйте репозиторий:
   ```
   git clone https://github.com/yourusername/yourfuture.git
   cd yourfuture
   ```

2. Установите зависимости фронтенда:
   ```
   npm install
   ```

3. Установите зависимости бэкенда:
   ```
   pip install -r requirements.txt
   ```

4. Создайте файл `.env` с переменными окружения (см. пример в `.env.example`)

5. Запустите бэкенд:
   ```
   python main.py
   ```

6. В отдельном терминале запустите фронтенд:
   ```
   npm start
   ```

7. Откройте браузер по адресу `http://localhost:3000`

## Деплой на сервер

### Шаг 1: Подготовка проекта
1. Создайте оптимизированную сборку:
   ```
   npm run build
   ```

2. Убедитесь, что файл `.env` настроен для продакшена

### Шаг 2: Настройка сервера
1. Арендуйте VPS у провайдера (DigitalOcean, AWS, Linode)
2. Установите необходимое ПО:
   ```
   sudo apt update
   sudo apt install nginx nodejs npm python3 python3-pip
   sudo pip3 install pm2
   ```

3. Настройте Nginx:
   - Скопируйте файл `yourfuture.conf` в `/etc/nginx/sites-available/`
   - Создайте символическую ссылку:
     ```
     sudo ln -s /etc/nginx/sites-available/yourfuture.conf /etc/nginx/sites-enabled/
     ```
   - Перезапустите Nginx:
     ```
     sudo systemctl restart nginx
     ```

4. Настройте SSL с Let's Encrypt:
   ```
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourfuture.example.com
   ```

### Шаг 3: Деплой приложения
1. Создайте директорию для проекта:
   ```
   sudo mkdir -p /var/www/yourfuture
   sudo chown -R $USER:$USER /var/www/yourfuture
   ```

2. Используйте скрипт `deploy.sh` для автоматизации деплоя или выполните шаги вручную:
   ```
   ./deploy.sh
   ```

3. Запустите приложение на сервере:
   ```
   cd /var/www/yourfuture
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## Дополнительная информация
- Для обновления: выполните `./deploy.sh` после внесения изменений в код
- Для мониторинга: используйте `pm2 monit` на сервере
