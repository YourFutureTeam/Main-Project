# main.py (ПОЛНЫЙ КОД - SQLAlchemy + SQLite - ОТФОРМАТИРОВАНО и ИСПРАВЛЕНО)

import os
import re
from datetime import datetime, timezone, timedelta, date
from functools import wraps # Добавил для @admin_required

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (JWTManager, create_access_token,
                                get_jwt_identity, jwt_required,
                                verify_jwt_in_request)
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, desc # Добавил desc для сортировки

# 1. Инициализация Flask App
app = Flask(__name__)

# 2. CORS
CORS(app, supports_credentials=True) # Добавил supports_credentials на всякий случай

# 3. Конфигурация
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'yourfuture_app.db') # Имя файла БД
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = os.environ.get(
    "JWT_SECRET_KEY", "change-this-super-secret-key-please-v3" # ОБЯЗАТЕЛЬНО СМЕНИ!
)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1) # Время жизни токена

# 4. Инициализация Расширений
db = SQLAlchemy(app)
jwt = JWTManager(app)


# 5. Определение Моделей Базы Данных (SQLAlchemy Models)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(10), nullable=False, default='user', index=True)
    full_name = db.Column(db.String(120), nullable=True)
    telegram = db.Column(db.String(80), nullable=True, unique=True, index=True) # Уникальный TG
    resume_link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Связи
    startups = db.relationship('Startup', backref='creator', lazy='dynamic')
    meetups = db.relationship('Meetup', backref='creator', lazy='dynamic')
    vacancies_created = db.relationship('Vacancy', foreign_keys='Vacancy.creator_user_id', backref='creator', lazy='dynamic')
    notifications_received = db.relationship('Notification', foreign_keys='Notification.user_id', backref='recipient', lazy='dynamic')
    notifications_sent = db.relationship('Notification', foreign_keys='Notification.admin_id', backref='sender', lazy='dynamic')

    def __repr__(self):
        return f'<User {self.id}: {self.username} ({self.role})>'


class Startup(db.Model):
    __tablename__ = 'startups'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    funds_raised = db.Column(db.JSON)
    opensea_link = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(10), nullable=False, default='pending', index=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    creator_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    current_stage = db.Column(db.String(20), nullable=False)
    stage_timeline = db.Column(db.JSON)
    is_held = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    vacancies = db.relationship('Vacancy', backref='startup', lazy='dynamic', cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Startup {self.id}: {self.name}>'


class Meetup(db.Model):
    __tablename__ = 'meetups'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    date = db.Column(db.DateTime, nullable=False, index=True) # Храним как DateTime UTC
    description = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(10), nullable=False, default='pending', index=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    creator_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Meetup {self.id}: {self.title}>'


class Vacancy(db.Model):
    __tablename__ = 'vacancies'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    salary = db.Column(db.String(100), nullable=True)
    requirements = db.Column(db.Text, nullable=False)
    applicants = db.Column(db.JSON)
    status = db.Column(db.String(10), nullable=False, default='pending', index=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    creator_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Vacancy {self.id}: {self.title}>'


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)

    def __repr__(self):
        return f'<Notification {self.id} to User {self.user_id}>'


# 6. JWT Error Handlers
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
    return jsonify(error=f"Отсутствует заголовок авторизации: {error_string}"), 401

@jwt.needs_fresh_token_loader
def token_not_fresh_callback(jwt_header, jwt_payload):
    print("JWT Error: Fresh token required")
    return jsonify(error="Требуется свежий токен доступа"), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    print("JWT Error: Revoked token")
    return jsonify(error="Токен был отозван"), 401


# 7. Этапы и Хелперы
ALLOWED_STAGES = ['idea', 'mvp', 'pmf', 'scaling', 'established']

def get_stage_order(stage_key):
    try: return ALLOWED_STAGES.index(stage_key)
    except ValueError: return -1

def is_valid_url(url):
    if not url or not isinstance(url, str): return False
    pattern = re.compile(r'https?://[^\s/$.?#].[^\s]*', re.IGNORECASE)
    return bool(pattern.match(url.strip()))

def is_valid_iso_date(date_string):
    if date_string is None: return True
    if not isinstance(date_string, str): return False
    try: date.fromisoformat(date_string); return True
    except ValueError: return False

def get_current_user() -> User | None:
    """Получает объект User текущего пользователя из JWT, если он валиден."""
    try:
        verify_jwt_in_request(optional=True)
        identity_str = get_jwt_identity()
        if identity_str:
            user_id = int(identity_str)
            user = User.query.get(user_id) # Ищем по первичному ключу
            return user
        return None
    except Exception as e:
        print(f"Error getting current user from JWT: {e}")
        return None


# 8. Admin Required Decorator
def admin_required():
    def wrapper(fn):
        # wraps сохраняет метаданные оборачиваемой функции
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            current_user = get_current_user()
            if current_user and current_user.role == 'admin':
                return fn(*args, **kwargs)
            else:
                return jsonify(error="Требуются права администратора"), 403
        return decorator
    return wrapper


# --- API Endpoints ---

# 9. Auth Endpoints
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password: return jsonify({"error": "Имя и пароль обязательны"}), 400
    if len(password) < 4: return jsonify({"error": "Пароль > 4 символов"}), 400
    if username == 'admin': return jsonify({"error": "Регистрация 'admin' запрещена"}), 409
    if User.query.filter_by(username=username).first(): return jsonify({"error": "Имя занято"}), 409

    password_hash = generate_password_hash(password)
    new_user = User(username=username, password_hash=password_hash, full_name=username)

    try:
        db.session.add(new_user); db.session.commit()
        print(f"Registered user: {username}, ID: {new_user.id}")
        return jsonify({"message": "Регистрация успешна"}), 201
    except IntegrityError: db.session.rollback(); return jsonify({"error": "Имя занято (IntegrityError)"}), 409
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка сервера"}), 500


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if not username or not password: return jsonify({"error": "Нужны имя и пароль"}), 400

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.id))
        print(f"Login OK: ID={user.id}, Role={user.role}")
        return jsonify(access_token=access_token, username=user.username, role=user.role)
    else:
        print(f"Login failed for: {username}")
        return jsonify({"error": "Неверные учетные данные"}), 401


