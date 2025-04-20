# main.py (ПОЛНЫЙ КОД - ПОСЛЕДНЯЯ ПОПЫТКА ФОРМАТИРОВАНИЯ)

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

# 2. Базовая инициализация CORS (СРАЗУ ПОСЛЕ app = Flask)
CORS(app)

# 3. JWT Config
# ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ ЭТОТ КЛЮЧ!
app.config["JWT_SECRET_KEY"] = os.environ.get(
    "JWT_SECRET_KEY", "a-very-strong-secret-key-for-dev-only-FINAL-FINAL-v7" # Свой ключ
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


# 5. Data Stores (In-Memory)
users = {}  # user_id (int) -> {"username", "password_hash", "role", "full_name", "telegram", "resume_link"}
startups = {
    1: {
        "id": 1, "name": "ТехноИнновации Альфа", "description": "Разработка ИИ.",
        "funds_raised": {"ETH": 10.5}, "creator_user_id": 0,
        "opensea_link": "https://testnets.opensea.io/collection/your-test-collection-1",
    },
    3: {
        "id": 3, "name": "ГеймДев Студия 'Код и Меч'", "description": "Создаем инди-игры.",
        "funds_raised": {"BTC": 1, "ETH": 5}, "creator_user_id": 1,
        "opensea_link": "https://testnets.opensea.io/collection/your-test-collection-3",
    },
}
meetups = {}
vacancies = {
    1: {
        "id": 1, "startup_id": 1, "title": "Разработчик Python", "description": "...",
        "salary": "200000 руб.", "requirements": "...", "applicants": [],
    },
    3: {
        "id": 3, "startup_id": 3, "title": "Game Designer", "description": "...",
        "salary": "По результатам", "requirements": "...",
        "applicants": [{"user_id": 0, "telegram": "@admin", "resume_link": "http://example.com/admin_cv"}],
    },
}
next_startup_id = 4
next_user_id = 1
next_meetup_id = 1
next_vacancy_id = 4

# 6. Create Admin User
admin_username = "admin"
admin_password = "verysecretadminpassword"  # СМЕНИТЕ ПАРОЛЬ!
admin_pass_hash = generate_password_hash(admin_password)
users[0] = {
    "username": admin_username, "password_hash": admin_pass_hash, "role": "admin",
    "full_name": "Администратор Сайта", "telegram": "@admin_tg_official", "resume_link": "http://example.com/admin"
}
print(f"--- Admin created: username='{admin_username}', password='{admin_password}' ---")


# 7. Helper Functions
def get_user_data_by_id(user_id_int):
    """Возвращает данные пользователя по ID (int) или None."""
    return users.get(user_id_int)


def get_username_by_id(user_id):
    """Возвращает имя пользователя по ID (int или str) или стандартное имя."""
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError, AttributeError):
        return "Неизвестный ID"
    user_data = get_user_data_by_id(user_id_int)
    # Используем .get для безопасного доступа к ключу 'username'
    return user_data.get("username", "Неизвестный") if user_data else "Неизвестный"


def is_valid_url(url):
    """Простая проверка URL на соответствие формату http(s)://..."""
    if not url or not isinstance(url, str):
        return False
    pattern = re.compile(r'https?://[^\s/$.?#].[^\s]*', re.IGNORECASE)
    return bool(pattern.match(url.strip()))


# 8. Admin Required Decorator
def admin_required():
    """Декоратор для проверки, является ли пользователь администратором."""
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
                    print(f"Admin access denied for user ID {user_id} "
                          f"(role: {user_data.get('role') if user_data else 'not found'})")
                    return jsonify(error="Требуется доступ администратора"), 403
            except (ValueError, TypeError):
                 print(f"Admin access denied due to invalid identity: {identity_str}")
                 return jsonify(error="Недействительный идентификатор пользователя в токене"), 422
        # Копируем метаданные
        decorator.__name__ = fn.__name__
        decorator.__doc__ = fn.__doc__
        return decorator
    return wrapper


# --- API Endpoints ---

