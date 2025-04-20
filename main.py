# main.py (ПОЛНЫЙ КОД - Учет is_held в вакансиях + ИСПРАВЛЕНО ФОРМАТИРОВАНИЕ)

import os
import re
from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from flask_jwt_extended import (JWTManager, create_access_token,
                                get_jwt_identity, jwt_required)
from werkzeug.security import check_password_hash, generate_password_hash

# 1. Flask App
app = Flask(__name__)

# 2. CORS
CORS(app)

# 3. JWT Config
app.config["JWT_SECRET_KEY"] = os.environ.get(
    "JWT_SECRET_KEY", "a-very-strong-secret-key-for-dev-only-FINAL-FINAL-v13"
)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
jwt = JWTManager(app)

# 4. JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    print("JWT Error: Expired token")
    return jsonify(error="Токен доступа истек"), 401

@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    print(f"JWT Error: Invalid token - {error_string}")
    return jsonify(error=f"Недействительный токен: {error_string}"), 422

@jwt.unauthorized_loader
def missing_token_callback(error_string):
    print(f"JWT Error: Missing token - {error_string}")
    return jsonify(error=f"Отсутствует заголовок авторизации или токен: {error_string}"), 401

@jwt.needs_fresh_token_loader
def token_not_fresh_callback(jwt_header, jwt_payload):
    print("JWT Error: Fresh token required")
    return jsonify(error="Требуется свежий токен доступа"), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    print("JWT Error: Revoked token")
    return jsonify(error="Токен был отозван"), 401

# 5. Этапы
ALLOWED_STAGES = ['idea', 'mvp', 'pmf', 'scaling', 'established']
def get_stage_order(stage_key):
    try:
        return ALLOWED_STAGES.index(stage_key)
    except ValueError:
        return -1

# 6. Data Stores
users = {}
startups = {
    1: {"id": 1, "name": "ТехноИнновации Альфа (Одобрено)", "description": "ИИ.", "funds_raised": {"ETH": 10.5}, "opensea_link": "https://...", "status": "approved", "rejection_reason": None, "creator_user_id": 0, "current_stage": "pmf", "stage_timeline": {"scaling": "2025-12-31", "established": None}, "is_held": False},
    2: {"id": 2, "name": "ЭкоСтарт (В ожидании)", "description": "Зелень.", "funds_raised": {"USDT": 500}, "opensea_link": "https://...", "status": "pending", "rejection_reason": None, "creator_user_id": 1, "current_stage": "idea", "stage_timeline": {"mvp": "2025-08-01", "pmf": None, "scaling": None, "established": None}, "is_held": False},
    3: {"id": 3, "name": "ГеймДев (Отклонено)", "description": "Игры.", "funds_raised": {"BTC": 1, "ETH": 5}, "opensea_link": "https://...", "status": "rejected", "rejection_reason": "Описание", "creator_user_id": 1, "current_stage": "mvp", "stage_timeline": {"pmf": None, "scaling": None, "established": None}, "is_held": False},
    4: {"id": 4, "name": "Финтех (Одобрено, Приостановлен)", "description": "Платежи.", "funds_raised": {"BTC": 0.5}, "opensea_link": "https://...", "status": "approved", "rejection_reason": None, "creator_user_id": 2, "current_stage": "scaling", "stage_timeline": {"established": "2026-06-30"}, "is_held": True}
}
meetups = {
    1: {"id": 1, "title": "AI Митап (Одобрено)", "date": "...", "description": "...", "link": "...", "status": "approved", "rejection_reason": None, "creator_user_id": 0},
    2: {"id": 2, "title": "Инди-Игры (Ожидает)", "date": "...", "description": "...", "link": "...", "status": "pending", "rejection_reason": None, "creator_user_id": 1},
    3: {"id": 3, "title": "Крипто (Отклонено)", "date": "...", "description": "...", "link": "...", "status": "rejected", "rejection_reason": "Не по теме", "creator_user_id": 1}
}
vacancies = {
    1: {"id": 1, "startup_id": 1, "title": "Python Dev (Одобрена)", "description": "...", "salary": "...", "requirements": "...", "applicants": [], "status": "approved", "rejection_reason": None, "creator_user_id": 0},
    2: {"id": 2, "startup_id": 4, "title": "Frontend Dev (Ожидает)", "description": "React...", "salary": "...", "requirements": "...", "applicants": [], "status": "pending", "rejection_reason": None, "creator_user_id": 2},
    3: {"id": 3, "startup_id": 1, "title": "ML Engineer (Ожидает)", "description": "...", "salary": "...", "requirements": "...", "applicants": [], "status": "pending", "rejection_reason": None, "creator_user_id": 0},
}