# 10. Profile & User Endpoints
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    current_user = get_current_user()
    if not current_user: return jsonify({"error": "Пользователь не найден"}), 404
    return jsonify({
        "id": current_user.id, "username": current_user.username, "role": current_user.role,
        "full_name": current_user.full_name, "telegram": current_user.telegram,
        "resume_link": current_user.resume_link
    })


@app.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    current_user = get_current_user()
    if not current_user: return jsonify({"error": "Пользователь не найден"}), 404

    data = request.json; updated = False
    if "full_name" in data:
        f_name = data["full_name"]; f_name_value = f_name.strip() if isinstance(f_name, str) else ''
        current_user.full_name = f_name_value if f_name_value else current_user.username; updated = True
    if "telegram" in data:
        tg = data["telegram"]; tg_value = tg.strip() if isinstance(tg, str) else None
        if tg_value and not tg_value.startswith('@'): tg_value = '@' + tg_value
        # Проверка уникальности Telegram перед сохранением
        if tg_value and User.query.filter(User.id != current_user.id, User.telegram == tg_value).first():
             return jsonify({"error": "Этот Telegram уже используется"}), 409
        current_user.telegram = tg_value; updated = True
    if "resume_link" in data:
        link = data["resume_link"]; link_value = link.strip() if isinstance(link, str) else None
        if link_value and not is_valid_url(link_value): return jsonify({"error": "Некорректная ссылка"}), 400
        current_user.resume_link = link_value; updated = True

    if not updated: return jsonify({"message": "Нет данных для обновления"}), 200

    try:
        db.session.commit()
        print(f"Profile updated for user ID: {current_user.id}")
        return jsonify({"message": "Профиль обновлен", "profile": {
            "id": current_user.id, "username": current_user.username, "role": current_user.role,
            "full_name": current_user.full_name, "telegram": current_user.telegram,
            "resume_link": current_user.resume_link
        }})
    except IntegrityError: db.session.rollback(); return jsonify({"error": "Ошибка уникальности (Telegram?)"}), 409
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка сервера"}), 500


