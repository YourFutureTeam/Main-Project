# main.py (ПОЛНЫЙ КОД с Resume Link в откликах)

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, jwt_required, JWTManager, get_jwt_identity,
    get_jwt
)
from datetime import timedelta, datetime
import re # Для валидации URL

# 1. Flask App + CORS
app = Flask(__name__)
CORS(app)

# 2. JWT Config
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "a-very-strong-and-secret-key-for-dev-only-FINAL-FINAL-v4")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
jwt = JWTManager(app)

# 3. JWT Error Handlers (без изменений)
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload): return jsonify(error="Токен доступа истек"), 401
@jwt.invalid_token_loader
def invalid_token_callback(error_string): return jsonify(error=f"Недействительный токен: {error_string}"), 422
@jwt.unauthorized_loader
def missing_token_callback(error_string): return jsonify(error=f"Отсутствует заголовок авторизации или токен: {error_string}"), 401
@jwt.needs_fresh_token_loader
def token_not_fresh_callback(jwt_header, jwt_payload): return jsonify(error="Требуется свежий токен доступа"), 401
@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload): return jsonify(error="Токен был отозван"), 401

# 4. Data Stores (In-Memory)
users = {}
startups = { # ... примеры стартапов ...
    1: {"id": 1, "name": "ТехноИнновации Альфа", "description": "Разработка ИИ.", "funds_raised": {"ETH": 10.5}, "creator_user_id": 0, "opensea_link": "https://testnets.opensea.io/collection/your-test-collection-1"},
    3: {"id": 3, "name": "ГеймДев Студия 'Код и Меч'", "description": "Создаем инди-игры.", "funds_raised": {"BTC": 1}, "creator_user_id": 1, "opensea_link": "https://testnets.opensea.io/collection/your-test-collection-3"}
}
meetups = {}
# ---> ИЗМЕНЕНА СТРУКТУРА applicants: добавлен resume_link <---
vacancies = { # vacancy_id (int) -> {..., applicants: [{"user_id": int, "telegram": str, "resume_link": str}]}
    1: {"id": 1, "startup_id": 1, "title": "Разработчик Python", "description": "...", "salary": "200000 руб.", "requirements": "...", "applicants": []},
    3: {"id": 3, "startup_id": 3, "title": "Game Designer", "description": "...", "salary": "По результатам", "requirements": "...", "applicants": []}
}
next_startup_id = 4
next_user_id = 1
next_meetup_id = 1
next_vacancy_id = 4

# 5. Create Admin User (без изменений)
admin_username = "admin"; admin_password = "verysecretadminpassword"; admin_pass_hash = generate_password_hash(admin_password)
users[0] = {"username": admin_username, "password_hash": admin_pass_hash, "role": "admin"}
print(f"--- Admin created: username='{admin_username}', password='{admin_password}' ---")

# 6. Helper Functions (без изменений)
def get_user_data_by_id(user_id_int): return users.get(user_id_int)
def get_username_by_id(user_id):
    try: user_id_int = int(user_id)
    except: return "Неизвестный ID"
    user_data = get_user_data_by_id(user_id_int); return user_data["username"] if user_data else "Неизвестный"
# Простая функция валидации URL
def is_valid_url(url):
    if not url or not isinstance(url, str): return False
    pattern = re.compile(r'https?://[^\s/$.?#].[^\s]*', re.IGNORECASE)
    return bool(pattern.match(url.strip()))


# 7. Admin Required Decorator (без изменений)
def admin_required(): # ... (код декоратора без изменений) ...
    def wrapper(fn):
        @jwt_required()
        def decorator(*args, **kwargs):
            identity_str = get_jwt_identity(); user_id = int(identity_str); user_data = get_user_data_by_id(user_id)
            if user_data and user_data.get('role') == 'admin': return fn(*args, **kwargs)
            else: return jsonify(error="Требуется доступ администратора"), 403
        decorator.__name__ = fn.__name__; decorator.__doc__ = fn.__doc__; return decorator
    return wrapper


# --- API Endpoints ---

# 8. Auth Endpoints (Register, Login - без изменений)
@app.route('/register', methods=['POST'])
def register(): # ... (код без изменений) ...
    global next_user_id; data = request.json; username = data.get('username'); password = data.get('password')
    if not username or not password: return jsonify({"error": "Требуются имя и пароль"}), 400
    if len(password) < 4: return jsonify({"error": "Пароль > 4 символов"}), 400
    if username == admin_username: return jsonify({"error": "'admin' зарезервировано"}), 409
    if next((uid for uid, udata in users.items() if udata['username'] == username), None) is not None: return jsonify({"error": "Имя занято"}), 409
    password_hash = generate_password_hash(password); user_id = next_user_id
    users[user_id] = {"username": username, "password_hash": password_hash, "role": "user"}
    next_user_id += 1; print(f"Registered: ID={user_id}, User={username}"); return jsonify({"message": "Регистрация успешна"}), 201