# 9. Auth Endpoints
@app.route("/register", methods=["POST"])
def register():
    """Регистрация нового пользователя (с инициализацией полей профиля)."""
    global next_user_id
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Требуются имя пользователя и пароль"}), 400
    if len(password) < 4:
        return jsonify({"error": "Пароль должен быть не менее 4 символов"}), 400
    if username == admin_username:
        return jsonify({"error": "Имя пользователя 'admin' зарезервировано"}), 409

    existing_user_id = next(
        (uid for uid, udata in users.items() if udata.get("username") == username), None
    )
    if existing_user_id is not None:
        return jsonify({"error": "Имя пользователя уже занято"}), 409

    password_hash = generate_password_hash(password)
    user_id = next_user_id
    users[user_id] = {
        "username": username,
        "password_hash": password_hash,
        "role": "user",
        "full_name": username,  # По умолчанию ФИО = username
        "telegram": None,
        "resume_link": None
    }
    next_user_id += 1
    print(f"Registered: ID={user_id}, User={username}")
    return jsonify({"message": "Регистрация успешна"}), 201


@app.route("/login", methods=["POST"])
def login():
    """Аутентификация пользователя и возврат JWT токена, имени и роли."""
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Требуются имя пользователя и пароль"}), 400

    user_id = next(
        (uid for uid, udata in users.items() if udata.get("username") == username), None
    )
    user_data = get_user_data_by_id(user_id)

    if (user_id is not None and user_data
            and check_password_hash(user_data.get("password_hash", ""), password)):
        # Успешный вход
        identity_str = str(user_id)
        access_token = create_access_token(identity=identity_str)
        user_role = user_data.get("role", "user")
        print(f"Login OK: ID={user_id}, Role={user_role}")
        return jsonify(access_token=access_token, username=username, role=user_role)
    else:
        # Неверные данные
        print(f"Login failed: User={username}")
        return jsonify({"error": "Неверные учетные данные"}), 401


# 10. Profile Endpoints
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """Возвращает данные профиля текущего пользователя."""
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Возвращаем только нужные поля профиля
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
        return jsonify({"error": "Недействительный токен"}), 422