@app.route("/profile/notifications", methods=["GET"])
@jwt_required()
def get_my_notifications():
    current_user = get_current_user()
    if not current_user: return jsonify({"error": "Пользователь не найден"}), 404

    notifications = Notification.query.filter_by(user_id=current_user.id)\
                                      .order_by(desc(Notification.timestamp)).all()
    result = [{
        "id": n.id, "user_id": n.user_id, "admin_id": n.admin_id, "message": n.message,
        # Форматируем UTC дату в ISO строку с 'Z'
        "timestamp": n.timestamp.replace(tzinfo=timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        "is_read": n.is_read
    } for n in notifications]
    return jsonify(result)


@app.route('/users/<int:user_id>/notifications', methods=['POST'])
@admin_required()
def send_user_notification(user_id):
    admin_user = get_current_user()
    target_user = User.query.get(user_id)
    if not target_user: return jsonify({'error': 'Получатель не найден'}), 404
    if target_user.id == admin_user.id: return jsonify({'error': 'Нельзя отправить себе'}), 400

    data = request.json; message_text = data.get("message")
    if not message_text or not isinstance(message_text, str) or not message_text.strip():
        return jsonify({'error': 'Текст пуст'}), 400

    new_notification = Notification(user_id=target_user.id, admin_id=admin_user.id, message=message_text.strip())
    try:
        db.session.add(new_notification); db.session.commit()
        print(f"Admin {admin_user.id} sent notification {new_notification.id} to user {target_user.id}")
        result_notification = {
            "id": new_notification.id, "user_id": new_notification.user_id, "admin_id": new_notification.admin_id,
            "message": new_notification.message,
            "timestamp": new_notification.timestamp.replace(tzinfo=timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
            "is_read": new_notification.is_read
        }
        return jsonify({"message": f"Уведомление отправлено {target_user.username}", "notification": result_notification}), 201
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка сервера"}), 500


@app.route("/users", methods=["GET"])
@admin_required()
def get_all_users():
    admin_user = get_current_user()
    # Исключаем текущего админа из списка
    users = User.query.filter(User.id != admin_user.id).order_by(User.id).all()
    result = [{"id": u.id, "username": u.username} for u in users]
    return jsonify(result)


# 11. Startups Endpoints
def serialize_startup(startup: Startup) -> dict | None:
    """Сериализует объект Startup в словарь для JSON."""
    if not startup: return None
    creator = User.query.get(startup.creator_user_id)
    return {
        "id": startup.id, "name": startup.name, "description": startup.description,
        "funds_raised": startup.funds_raised or {}, "opensea_link": startup.opensea_link,
        "status": startup.status, "rejection_reason": startup.rejection_reason,
        "creator_user_id": startup.creator_user_id, "current_stage": startup.current_stage,
        "stage_timeline": startup.stage_timeline or {}, "is_held": startup.is_held,
        "creator_username": creator.username if creator else "N/A",
        "creator_telegram": creator.telegram if creator else None,
        "creator_resume_link": creator.resume_link if creator else None
    }

@app.route("/startups", methods=["GET"])
@jwt_required(optional=True)
def get_startups():
    current_user = get_current_user()
    is_admin = current_user and current_user.role == 'admin'
    filter_by_creator = request.args.get('filter_by_creator', 'false').lower() == 'true'

    if filter_by_creator and not current_user: return jsonify(error="Требуется авторизация"), 401

    query = Startup.query
    if not is_admin:
        base_filter = (Startup.status == 'approved') & (Startup.is_held == False)
        if current_user:
            own_filter = (Startup.creator_user_id == current_user.id) & (Startup.status.in_(['pending', 'rejected']))
            if filter_by_creator: query = query.filter(Startup.creator_user_id == current_user.id)
            else: query = query.filter(or_(base_filter, own_filter)) # Используем or_
        else: # Аноним
             if filter_by_creator: return jsonify(error="Анонимный не может фильтровать"), 400
             query = query.filter(base_filter)
    elif filter_by_creator: # Админ с фильтром
         query = query.filter(Startup.creator_user_id == current_user.id)
    # Админ без фильтра - базовый query

    startups_list = query.order_by(desc(Startup.id)).all() # Используем desc
    result = [serialize_startup(s) for s in startups_list]
    return jsonify(result)


@app.route("/startups", methods=["POST"])
@jwt_required()
def add_startup():
    current_user = get_current_user()
    if not current_user: return jsonify({"error": "User?"}), 404
    if not current_user.telegram or not current_user.resume_link or not is_valid_url(current_user.resume_link):
         return jsonify({"error": "Заполните профиль."}), 400

    data = request.json; name = data.get("name"); description = data.get("description")
    opensea_link = data.get("opensea_link"); current_stage = data.get("current_stage")

    if not name or not description: return jsonify({'error': 'Name/Desc required'}), 400
    if opensea_link and not is_valid_url(opensea_link): return jsonify({'error': 'OpenSea URL invalid'}), 400
    if not current_stage or current_stage not in ALLOWED_STAGES: return jsonify({'error': f'Stage invalid'}), 400

    current_stage_order = get_stage_order(current_stage)
    initial_timeline = {stage: None for i, stage in enumerate(ALLOWED_STAGES) if i > current_stage_order}

    new_startup = Startup(
        name=name.strip(), description=description.strip(), funds_raised={},
        opensea_link=opensea_link.strip() if opensea_link else None, status='pending',
        creator_user_id=current_user.id, current_stage=current_stage,
        stage_timeline=initial_timeline, is_held=False
    )
    try:
        db.session.add(new_startup); db.session.commit()
        print(f"Added PENDING startup: ID={new_startup.id}")
        return jsonify({"message": "Заявка отправлена", "startup": serialize_startup(new_startup)}), 201
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка БД"}), 500


@app.route('/startups/<int:startup_id>/funds', methods=['PUT'])
@jwt_required()
def update_startup_funds(startup_id):
    current_user = get_current_user(); startup = Startup.query.get(startup_id)
    if not current_user or not startup: return jsonify({"error": "User or Startup not found"}), 404
    if not (current_user.role == 'admin' or startup.creator_user_id == current_user.id): return jsonify({'error': 'Нет прав'}), 403

    new_funds_data = request.json; validated_funds = {}
    if not isinstance(new_funds_data, dict): return jsonify({'error': 'Тело запроса JSON?'}), 400
    allowed = ["ETH", "BTC", "USDT"]
    for currency, amount in new_funds_data.items():
        upper_currency = currency.upper()
        if upper_currency not in allowed: return jsonify({"error": f"Валюта {currency}?"}), 400
        try: amount_float = float(amount); assert amount_float >= 0; validated_funds[upper_currency] = amount_float
        except: return jsonify({"error": f"Сумма {amount} для {currency}?"}), 400

    startup.funds_raised = validated_funds # SQLAlchemy отследит изменение JSON
    try: db.session.commit(); return jsonify({"message": "Средства обновлены", "startup": serialize_startup(startup)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка БД"}), 500


@app.route("/startups/<int:startup_id>/approve", methods=["PUT"])
@admin_required()
def approve_startup(startup_id):
    startup = Startup.query.get(startup_id)
    if not startup: return jsonify({"error": "Startup?"}), 404
    if startup.status != "pending": return jsonify({"error": "Only pending"}), 409
    startup.status = "approved"; startup.rejection_reason = None
    try: db.session.commit(); return jsonify({"message": "Одобрен", "startup": serialize_startup(startup)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка БД"}), 500


@app.route("/startups/<int:startup_id>/reject", methods=["PUT"])
@admin_required()
def reject_startup(startup_id):
    startup = Startup.query.get(startup_id)
    if not startup: return jsonify({"error": "Startup?"}), 404
    if startup.status != "pending": return jsonify({"error": "Only pending"}), 409
    data = request.json; reason = data.get("reason")
    if not reason or not isinstance(reason, str) or not reason.strip(): return jsonify({"error": "Reason?"}), 400
    startup.status = "rejected"; startup.rejection_reason = reason.strip()
    try: db.session.commit(); return jsonify({"message": "Отклонен", "startup": serialize_startup(startup)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка БД"}), 500


@app.route('/startups/<int:startup_id>/timeline', methods=['PUT'])
@jwt_required()
def update_startup_timeline(startup_id):
    current_user = get_current_user(); startup = Startup.query.get(startup_id)
    if not current_user or not startup: return jsonify({"error": "User or Startup not found"}), 404
    if not (current_user.role == 'admin' or startup.creator_user_id == current_user.id): return jsonify({'error': 'Нет прав'}), 403

    new_timeline_data = request.json
    if not isinstance(new_timeline_data, dict): return jsonify({'error': 'Тело JSON?'}), 400

    current_stage_order = get_stage_order(startup.current_stage)
    # Используем .copy(), чтобы не модифицировать исходный объект до коммита
    updated_timeline = (startup.stage_timeline or {}).copy()
    for stage_key, date_value in new_timeline_data.items():
        stage_order = get_stage_order(stage_key)
        if stage_order == -1: return jsonify({'error': f'Этап {stage_key}?'}), 400
        if stage_order <= current_stage_order: return jsonify({'error': f'Нельзя менять {stage_key}'}), 400
        if not is_valid_iso_date(date_value): return jsonify({'error': f'Формат даты {stage_key}?'}), 400
        updated_timeline[stage_key] = date_value if date_value else None

    startup.stage_timeline = updated_timeline
    try: db.session.commit(); return jsonify({"message": "План обновлен", "startup": serialize_startup(startup)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка БД"}), 500


@app.route('/startups/<int:startup_id>/toggle_hold', methods=['PUT'])
@admin_required()
def toggle_hold_startup(startup_id):
    startup = Startup.query.get(startup_id)
    if not startup: return jsonify({'error': 'Startup?'}), 404
    startup.is_held = not startup.is_held
    try:
        db.session.commit(); status_str = "приостановлен" if startup.is_held else "возвращен"
        print(f"Startup {startup_id} is now {status_str}")
        return jsonify({"message": f"Стартап {status_str}", "startup": serialize_startup(startup)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "Ошибка БД"}), 500


# 12. Meetups Endpoints
def serialize_meetup(meetup: Meetup) -> dict | None:
    """Сериализует объект Meetup в словарь."""
    if not meetup: return None
    creator = User.query.get(meetup.creator_user_id)
    return {
        "id": meetup.id, "title": meetup.title,
        "date": meetup.date.replace(tzinfo=timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        "description": meetup.description, "link": meetup.link, "status": meetup.status,
        "rejection_reason": meetup.rejection_reason, "creator_user_id": meetup.creator_user_id,
        "creator_username": creator.username if creator else "N/A"
    }

@app.route("/meetups", methods=["GET"])
@jwt_required(optional=True)
def get_meetups():
    current_user = get_current_user()
    is_admin = current_user and current_user.role == 'admin'
    query = Meetup.query
    if not is_admin:
        approved_cond = (Meetup.status == 'approved')
        if current_user:
            own_cond = (Meetup.creator_user_id == current_user.id) & (Meetup.status.in_(['pending', 'rejected']))
            query = query.filter(or_(approved_cond, own_cond))
        else: query = query.filter(approved_cond)
    meetups_list = query.order_by(desc(Meetup.date)).all()
    return jsonify([serialize_meetup(m) for m in meetups_list])

@app.route("/meetups", methods=["POST"])
@jwt_required()
def add_meetup():
    current_user = get_current_user()
    if not current_user: return jsonify({"error": "User?"}), 404
    if not current_user.telegram or not current_user.resume_link or not is_valid_url(current_user.resume_link):
        return jsonify({"error": "Заполните профиль."}), 400

    data = request.json; title = data.get("title"); date_str = data.get("date")
    description = data.get("description"); link = data.get("link")
    if not all([title, date_str, description, link]): return jsonify({"error": "Fields?"}), 400
    try:
        # Принимаем ISO строку, конвертируем в UTC для хранения
        meetup_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        if meetup_date.tzinfo is None: meetup_date = meetup_date.replace(tzinfo=timezone.utc)
        else: meetup_date = meetup_date.astimezone(timezone.utc)
        # Проверяем, что дата не в прошлом (опционально)
        # if meetup_date < datetime.now(timezone.utc): return jsonify({"error": "Дата в прошлом?"}), 400
    except ValueError: return jsonify({"error": "Date format?"}), 400
    if not is_valid_url(link): return jsonify({"error": "Link?"}), 400

    new_meetup = Meetup(title=title.strip(), date=meetup_date, description=description.strip(),
                      link=link.strip(), status='pending', creator_user_id=current_user.id)
    try: db.session.add(new_meetup); db.session.commit(); return jsonify({"message": "Meetup pending", "meetup": serialize_meetup(new_meetup)}), 201
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "DB Error"}), 500

@app.route("/meetups/<int:meetup_id>/approve", methods=["PUT"])
@admin_required()
def approve_meetup(meetup_id):
    meetup = Meetup.query.get(meetup_id)
    if not meetup: return jsonify({"error": "Meetup?"}), 404
    if meetup.status != "pending": return jsonify({"error": "Only pending"}), 409
    meetup.status = "approved"; meetup.rejection_reason = None
    try: db.session.commit(); return jsonify({"message": "Approved", "meetup": serialize_meetup(meetup)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "DB Error"}), 500

@app.route("/meetups/<int:meetup_id>/reject", methods=["PUT"])
@admin_required()
def reject_meetup(meetup_id):
    meetup = Meetup.query.get(meetup_id)
    if not meetup: return jsonify({"error": "Meetup?"}), 404
    if meetup.status != "pending": return jsonify({"error": "Only pending"}), 409
    data = request.json; reason = data.get("reason")
    if not reason or not isinstance(reason, str) or not reason.strip(): return jsonify({"error": "Reason?"}), 400
    meetup.status = "rejected"; meetup.rejection_reason = reason.strip()
    try: db.session.commit(); return jsonify({"message": "Rejected", "meetup": serialize_meetup(meetup)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "DB Error"}), 500


# 13. Vacancies Endpoints
def serialize_vacancy(vacancy: Vacancy) -> dict | None:
    """Сериализует объект Vacancy в словарь для JSON."""
    if not vacancy: return None
    startup = Startup.query.get(vacancy.startup_id)
    is_effectively_held = startup.is_held if startup else True
    creator = User.query.get(vacancy.creator_user_id)
    startup_creator = User.query.get(startup.creator_user_id) if startup else None
    return {
        "id": vacancy.id, "startup_id": vacancy.startup_id, "title": vacancy.title,
        "description": vacancy.description, "salary": vacancy.salary, "requirements": vacancy.requirements,
        "applicants": vacancy.applicants or [], "status": vacancy.status,
        "rejection_reason": vacancy.rejection_reason, "creator_user_id": vacancy.creator_user_id,
        "startup_name": startup.name if startup else "N/A",
        "startup_creator_id": startup.creator_user_id if startup else None,
        "applicant_count": len(vacancy.applicants or []),
        "is_effectively_held": is_effectively_held
    }

@app.route("/vacancies", methods=["GET"])
@jwt_required(optional=True)
def get_vacancies():
    current_user = get_current_user()
    is_admin = current_user and current_user.role == 'admin'
    filter_by_creator = request.args.get('filter_by_creator', 'false').lower() == 'true'
    if filter_by_creator and not current_user: return jsonify(error="Auth required"), 401

    query = Vacancy.query.join(Startup, Vacancy.startup_id == Startup.id)
    if not is_admin:
        query = query.filter(Startup.is_held == False)
        approved_cond = (Vacancy.status == 'approved') & (Startup.status == 'approved')
        if current_user:
            own_cond = (Vacancy.creator_user_id == current_user.id) & Vacancy.status.in_(['pending', 'rejected'])
            if filter_by_creator: query = query.filter(Vacancy.creator_user_id == current_user.id)
            else: query = query.filter(or_(approved_cond, own_cond))
        else: # Аноним
             if filter_by_creator: return jsonify(error="Anon cannot filter"), 400
             query = query.filter(approved_cond)
    elif filter_by_creator: # Админ с фильтром
        query = query.filter(Vacancy.creator_user_id == current_user.id)
    # Админ без фильтра - базовый query

    vacancies_list = query.order_by(desc(Vacancy.id)).all()
    return jsonify([serialize_vacancy(v) for v in vacancies_list])


@app.route("/vacancies", methods=["POST"])
@jwt_required()
def add_vacancy():
    current_user = get_current_user()
    if not current_user: return jsonify({"error": "User?"}), 404

    data = request.json; startup_id_req = data.get("startup_id"); title = data.get("title")
    description = data.get("description"); salary = data.get("salary"); requirements = data.get("requirements")
    if not all([startup_id_req, title, description, requirements]): return jsonify({"error": "Fields?"}), 400
    try: startup_id = int(startup_id_req)
    except: return jsonify({"error": "Startup ID?"}), 400

    target_startup = Startup.query.get(startup_id)
    if not target_startup: return jsonify({"error": "Startup?"}), 404
    if target_startup.status != "approved": return jsonify({"error": "Only approved"}), 403
    if target_startup.is_held: return jsonify({"error": "Startup held"}), 403
    if not (current_user.role == 'admin' or target_startup.creator_user_id == current_user.id): return jsonify({"error": "Rights?"}), 403

    new_vacancy = Vacancy(startup_id=startup_id, title=title.strip(), description=description.strip(),
                          salary=salary.strip() if salary else None, requirements=requirements.strip(),
                          applicants=[], status='pending', creator_user_id=current_user.id)
    try: db.session.add(new_vacancy); db.session.commit(); return jsonify({"message": "Vacancy pending", "vacancy": serialize_vacancy(new_vacancy)}), 201
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "DB Error"}), 500


@app.route("/vacancies/<int:vacancy_id>/apply", methods=["POST"])
@jwt_required()
def apply_for_vacancy(vacancy_id):
    current_user = get_current_user()
    if not current_user: return jsonify({"error": "User?"}), 404
    vacancy = Vacancy.query.get(vacancy_id)
    if not vacancy: return jsonify({"error": "Vacancy?"}), 404
    if vacancy.status != "approved": return jsonify({"error": "Only approved"}), 403
    startup = Startup.query.get(vacancy.startup_id)
    if not startup: return jsonify({"error": "Startup deleted?"}), 404
    if startup.is_held: return jsonify({"error": "Startup held"}), 409
    if not current_user.telegram or not current_user.resume_link or not is_valid_url(current_user.resume_link):
         return jsonify({"error": "Fill profile."}), 400

    current_applicants = list(vacancy.applicants or []) # Создаем копию списка
    applicant_ids = [app.get("user_id") for app in current_applicants]
    if current_user.id in applicant_ids: return jsonify({"message": "Already applied"}), 409

    new_applicant = {"user_id": current_user.id, "telegram": current_user.telegram, "resume_link": current_user.resume_link}
    current_applicants.append(new_applicant)
    vacancy.applicants = current_applicants # Присваиваем измененный список
    try: db.session.commit(); return jsonify({"message": "Applied successfully"})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "DB Error"}), 500


@app.route("/vacancies/<int:vacancy_id>/approve", methods=["PUT"])
@admin_required()
def approve_vacancy(vacancy_id):
    vacancy = Vacancy.query.get(vacancy_id)
    if not vacancy: return jsonify({"error": "Vacancy?"}), 404
    if vacancy.status != "pending": return jsonify({"error": "Only pending"}), 409
    startup = Startup.query.get(vacancy.startup_id)
    if not startup or startup.status != "approved" or startup.is_held:
         return jsonify({"error": "Startup not available"}), 409
    vacancy.status = "approved"; vacancy.rejection_reason = None
    try: db.session.commit(); return jsonify({"message": "Approved", "vacancy": serialize_vacancy(vacancy)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "DB Error"}), 500


@app.route("/vacancies/<int:vacancy_id>/reject", methods=["PUT"])
@admin_required()
def reject_vacancy(vacancy_id):
    vacancy = Vacancy.query.get(vacancy_id)
    if not vacancy: return jsonify({"error": "Vacancy?"}), 404
    if vacancy.status != "pending": return jsonify({"error": "Only pending"}), 409
    data = request.json; reason = data.get("reason")
    if not reason or not isinstance(reason, str) or not reason.strip(): return jsonify({"error": "Reason?"}), 400
    vacancy.status = "rejected"; vacancy.rejection_reason = reason.strip()
    try: db.session.commit(); return jsonify({"message": "Rejected", "vacancy": serialize_vacancy(vacancy)})
    except Exception as e: db.session.rollback(); print(f"Error: {e}"); return jsonify({"error": "DB Error"}), 500


# --- Инициализация БД и создание админа ---
def init_database():
    """Создает файл БД, таблицы и админа, если их нет."""
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}, creating...")
        try:
            with app.app_context():
                db.create_all()
                print("Tables created.")
                admin_username = "admin"
                # ВАЖНО: Используйте безопасный пароль или переменные окружения!
                admin_password = os.environ.get("ADMIN_PASSWORD", "verysecretadminpassword")
                if not User.query.filter_by(username=admin_username).first():
                    admin_pass_hash = generate_password_hash(admin_password)
                    admin_user = User(username=admin_username, password_hash=admin_pass_hash, role="admin", full_name="Администратор")
                    db.session.add(admin_user)
                    db.session.commit()
                    print(f"--- Admin user '{admin_username}' created. ---")
                else:
                    print(f"--- Admin user '{admin_username}' already exists. ---")
        except Exception as e:
             db.session.rollback()
             print(f"--- FATAL: Failed to initialize database or create admin: {e} ---")
             # В реальном приложении здесь может быть выход или более сложная обработка
    else:
        print(f"Database found at {db_path}.")


# --- Запуск приложения ---
if __name__ == "__main__":
    init_database()
    app.run(debug=True, host='127.0.0.1', port=5000)