@app.route('/login', methods=['POST'])
def login(): # ... (код без изменений) ...
    data = request.json; username = data.get('username'); password = data.get('password')
    if not username or not password: return jsonify({"error": "Требуются имя и пароль"}), 400
    user_id = next((uid for uid, udata in users.items() if udata['username'] == username), None); user_data = get_user_data_by_id(user_id)
    if user_id is not None and user_data and check_password_hash(user_data['password_hash'], password):
        identity_str = str(user_id); access_token = create_access_token(identity=identity_str); user_role = user_data.get('role', 'user')
        print(f"Login OK: ID={user_id}, Role={user_role}"); return jsonify(access_token=access_token, username=username, role=user_role)
    else: print(f"Login failed: User={username}"); return jsonify({"error": "Неверные данные"}), 401

# 9. Startups Endpoints (GET, POST - без изменений)
@app.route('/startups', methods=['GET'])
def get_startups(): # ... (код без изменений) ...
    startups_list = [];
    for startup_data in startups.values():
        creator_id = startup_data.get('creator_user_id'); creator_username = get_username_by_id(creator_id) if creator_id is not None else "Система"
        startups_list.append({ **startup_data, "creator_username": creator_username })
    return jsonify(startups_list)

@app.route('/startups', methods=['POST'])
@jwt_required()
def add_startup(): # ... (код без изменений, opensea_link обязателен) ...
    global next_startup_id; current_user_id = int(get_jwt_identity()); data = request.json
    name = data.get('name'); description = data.get('description'); opensea_link = data.get('opensea_link')
    if not name or not description: return jsonify({'error': 'Имя и описание обязательны'}), 400
    if not opensea_link or not isinstance(opensea_link, str) or not opensea_link.strip(): return jsonify({'error': 'Ссылка OpenSea обязательна'}), 400
    if not is_valid_url(opensea_link): return jsonify({'error': 'Неверный формат ссылки OpenSea'}), 400
    new_id = next_startup_id
    startups[new_id] = { "id": new_id, "name": name.strip(), "description": description.strip(), "funds_raised": {"ETH": 0, "BTC": 0, "USDT": 0}, "creator_user_id": current_user_id, "opensea_link": opensea_link.strip() }
    next_startup_id += 1; print(f"Added startup: ID={new_id}, Creator ID={current_user_id}")
    creator_username = get_username_by_id(current_user_id); new_startup_data = {**startups[new_id], "creator_username": creator_username}
    return jsonify({'message': 'Стартап добавлен', 'startup': new_startup_data}), 201

# 10. Meetups Endpoints (GET, POST - без изменений)
@app.route('/meetups', methods=['GET'])
def get_meetups(): # ... (код без изменений) ...
    sorted_meetups = sorted(meetups.values(), key=lambda m: m.get('date', ''), reverse=True); return jsonify(sorted_meetups)

@app.route('/meetups', methods=['POST'])
@admin_required()
def add_meetup(): # ... (код без изменений) ...
    global next_meetup_id; admin_user_id = int(get_jwt_identity()); data = request.json; title = data.get('title'); meetup_date_str = data.get('date'); description = data.get('description'); link = data.get('link')
    if not all([title, meetup_date_str, description, link]): return jsonify({'error': 'Требуются все поля'}), 400
    try: datetime.fromisoformat(meetup_date_str.replace('Z', '+00:00'))
    except ValueError: return jsonify({'error': 'Неверный формат даты (ISO)'}), 400
    if not is_valid_url(link): return jsonify({'error': 'Неверный формат ссылки'}), 400
    new_id = next_meetup_id; meetups[new_id] = { "id": new_id, "title": title, "date": meetup_date_str, "description": description, "link": link, "creator_user_id": admin_user_id }
    next_meetup_id += 1; print(f"Added meetup: ID={new_id}, Admin ID={admin_user_id}"); return jsonify({'message': 'Митап добавлен', 'meetup': meetups[new_id]}), 201

# 11. Vacancies Endpoints

# --- GET /vacancies (без изменений, т.к. applicants уже возвращались как объекты) ---
@app.route('/vacancies', methods=['GET'])
@jwt_required(optional=True)
def get_vacancies():
    # Логика остается прежней: возвращает список applicants [{user_id, telegram, resume_link...}]
    # только для создателя/админа, иначе null.
    current_user_id = None; is_requesting_user_admin = False; identity_str = get_jwt_identity()
    if identity_str:
        try: current_user_id = int(identity_str); user_data = get_user_data_by_id(current_user_id); is_requesting_user_admin = user_data and user_data.get('role') == 'admin'
        except: current_user_id = None
    vacancies_list_response = []
    for vacancy_data in vacancies.values():
        startup_id = vacancy_data.get('startup_id'); startup_info = startups.get(startup_id); startup_name = startup_info.get('name') if startup_info else "N/A"; startup_creator_id = startup_info.get('creator_user_id') if startup_info else None
        can_view_applicants = False
        if current_user_id is not None: is_startup_creator = (startup_creator_id == current_user_id); 
        if is_startup_creator or is_requesting_user_admin: can_view_applicants = True
        # ---> Отправляем applicants только если есть права <---
        applicants_info = vacancy_data.get('applicants', []) if can_view_applicants else None
        applicant_count = len(vacancy_data.get('applicants', []))
        vacancies_list_response.append({ "id": vacancy_data.get('id'), "startup_id": startup_id, "title": vacancy_data.get('title'), "description": vacancy_data.get('description'), "salary": vacancy_data.get('salary'), "requirements": vacancy_data.get('requirements'), "startup_name": startup_name, "startup_creator_id": startup_creator_id, "applicants": applicants_info, "applicant_count": applicant_count })
    sorted_vacancies = sorted(vacancies_list_response, key=lambda v: v.get('id', 0), reverse=True); return jsonify(sorted_vacancies)

