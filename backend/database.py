from sqlalchemy import create_engine, Column, Integer, String, Date, Boolean, Enum, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum
from datetime import datetime

# SQLite файл будет лежать рядом
SQLALCHEMY_DATABASE_URL = "sqlite:///./tasks.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Перечисление для статусов задач
class TaskStatus(str, enum.Enum):
    new = "новая"
    in_progress = "в работе"
    on_review = "на согласовании"
    done = "выполнена"
    overdue = "просрочена"


# Модель задачи для SQLAlchemy
class TaskDB(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    responsible = Column(String, nullable=False)
    department = Column(String, nullable=False)
    period = Column(String, nullable=False)  # год, квартал, месяц, неделя
    deadline = Column(Date, nullable=False)
    priority = Column(String, nullable=False)  # высокий, средний, низкий
    status = Column(Enum(TaskStatus), default=TaskStatus.new)
    parent_task_id = Column(Integer, nullable=True)  # для связи задач (опционально)


# Модель пользователя для аутентификации и ролей
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="employee")  # admin, manager, employee
    full_name = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


# Создаём таблицы
Base.metadata.create_all(bind=engine)