# ---> НОВОЕ ХРАНИЛИЩЕ УВЕДОМЛЕНИЙ <---
user_notifications = {
    1: {"id": 1, "user_id": 1, "admin_id": 0, "message": "Добро пожаловать на платформу! Пожалуйста, заполните ваш профиль.", "timestamp": "2025-04-20T10:00:00", "is_read": False},
    2: {"id": 2, "user_id": 1, "admin_id": 0, "message": "Ваш стартап 'ЭкоСтарт' требует дополнительной информации.", "timestamp": "2025-04-21T11:30:00", "is_read": False},
    3: {"id": 3, "user_id": 2, "admin_id": 0, "message": "Напоминаем о необходимости провести квартальный митап по стартапу 'Финтех'.", "timestamp": "2025-04-21T12:00:00", "is_read": True}, # Пример прочитанного
}
next_notification_id = 4
# ---> КОНЕЦ НОВОГО ХРАНИЛИЩА <---

next_startup_id = 5
next_user_id = 1
next_meetup_id = 4
next_vacancy_id = 4

# 7. Create Users
admin_username = "admin"
admin_password = "verysecretadminpassword"
admin_pass_hash = generate_password_hash(admin_password)
users[0] = {"username": admin_username, "password_hash": admin_pass_hash, "role": "admin", "full_name": "Администратор Сайта", "telegram": "@admin_tg_official", "resume_link": "http://example.com/admin"}
print(f"--- Admin created: username='{admin_username}', password='{admin_password}' ---")
users[1] = {"username": "user1", "password_hash": generate_password_hash("user1"), "role": "user", "full_name": "Тест Юзер 1", "telegram": "@testuser1", "resume_link": "http://example.com/user1"}
users[2] = {"username": "user2", "password_hash": generate_password_hash("user2"), "role": "user", "full_name": "Тест Юзер 2", "telegram": "@testuser2", "resume_link": None}
next_user_id = 3

# 8. Helper Functions
def get_user_data_by_id(user_id_int):
    return users.get(user_id_int)

def get_username_by_id(user_id):
    try:
        user_id_int = int(user_id)
        user_data = get_user_data_by_id(user_id_int)
        return user_data.get("username", "N/A") if user_data else "N/A"
    except (ValueError, TypeError, AttributeError):
        return "N/A"

def is_valid_url(url):
    if not url or not isinstance(url, str):
        return False
    pattern = re.compile(r'https?://[^\s/$.?#].[^\s]*', re.IGNORECASE)
    return bool(pattern.match(url.strip()))

def is_valid_iso_date(date_string):
    if date_string is None:
        return True
    if not isinstance(date_string, str):
        return False
    try:
        datetime.strptime(date_string, '%Y-%m-%d')
        return True
    except ValueError:
        return False

# 9. Admin Required Decorator
def admin_required():
    def wrapper(fn):
        @jwt_required()
        def decorator(*args, **kwargs):
            identity_str = get_jwt_identity()
            try:
                user_id = int(identity_str)
                user_data = get_user_data_by_id(user_id)
                if user_data and user_data.get('role') == 'admin':
                    return fn(*args, **kwargs)
                else:
                    return jsonify(error="Админ?"), 403
            except (ValueError, TypeError):
                return jsonify(error="Токен?"), 422
        decorator.__name__ = fn.__name__
        decorator.__doc__ = fn.__doc__
        return decorator
    return wrapper

# --- API Endpoints ---