# --- POST /vacancies (без изменений) ---
@app.route('/vacancies', methods=['POST'])
@jwt_required()
def add_vacancy():
    # ... (код без изменений) ...
    global next_vacancy_id; identity_str = get_jwt_identity()
    try: current_user_id = int(identity_str); user_data = get_user_data_by_id(current_user_id)
    except: return jsonify({"error": "Недействительный токен"}), 422
    if not user_data: return jsonify({"error": "Пользователь не найден"}), 404
    data = request.json; startup_id_req = data.get('startup_id'); title = data.get('title'); description = data.get('description'); salary = data.get('salary'); requirements = data.get('requirements')
    if not all([startup_id_req, title, description, requirements]): return jsonify({'error': 'Требуются поля: startup_id, title, description, requirements'}), 400
    try: startup_id = int(startup_id_req)
    except: return jsonify({'error': 'Неверный формат ID стартапа'}), 400
    target_startup = startups.get(startup_id)
    if not target_startup: return jsonify({'error': 'Стартап не найден'}), 404
    is_creator = target_startup.get('creator_user_id') == current_user_id; is_admin = user_data.get('role') == 'admin'
    if not is_creator and not is_admin: return jsonify({'error': 'Добавлять вакансии можно только для своих стартапов (или админом)'}), 403
    new_id = next_vacancy_id
    vacancies[new_id] = { "id": new_id, "startup_id": startup_id, "title": title, "description": description, "salary": salary if salary is not None else "Не указана", "requirements": requirements, "applicants": [] }
    next_vacancy_id += 1; print(f"Added vacancy: ID={new_id}, By User ID={current_user_id}")
    new_vacancy_data_enriched = {**vacancies[new_id], "startup_name": target_startup.get('name'), "applicant_count": 0, "startup_creator_id": target_startup.get('creator_user_id')}
    if is_creator or is_admin: new_vacancy_data_enriched["applicants"] = [] # Пустой список для создателя/админа при создании
    return jsonify({'message': 'Вакансия добавлена', 'vacancy': new_vacancy_data_enriched}), 201

# --- ИЗМЕНЕН POST /vacancies/<id>/apply - принимает telegram и resume_link ---
@app.route('/vacancies/<int:vacancy_id>/apply', methods=['POST'])
@jwt_required()
def apply_for_vacancy(vacancy_id):
    identity_str = get_jwt_identity()
    try: current_user_id = int(identity_str)
    except: return jsonify({"error": "Недействительный токен"}), 422

    target_vacancy = vacancies.get(vacancy_id)
    if not target_vacancy: return jsonify({'error': 'Вакансия не найдена'}), 404

    data = request.json
    telegram_username = data.get('telegram')
    # ---> Получаем ссылку на резюме <---
    resume_link = data.get('resume_link')

    # ---> Валидация telegram и resume_link <---
    if not telegram_username or not isinstance(telegram_username, str) or not telegram_username.strip():
        return jsonify({'error': 'Необходимо указать ваш Telegram username'}), 400
    if not resume_link or not isinstance(resume_link, str) or not resume_link.strip():
        return jsonify({'error': 'Необходимо указать ссылку на резюме'}), 400
    # Простая валидация ссылки на резюме
    if not is_valid_url(resume_link):
        return jsonify({'error': 'Неверный формат ссылки на резюме (должна начинаться с http:// или https://)'}), 400
    # ---> Конец валидации <---

    # Нормализация TG
    if not telegram_username.startswith('@'): telegram_username = '@' + telegram_username

    # Проверка на повторный отклик
    applicant_ids = [app.get('user_id') for app in target_vacancy.get('applicants', [])]
    if current_user_id in applicant_ids:
        return jsonify({'message': 'Вы уже откликнулись'}), 409

    # ---> Добавляем объект с user_id, telegram и resume_link <---
    target_vacancy['applicants'].append({
        "user_id": current_user_id,
        "telegram": telegram_username.strip(),
        "resume_link": resume_link.strip() # Сохраняем ссылку
    })
    print(f"Applied: User {current_user_id} (TG: {telegram_username}, Resume: {resume_link}) to Vacancy {vacancy_id}")

    return jsonify({'message': 'Вы успешно откликнулись'})


# --- Запуск приложения ---
if __name__ == '__main__':
    app.run(debug=True)