@app.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """Обновляет данные профиля текущего пользователя."""
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data:
            return jsonify({"error": "Пользователь не найден"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Недействительный токен"}), 422

    data = request.json
    full_name = data.get("full_name")
    telegram = data.get("telegram")
    resume_link = data.get("resume_link")

    updated = False
    # Обновляем ФИО
    if full_name is not None and isinstance(full_name, str) and full_name.strip():
        user_data["full_name"] = full_name.strip()
        updated = True

    # Обновляем Telegram
    if telegram is not None:
        tg_value = telegram.strip() if isinstance(telegram, str) else None
        if tg_value and not tg_value.startswith('@'):
            tg_value = '@' + tg_value
        user_data["telegram"] = tg_value if tg_value else None # Сохраняем null если пустой
        updated = True

    # Обновляем ссылку на резюме
    if resume_link is not None:
        resume_value = resume_link.strip() if isinstance(resume_link, str) else None
        if resume_value and not is_valid_url(resume_value):
            return jsonify({"error": "Неверный формат ссылки на резюме"}), 400
        user_data["resume_link"] = resume_value if resume_value else None # null если пустой
        updated = True

    if not updated:
        return jsonify({"message": "Нет данных для обновления"}), 200

    print(f"Profile updated for User ID: {current_user_id}")

    # Возвращаем обновленные данные
    updated_profile_data = {
        "id": current_user_id,
        "username": user_data.get("username"),
        "role": user_data.get("role"),
        "full_name": user_data.get("full_name"),
        "telegram": user_data.get("telegram"),
        "resume_link": user_data.get("resume_link")
    }
    return jsonify({"message": "Профиль успешно обновлен", "profile": updated_profile_data})


# 11. Startups Endpoints
@app.route("/startups", methods=["GET"])
def get_startups():
    startups_list = []
    for startup_data in startups.values():
        creator_id = startup_data.get("creator_user_id")
        creator_username = get_username_by_id(creator_id) if creator_id is not None else "Система"
        startups_list.append({**startup_data, "creator_username": creator_username})
    return jsonify(startups_list)


@app.route("/startups", methods=["POST"])
@jwt_required()
def add_startup():
    global next_startup_id
    current_user_id = int(get_jwt_identity())
    data = request.json
    name = data.get("name")
    description = data.get("description")
    opensea_link = data.get("opensea_link")

    if not name or not description:
        return jsonify({"error": "Имя и описание обязательны"}), 400
    if not opensea_link or not is_valid_url(opensea_link):
        return jsonify({"error": "Ссылка OpenSea обязательна и валидна"}), 400

    new_id = next_startup_id
    startups[new_id] = {
        "id": new_id, "name": name.strip(), "description": description.strip(),
        "funds_raised": {"ETH": 0, "BTC": 0, "USDT": 0},
        "creator_user_id": current_user_id, "opensea_link": opensea_link.strip(),
    }
    next_startup_id += 1
    print(f"Added startup: ID={new_id}, Creator ID={current_user_id}")
    creator_username = get_username_by_id(current_user_id)
    new_startup_data = {**startups[new_id], "creator_username": creator_username}
    return jsonify({"message": "Стартап добавлен", "startup": new_startup_data}), 201


@app.route('/startups/<int:startup_id>/funds', methods=['PUT'])
@jwt_required()
def update_startup_funds(startup_id):
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data: return jsonify({"error": "Пользователь не найден"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Недействительный токен"}), 422

    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({'error': 'Стартап не найден'}), 404

    is_creator = target_startup.get("creator_user_id") == current_user_id
    is_admin = user_data.get("role") == "admin"

    if not is_creator and not is_admin:
        return jsonify({'error': 'Изменять могут создатель или админ'}), 403

    new_funds_data = request.json
    if not isinstance(new_funds_data, dict):
        return jsonify({'error': 'Тело запроса {"валюта": сумма}'}), 400

    validated_funds = {}
    allowed_currencies = ["ETH", "BTC", "USDT"]
    for currency, amount in new_funds_data.items():
        upper_currency = currency.upper()
        if upper_currency not in allowed_currencies:
            return jsonify({"error": f"Валюта {currency} не разрешена"}), 400
        try:
            amount_float = float(amount)
            if amount_float < 0: raise ValueError("Сумма < 0")
            validated_funds[upper_currency] = amount_float
        except (ValueError, TypeError):
             return jsonify({"error": f"Неверная сумма для {currency}"}), 400

    target_startup["funds_raised"] = validated_funds
    print(f"Updated funds for startup {startup_id}")
    creator_username = get_username_by_id(target_startup.get("creator_user_id"))
    updated_startup_response = {**target_startup, "creator_username": creator_username}
    return jsonify({"message": "Средства обновлены", "startup": updated_startup_response})


# 12. Meetups Endpoints
@app.route("/meetups", methods=["GET"])
def get_meetups():
    sorted_meetups = sorted(meetups.values(), key=lambda m: m.get("date", ""), reverse=True)
    return jsonify(sorted_meetups)


@app.route("/meetups", methods=["POST"])
@admin_required()
def add_meetup():
    global next_meetup_id
    admin_user_id = int(get_jwt_identity())
    data = request.json
    title = data.get("title"); meetup_date_str = data.get("date")
    description = data.get("description"); link = data.get("link")

    if not all([title, meetup_date_str, description, link]):
        return jsonify({"error": "Требуются все поля"}), 400
    try:
        datetime.fromisoformat(meetup_date_str.replace("Z", "+00:00"))
    except ValueError:
        return jsonify({"error": "Неверный формат даты (ISO)"}), 400
    if not is_valid_url(link):
        return jsonify({"error": "Неверный формат ссылки"}), 400

    new_id = next_meetup_id
    meetups[new_id] = {
        "id": new_id, "title": title, "date": meetup_date_str,
        "description": description, "link": link, "creator_user_id": admin_user_id,
    }
    next_meetup_id += 1
    return jsonify({"message": "Митап добавлен", "meetup": meetups[new_id]}), 201


# 13. Vacancies Endpoints
@app.route("/vacancies", methods=["GET"])
@jwt_required(optional=True)
def get_vacancies():
    current_user_id = None; is_requesting_user_admin = False; identity_str = get_jwt_identity()
    if identity_str:
        try:
            current_user_id = int(identity_str)
            user_data = get_user_data_by_id(current_user_id)
            is_requesting_user_admin = user_data and user_data.get("role") == "admin"
        except:
            current_user_id = None

    vacancies_list_response = []
    for vacancy_data in vacancies.values():
        startup_id = vacancy_data.get("startup_id")
        startup_info = startups.get(startup_id)
        startup_name = startup_info.get("name") if startup_info else "N/A"
        startup_creator_id = startup_info.get("creator_user_id") if startup_info else None

        can_view_applicants = False
        if current_user_id is not None:
            is_startup_creator = (startup_creator_id == current_user_id)
            if is_startup_creator or is_requesting_user_admin:
                can_view_applicants = True

        applicants_info = vacancy_data.get("applicants", []) if can_view_applicants else None
        applicant_count = len(vacancy_data.get("applicants", []))

        vacancies_list_response.append({
            "id": vacancy_data.get("id"), "startup_id": startup_id,
            "title": vacancy_data.get("title"), "description": vacancy_data.get("description"),
            "salary": vacancy_data.get("salary"), "requirements": vacancy_data.get("requirements"),
            "startup_name": startup_name, "startup_creator_id": startup_creator_id,
            "applicants": applicants_info, "applicant_count": applicant_count,
        })
    sorted_vacancies = sorted(vacancies_list_response, key=lambda v: v.get("id", 0), reverse=True)
    return jsonify(sorted_vacancies)


@app.route("/vacancies", methods=["POST"])
@jwt_required()
def add_vacancy():
    global next_vacancy_id
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str); user_data = get_user_data_by_id(current_user_id)
    except:
        return jsonify({"error": "Недействительный токен"}), 422
    if not user_data:
        return jsonify({"error": "Пользователь не найден"}), 404

    data = request.json
    startup_id_req = data.get("startup_id"); title = data.get("title")
    description = data.get("description"); salary = data.get("salary"); requirements = data.get("requirements")

    if not all([startup_id_req, title, description, requirements]):
        return jsonify({"error": "Требуются поля: startup_id, title, description, requirements"}), 400
    try:
        startup_id = int(startup_id_req)
    except:
        return jsonify({"error": "Неверный формат ID стартапа"}), 400

    target_startup = startups.get(startup_id)
    if not target_startup:
        return jsonify({"error": "Стартап не найден"}), 404

    is_creator = target_startup.get("creator_user_id") == current_user_id
    is_admin = user_data.get("role") == "admin"
    if not is_creator and not is_admin:
        return jsonify({"error": "Добавлять могут создатель или админ"}), 403

    new_id = next_vacancy_id
    vacancies[new_id] = {
        "id": new_id, "startup_id": startup_id, "title": title,
        "description": description, "salary": salary if salary is not None else "Не указана",
        "requirements": requirements, "applicants": [],
    }
    next_vacancy_id += 1
    new_vacancy_data_enriched = {
        **vacancies[new_id],
        "startup_name": target_startup.get("name"), "applicant_count": 0,
        "startup_creator_id": target_startup.get("creator_user_id"),
    }
    return jsonify({"message": "Вакансия добавлена", "vacancy": new_vacancy_data_enriched}), 201


@app.route("/vacancies/<int:vacancy_id>/apply", methods=["POST"])
@jwt_required()
def apply_for_vacancy(vacancy_id):
    identity_str = get_jwt_identity()
    try:
        current_user_id = int(identity_str)
        user_data = get_user_data_by_id(current_user_id)
        if not user_data: return jsonify({"error": "Пользователь не найден"}), 404
    except (ValueError, TypeError):
        return jsonify({"error": "Недействительный токен"}), 422

    target_vacancy = vacancies.get(vacancy_id)
    if not target_vacancy: return jsonify({"error": "Вакансия не найдена"}), 404

    telegram_username = user_data.get("telegram")
    resume_link = user_data.get("resume_link")

    if not telegram_username or not telegram_username.strip():
        return jsonify({"error": "Укажите Telegram в профиле"}), 400
    if not resume_link or not is_valid_url(resume_link):
        return jsonify({"error": "Укажите валидную ссылку на резюме в профиле"}), 400

    # Проверка на повторный отклик
    applicant_ids = [app.get("user_id") for app in target_vacancy.get("applicants", [])]
    if current_user_id in applicant_ids:
        return jsonify({"message": "Вы уже откликнулись"}), 409

    target_vacancy["applicants"].append({
        "user_id": current_user_id,
        "telegram": telegram_username.strip(),
        "resume_link": resume_link.strip(),
    })
    print(f"Applied: User {current_user_id} to Vacancy {vacancy_id}")
    return jsonify({"message": "Вы успешно откликнулись"})


# --- Запуск приложения ---
if __name__ == "__main__":
    app.run(debug=True)