# 10. Auth Endpoints
@app.route("/register", methods=["POST"])
def register():
    global next_user_id
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Нет данных"}), 400
    if len(password) < 4:
        return jsonify({"error": "Пароль < 4"}), 400
    if username == admin_username:
        return jsonify({"error": "'admin'?"}), 409
    if next((uid for uid, udata in users.items() if udata.get("username") == username), None) is not None:
        return jsonify({"error": "Имя занято"}), 409
    password_hash = generate_password_hash(password)
    user_id = next_user_id
    users[user_id] = {
        "username": username, "password_hash": password_hash, "role": "user",
        "full_name": username, "telegram": None, "resume_link": None
    }
    next_user_id += 1
    print(f"Registered: {user_id}")
    return jsonify({"message": "ОК"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Нет данных"}), 400
    user_id = next((uid for uid, udata in users.items() if udata.get("username") == username), None)
    user_data = get_user_data_by_id(user_id)
    if (user_id is not None and user_data and
            check_password_hash(user_data.get("password_hash", ""), password)):
        identity_str = str(user_id)
        access_token = create_access_token(identity=identity_str)
        user_role = user_data.get("role", "user")
        print(f"Login OK: ID={user_id}, Role={user_role}")
        return jsonify(access_token=access_token, username=username, role=user_role)
    else:
        print(f"Login fail: {username}")
        return jsonify({"error": "Неверно"}), 401

# 11. Profile Endpoints
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
        profile_data = {
            "id": current_user_id,
            "username": user_data.get("username"),
            "role": user_data.get("role"),
            "full_name": user_data.get("full_name"),
            "telegram": user_data.get("telegram"),
            "resume_link": user_data.get("resume_link")
        }
        return jsonify(profile_data)
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

@app.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

    data = request.json
    full_name = data.get("full_name")
    telegram = data.get("telegram")
    resume_link = data.get("resume_link")
    updated = False

    if full_name is not None and isinstance(full_name, str) and full_name.strip():
        user_data["full_name"] = full_name.strip()
        updated = True
    if telegram is not None:
        tg_value = telegram.strip() if isinstance(telegram, str) else None
        if tg_value and not tg_value.startswith('@'):
            tg_value = '@' + tg_value
        user_data["telegram"] = tg_value if tg_value else None
        updated = True
    if resume_link is not None:
        resume_value = resume_link.strip() if isinstance(resume_link, str) else None
        if resume_value and not is_valid_url(resume_value):
            return jsonify({"error": "Ссылка?"}), 400
        user_data["resume_link"] = resume_value if resume_value else None
        updated = True

    if not updated:
        return jsonify({"message": "Нет данных"}), 200

    print(f"Profile updated: {current_user_id}")
    updated_profile_data = {
        "id": current_user_id,
        "username": user_data.get("username"),
        "role": user_data.get("role"),
        "full_name": user_data.get("full_name"),
        "telegram": user_data.get("telegram"),
        "resume_link": user_data.get("resume_link")
    }
    return jsonify({"message": "Профиль обновлен", "profile": updated_profile_data})

# --- НОВЫЙ ЭНДПОИНТ: GET /profile/notifications ---
@app.route("/profile/notifications", methods=["GET"])
@jwt_required()
def get_my_notifications():
    """Возвращает список уведомлений для текущего пользователя."""
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
    except (ValueError, TypeError):
        return jsonify({"error": "Неверный ID пользователя в токене"}), 422

    my_notifications = []
    for notification_data in user_notifications.values():
        if notification_data.get("user_id") == current_user_id:
            # Можно добавить имя админа-отправителя, если нужно
            # admin_id = notification_data.get("admin_id")
            # admin_username = get_username_by_id(admin_id)
            # notification_data_with_sender = {**notification_data, "admin_username": admin_username}
            # my_notifications.append(notification_data_with_sender)
            my_notifications.append(notification_data)

    # Сортируем по дате, самые новые сверху
    sorted_notifications = sorted(
        my_notifications,
        key=lambda n: n.get("timestamp", ""),
        reverse=True
    )
    return jsonify(sorted_notifications)
# --- КОНЕЦ НОВОГО ЭНДПОИНТА ---

# 12. Startups Endpoints
@app.route("/startups", methods=["GET"])
@jwt_required(optional=True)
def get_startups():
    """Возвращает стартапы + контакты + этапы (с фильтрами)."""
    current_user_id = None
    is_requesting_user_admin = False
    identity_str = get_jwt_identity()
    if identity_str:
        try:
            current_user_id = int(identity_str)
            user_data = get_user_data_by_id(current_user_id)
            is_requesting_user_admin = user_data and user_data.get("role") == "admin"
        except (ValueError, TypeError):
            current_user_id = None

    filter_by_creator = request.args.get('filter_by_creator', 'false').lower() == 'true'
    if filter_by_creator and current_user_id is None:
        return jsonify(error="Auth required"), 401

    startups_list_response = []
    for startup_data in startups.values():
        is_held = startup_data.get("is_held", False)
        if not is_requesting_user_admin and is_held:
            continue

        include_startup = False
        is_creator = current_user_id is not None and startup_data.get("creator_user_id") == current_user_id

        if filter_by_creator:
            if is_creator:
                include_startup = True
        else:
            if is_requesting_user_admin:
                include_startup = True
            else:
                if startup_data.get("status") == "approved":
                    include_startup = True
                elif is_creator:
                    if startup_data.get("status") in ["pending", "rejected"]:
                        include_startup = True

        if include_startup:
            creator_id = startup_data.get("creator_user_id")
            creator_username = get_username_by_id(creator_id)
            creator_profile = get_user_data_by_id(creator_id)
            creator_telegram = creator_profile.get("telegram") if creator_profile else None
            creator_resume_link = creator_profile.get("resume_link") if creator_profile else None

            startups_list_response.append({
                **startup_data,
                "creator_username": creator_username,
                "creator_telegram": creator_telegram,
                "creator_resume_link": creator_resume_link
            })

    sorted_startups = sorted(startups_list_response, key=lambda s: s.get("id", 0), reverse=True)
    return jsonify(sorted_startups)

@app.route("/startups", methods=["POST"])
@jwt_required()
def add_startup():
    """Добавление стартапа со статусом 'pending' + текущий этап."""
    global next_startup_id
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

    telegram_username = user_data.get("telegram")
    resume_link = user_data.get("resume_link")
    if not telegram_username or not telegram_username.strip():
        return jsonify({"error": "Укажите TG"}), 400
    if not resume_link or not is_valid_url(resume_link):
        return jsonify({"error": "Укажите резюме"}), 400

    data = request.json
    name = data.get("name")
    description = data.get("description")
    opensea_link = data.get("opensea_link")
    current_stage = data.get("current_stage")

    if not name or not description:
        return jsonify({'error': 'Имя/описание'}), 400
    if not opensea_link or not is_valid_url(opensea_link):
        return jsonify({'error': 'OpenSea'}), 400
    if not current_stage or current_stage not in ALLOWED_STAGES:
        return jsonify({'error': f'Этап {current_stage}?'}), 400

    current_stage_order = get_stage_order(current_stage)
    initial_timeline = {stage: None for i, stage in enumerate(ALLOWED_STAGES) if i > current_stage_order}

    new_id = next_startup_id
    startups[new_id] = {
        "id": new_id, "name": name.strip(), "description": description.strip(),
        "funds_raised": {"ETH": 0, "BTC": 0, "USDT": 0},
        "opensea_link": opensea_link.strip(), "status": "pending",
        "rejection_reason": None, "creator_user_id": current_user_id,
        "current_stage": current_stage, "stage_timeline": initial_timeline,
        "is_held": False
    }
    next_startup_id += 1
    print(f"Added PENDING startup: ID={new_id}, Held=False")

    new_startup_data_response = {
        **startups[new_id],
        "creator_username": user_data.get("username"),
        "creator_telegram": telegram_username.strip(),
        "creator_resume_link": resume_link.strip()
    }
    return jsonify({"message": "На рассмотрении", "startup": new_startup_data_response}), 201

@app.route('/users/<int:user_id>/notifications', methods=['POST'])
@admin_required()
def send_user_notification(user_id):
    """Отправляет уведомление конкретному пользователю (только админ)."""
    global next_notification_id
    identity_str = get_jwt_identity()
    try:
        admin_user_id = int(identity_str) # ID админа, который отправляет
    except (ValueError, TypeError):
        return jsonify({"error": "Неверный ID админа в токене"}), 422

    # Проверяем, существует ли пользователь-получатель
    target_user_data = get_user_data_by_id(user_id)
    if not target_user_data:
        return jsonify({'error': 'Пользователь-получатель не найден'}), 404

    data = request.json
    message_text = data.get("message")

    if not message_text or not isinstance(message_text, str) or not message_text.strip():
        return jsonify({'error': 'Текст сообщения не может быть пустым'}), 400

    # Создаем уведомление
    new_id = next_notification_id
    new_notification = {
        "id": new_id,
        "user_id": user_id, # Кому
        "admin_id": admin_user_id, # От кого
        "message": message_text.strip(),
        "timestamp": datetime.now(timezone.utc).isoformat(timespec='seconds'), # ISO формат 
        "is_read": False
    }
    user_notifications[new_id] = new_notification
    next_notification_id += 1

    print(f"Admin {admin_user_id} sent notification {new_id} to user {user_id}")

    return jsonify({
        "message": f"Уведомление отправлено пользователю {target_user_data.get('username')}",
        "notification": new_notification
    }), 201
# --- КОНЕЦ НОВОГО ЭНДПОИНТА ---

@app.route("/users", methods=["GET"])
@admin_required()
def get_all_users():
    """Возвращает список всех пользователей (ID и username) для админа."""
    user_list = []
    for user_id, user_data in users.items():
        user_list.append({
            "id": user_id,
            "username": user_data.get("username")
            # Можно добавить и другие поля, если нужно
        })
    # Сортируем по ID
    sorted_users = sorted(user_list, key=lambda u: u.get("id", 0))
    return jsonify(sorted_users)

# --- Вспомогательная функция для сборки ответа стартапа ---
def _get_full_startup_response(startup_data):
    creator_id = startup_data.get("creator_user_id")
    creator_username = get_username_by_id(creator_id)
    creator_profile = get_user_data_by_id(creator_id)
    creator_telegram = creator_profile.get("telegram") if creator_profile else None
    creator_resume_link = creator_profile.get("resume_link") if creator_profile else None
    return {
        **startup_data,
        "creator_username": creator_username,
        "creator_telegram": creator_telegram,
        "creator_resume_link": creator_resume_link
    }

@app.route('/startups/<int:startup_id>/funds', methods=['PUT'])
@jwt_required()
def update_startup_funds(startup_id):
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({'error': 'Стартап?'}), 404

    is_creator = target_startup.get("creator_user_id") == current_user_id
    is_admin = user_data.get("role") == "admin"
    if not is_creator and not is_admin:
        return jsonify({'error': 'Права?'}), 403

    new_funds_data = request.json
    if not isinstance(new_funds_data, dict):
        return jsonify({'error': 'Тело?'}), 400

    validated_funds = {}
    allowed_currencies = ["ETH", "BTC", "USDT"]
    for currency, amount in new_funds_data.items():
        upper_currency = currency.upper()
        if upper_currency not in allowed_currencies:
            return jsonify({"error": f"Валюта?"}), 400
        try:
            amount_float = float(amount)
            if amount_float < 0:
                raise ValueError
            validated_funds[upper_currency] = amount_float
        except (ValueError, TypeError):
            return jsonify({"error": f"Сумма?"}), 400

    target_startup["funds_raised"] = validated_funds
    print(f"Funds updated: {startup_id}")
    return jsonify({"message": "Средства обновлены", "startup": _get_full_startup_response(target_startup)})

@app.route("/startups/<int:startup_id>/approve", methods=["PUT"])
@admin_required()
def approve_startup(startup_id):
    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({"error": "Стартап?"}), 404
    if target_startup.get("status") != "pending":
        return jsonify({"error": "Только pending"}), 409

    target_startup["status"] = "approved"
    target_startup["rejection_reason"] = None
    print(f"Startup approved: {startup_id}")
    return jsonify({"message": "Стартап одобрен", "startup": _get_full_startup_response(target_startup)})

@app.route("/startups/<int:startup_id>/reject", methods=["PUT"])
@admin_required()
def reject_startup(startup_id):
    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({"error": "Стартап?"}), 404
    if target_startup.get("status") != "pending":
        return jsonify({"error": "Только pending"}), 409

    data = request.json
    reason = data.get("reason")
    if not reason or not isinstance(reason, str) or not reason.strip():
        return jsonify({"error": "Причина?"}), 400

    target_startup["status"] = "rejected"
    target_startup["rejection_reason"] = reason.strip()
    print(f"Startup rejected: {startup_id}")
    return jsonify({"message": "Стартап отклонен", "startup": _get_full_startup_response(target_startup)})

@app.route('/startups/<int:startup_id>/timeline', methods=['PUT'])
@jwt_required()
def update_startup_timeline(startup_id):
    """Обновляет планируемые даты этапов стартапа."""
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({'error': 'Стартап?'}), 404

    is_creator = target_startup.get("creator_user_id") == current_user_id
    is_admin = user_data.get("role") == "admin"
    if not is_creator and not is_admin:
        return jsonify({'error': 'Права?'}), 403

    new_timeline_data = request.json
    if not isinstance(new_timeline_data, dict):
        return jsonify({'error': 'Тело - словарь?'}), 400

    current_stage = target_startup.get("current_stage")
    current_stage_order = get_stage_order(current_stage)
    updated_timeline = target_startup.get("stage_timeline", {})

    for stage_key, date_value in new_timeline_data.items():
        stage_order = get_stage_order(stage_key)
        if stage_order == -1:
            return jsonify({'error': f'Этап {stage_key}?'}), 400
        if stage_order <= current_stage_order:
            return jsonify({'error': f'Нельзя менять {stage_key}'}), 400
        if not is_valid_iso_date(date_value):
            return jsonify({'error': f'Дата {stage_key}?'}), 400
        updated_timeline[stage_key] = date_value if date_value else None

    target_startup["stage_timeline"] = updated_timeline
    print(f"Timeline updated: {startup_id}")
    return jsonify({"message": "План обновлен", "startup": _get_full_startup_response(target_startup)})

@app.route('/startups/<int:startup_id>/toggle_hold', methods=['PUT'])
@admin_required()
def toggle_hold_startup(startup_id):
    """Приостанавливает или возобновляет показ стартапа (только для админа)."""
    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({'error': 'Стартап не найден'}), 404

    current_hold_status = target_startup.get("is_held", False)
    target_startup["is_held"] = not current_hold_status
    new_status_str = "приостановлен" if target_startup["is_held"] else "возвращен"
    print(f"Startup {startup_id} {new_status_str} by admin.")

    return jsonify({
        "message": f"Стартап {new_status_str}",
        "startup": _get_full_startup_response(target_startup)
    })

# 13. Meetups Endpoints
@app.route("/meetups", methods=["GET"])
@jwt_required(optional=True)
def get_meetups():
    current_user_id = None
    is_requesting_user_admin = False
    identity_str = get_jwt_identity()
    if identity_str:
        try:
            current_user_id = int(identity_str)
            user_data = get_user_data_by_id(current_user_id)
            is_requesting_user_admin = user_data and user_data.get("role") == "admin"
        except (ValueError, TypeError):
            current_user_id = None

    meetups_list_response = []
    for meetup_data in meetups.values():
        include_meetup = False
        if is_requesting_user_admin:
            include_meetup = True
        else:
            if meetup_data.get("status") == "approved":
                include_meetup = True
            elif current_user_id is not None and meetup_data.get("creator_user_id") == current_user_id:
                if meetup_data.get("status") in ["pending", "rejected"]:
                    include_meetup = True
        if include_meetup:
            meetups_list_response.append(meetup_data)

    sorted_meetups = sorted(meetups_list_response, key=lambda m: m.get("date", ""), reverse=True)
    return jsonify(sorted_meetups)

@app.route("/meetups", methods=["POST"])
@jwt_required()
def add_meetup():
    global next_meetup_id
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

    telegram_username = user_data.get("telegram")
    resume_link = user_data.get("resume_link")
    if not telegram_username or not telegram_username.strip():
        return jsonify({"error": "Укажите TG"}), 400
    if not resume_link or not is_valid_url(resume_link):
        return jsonify({"error": "Укажите резюме"}), 400

    data = request.json
    title = data.get("title")
    meetup_date_str = data.get("date")
    description = data.get("description")
    link = data.get("link")

    if not all([title, meetup_date_str, description, link]):
        return jsonify({"error": "Поля?"}), 400
    try:
        datetime.fromisoformat(meetup_date_str.replace("Z", "+00:00"))
    except ValueError:
        return jsonify({"error": "Дата?"}), 400
    if not is_valid_url(link):
        return jsonify({"error": "Ссылка?"}), 400

    new_id = next_meetup_id
    meetups[new_id] = {
        "id": new_id, "title": title.strip(), "date": meetup_date_str,
        "description": description.strip(), "link": link.strip(), "status": "pending",
        "rejection_reason": None, "creator_user_id": current_user_id
    }
    next_meetup_id += 1
    print(f"Added meetup: {new_id}")
    return jsonify({"message": "Митап на рассмотрении", "meetup": meetups[new_id]}), 201

@app.route("/meetups/<int:meetup_id>/approve", methods=["PUT"])
@admin_required()
def approve_meetup(meetup_id):
    target_meetup = meetups.get(meetup_id)
    if not target_meetup:
        return jsonify({"error": "Митап?"}), 404
    if target_meetup.get("status") != "pending":
        return jsonify({"error": "Только pending"}), 409
    target_meetup["status"] = "approved"
    target_meetup["rejection_reason"] = None
    print(f"Meetup approved: {meetup_id}")
    return jsonify({"message": "Митап одобрен", "meetup": target_meetup})

@app.route("/meetups/<int:meetup_id>/reject", methods=["PUT"])
@admin_required()
def reject_meetup(meetup_id):
    target_meetup = meetups.get(meetup_id)
    if not target_meetup:
        return jsonify({"error": "Митап?"}), 404
    if target_meetup.get("status") != "pending":
        return jsonify({"error": "Только pending"}), 409
    data = request.json
    reason = data.get("reason")
    if not reason or not isinstance(reason, str) or not reason.strip():
        return jsonify({"error": "Причина?"}), 400
    target_meetup["status"] = "rejected"
    target_meetup["rejection_reason"] = reason.strip()
    print(f"Meetup rejected: {meetup_id}")
    return jsonify({"message": "Митап отклонен", "meetup": target_meetup})

# 14. Vacancies Endpoints
@app.route("/vacancies", methods=["GET"])
@jwt_required(optional=True)
def get_vacancies():
    current_user_id = None
    is_requesting_user_admin = False
    identity_str = get_jwt_identity()
    if identity_str:
        try:
            current_user_id = int(identity_str)
            user_data = get_user_data_by_id(current_user_id)
            is_requesting_user_admin = user_data and user_data.get("role") == "admin"
        except (ValueError, TypeError):
            current_user_id = None

    filter_by_creator = request.args.get('filter_by_creator', 'false').lower() == 'true'
    if filter_by_creator and current_user_id is None:
        return jsonify(error="Auth required"), 401

    vacancies_list_response = []
    for vacancy_data in vacancies.values():
        startup_id = vacancy_data.get("startup_id")
        startup_info = startups.get(startup_id)
        if not startup_info:
            continue

        startup_is_held = startup_info.get("is_held", False)
        is_effectively_held = startup_is_held
        if not is_requesting_user_admin and startup_is_held:
            continue

        include_vacancy = False
        is_creator = current_user_id is not None and vacancy_data.get("creator_user_id") == current_user_id

        if filter_by_creator:
            if is_creator:
                include_vacancy = True
        else:
            if is_requesting_user_admin:
                include_vacancy = True
            else:
                if vacancy_data.get("status") == "approved" and startup_info.get("status") == "approved":
                    include_vacancy = True
                elif is_creator:
                    if vacancy_data.get("status") in ["pending", "rejected"]:
                        include_vacancy = True

        if include_vacancy:
            startup_name = startup_info.get("name")
            vacancy_creator_id = vacancy_data.get("creator_user_id")
            startup_creator_id = startup_info.get("creator_user_id")
            can_view_applicants = False
            if current_user_id is not None:
                is_startup_creator = (startup_creator_id == current_user_id)
                if is_startup_creator or is_requesting_user_admin:
                    can_view_applicants = True
            applicants_info = vacancy_data.get("applicants", []) if can_view_applicants else None
            applicant_count = len(vacancy_data.get("applicants", []))

            vacancies_list_response.append({
                **vacancy_data,
                "startup_name": startup_name,
                "startup_creator_id": startup_creator_id,
                "applicants": applicants_info,
                "applicant_count": applicant_count,
                "is_effectively_held": is_effectively_held
            })

    sorted_vacancies = sorted(vacancies_list_response, key=lambda v: v.get("id", 0), reverse=True)
    return jsonify(sorted_vacancies)

@app.route("/vacancies", methods=["POST"])
@jwt_required()
def add_vacancy():
    global next_vacancy_id
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

    data = request.json
    startup_id_req = data.get("startup_id")
    title = data.get("title")
    description = data.get("description")
    salary = data.get("salary")
    requirements = data.get("requirements")

    if not all([startup_id_req, title, description, requirements]):
        return jsonify({"error": "Поля?"}), 400
    try:
        startup_id = int(startup_id_req)
    except (ValueError, TypeError):
        return jsonify({"error": "ID стартапа?"}), 400
    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({"error": "Стартап?"}), 404
    if target_startup.get("status") != "approved":
        return jsonify({"error": "Только к одобренным"}), 403

    is_creator_of_startup = target_startup.get("creator_user_id") == current_user_id
    is_admin = user_data.get("role") == "admin"
    if not is_creator_of_startup and not is_admin:
        return jsonify({"error": "Права?"}), 403

    new_id = next_vacancy_id
    vacancies[new_id] = {
        "id": new_id, "startup_id": startup_id, "title": title,
        "description": description, "salary": salary if salary is not None else "N/A",
        "requirements": requirements, "applicants": [], "status": "pending",
        "rejection_reason": None, "creator_user_id": current_user_id
    }
    next_vacancy_id += 1
    new_vacancy_data_enriched = {
        **vacancies[new_id],
        "startup_name": target_startup.get("name"),
        "applicant_count": 0,
        "startup_creator_id": target_startup.get("creator_user_id"),
        "is_effectively_held": target_startup.get("is_held", False)
    }
    print(f"Added vacancy: {new_id}")
    return jsonify({"message": "Вакансия на рассмотрении", "vacancy": new_vacancy_data_enriched}), 201

@app.route("/vacancies/<int:vacancy_id>/apply", methods=["POST"])
@jwt_required()
def apply_for_vacancy(vacancy_id):
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "User?"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Токен?"}), 422

    target_vacancy = vacancies.get(vacancy_id)
    if not target_vacancy:
        return jsonify({"error": "Вакансия?"}), 404
    if target_vacancy.get("status") != "approved":
        return jsonify({"error": "Только одобренные"}), 403

    startup_id = target_vacancy.get("startup_id")
    startup_info = startups.get(startup_id)
    if not startup_info:
        return jsonify({"error": "Связанный стартап не найден"}), 404
    if startup_info.get("is_held", False):
        return jsonify({"error": "Нельзя откликнуться, стартап приостановлен"}), 409

    telegram_username = user_data.get("telegram")
    resume_link = user_data.get("resume_link")
    if not telegram_username or not telegram_username.strip():
        return jsonify({"error": "Укажите TG"}), 400
    if not resume_link or not is_valid_url(resume_link):
        return jsonify({"error": "Укажите резюме"}), 400

    applicant_ids = [app.get("user_id") for app in target_vacancy.get("applicants", [])]
    if current_user_id in applicant_ids:
        return jsonify({"message": "Уже откликнулись"}), 409

    target_vacancy["applicants"].append({
        "user_id": current_user_id,
        "telegram": telegram_username.strip(),
        "resume_link": resume_link.strip()
    })
    print(f"Applied: {current_user_id} to {vacancy_id}")
    return jsonify({"message": "Отклик отправлен"})

@app.route("/vacancies/<int:vacancy_id>/approve", methods=["PUT"])
@admin_required()
def approve_vacancy(vacancy_id):
    target_vacancy = vacancies.get(vacancy_id)
    if not target_vacancy:
        return jsonify({"error": "Вакансия?"}), 404
    if target_vacancy.get("status") != "pending":
        return jsonify({"error": "Только pending"}), 409
    target_startup = startups.get(target_vacancy.get("startup_id"))
    if not target_startup or target_startup.get("status") != "approved":
        return jsonify({"error": "Стартап не одобрен"}), 409

    target_vacancy["status"] = "approved"
    target_vacancy["rejection_reason"] = None
    print(f"Vacancy approved: {vacancy_id}")

    updated_vacancy_response = {
        **target_vacancy,
        "startup_name": target_startup.get("name"),
        "startup_creator_id": target_startup.get("creator_user_id"),
        "applicant_count": len(target_vacancy.get("applicants", [])),
        "is_effectively_held": target_startup.get("is_held", False)
    }
    return jsonify({"message": "Вакансия одобрена", "vacancy": updated_vacancy_response})

@app.route("/vacancies/<int:vacancy_id>/reject", methods=["PUT"])
@admin_required()
def reject_vacancy(vacancy_id):
    target_vacancy = vacancies.get(vacancy_id)
    if not target_vacancy:
        return jsonify({"error": "Вакансия?"}), 404
    if target_vacancy.get("status") != "pending":
        return jsonify({"error": "Только pending"}), 409

    data = request.json
    reason = data.get("reason")
    if not reason or not isinstance(reason, str) or not reason.strip():
        return jsonify({"error": "Причина?"}), 400

    target_vacancy["status"] = "rejected"
    target_vacancy["rejection_reason"] = reason.strip()
    print(f"Vacancy rejected: {vacancy_id}")

    startup_info = startups.get(target_vacancy.get("startup_id"))
    updated_vacancy_response = {
        **target_vacancy,
        "startup_name": startup_info.get("name") if startup_info else "N/A",
        "startup_creator_id": startup_info.get("creator_user_id") if startup_info else None,
        "applicant_count": len(target_vacancy.get("applicants", [])),
        "is_effectively_held": startup_info.get("is_held", False) if startup_info else True
    }
    return jsonify({"message": "Вакансия отклонена", "vacancy": updated_vacancy_response})

# --- Запуск приложения ---
if __name__ == "__main__":
    app.run(debug=True)

