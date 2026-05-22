from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
import jwt
from werkzeug.security import check_password_hash, generate_password_hash
import crud, schemas, ai_helper
from database import SessionLocal, TaskStatus, UserDB

# Настройки JWT
SECRET_KEY = "taskmanager-super-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 дней

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

app = FastAPI(title="Task Manager API")

# Разрешаем запросы с React (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency: получаем сессию БД
def get_db():
    db = SessionLocal()
    try:
        crud.mark_overdue_tasks(db)
        yield db
    finally:
        db.close()


# ---------- Функции для аутентификации ----------
def verify_password(plain_password, hashed_password):
    return check_password_hash(hashed_password, plain_password)


def get_password_hash(password):
    return generate_password_hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Неверный токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        user = db.query(UserDB).filter(UserDB.username == username).first()
        if user is None:
            raise credentials_exception
        return user
    except jwt.PyJWTError:
        raise credentials_exception


def require_role(required_role: str):
    def role_checker(current_user: UserDB = Depends(get_current_user)):
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        return current_user
    return role_checker


# ---------- Эндпоинты для аутентификации ----------
@app.post("/api/register")
def register(username: str, password: str, full_name: str = "", role: str = "employee", db: Session = Depends(get_db)):
    existing = db.query(UserDB).filter(UserDB.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    
    new_user = UserDB(
        username=username,
        password_hash=get_password_hash(password),
        role=role,
        full_name=full_name
    )
    db.add(new_user)
    db.commit()
    return {"message": "Пользователь создан", "username": username, "role": role}


@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль")
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username, "full_name": user.full_name}


@app.get("/api/me")
def get_me(current_user: UserDB = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "role": current_user.role, "full_name": current_user.full_name}


# ---------- Эндпоинты для задач (с защитой по ролям) ----------
@app.post("/tasks/", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(require_role("manager"))):
    return crud.create_task(db, task)


@app.get("/tasks/", response_model=List[schemas.Task])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    tasks = crud.get_tasks(db, skip=skip, limit=limit)
    # Сотрудники видят только свои задачи (по full_name, а не по username)
    if current_user.role == "employee":
        tasks = [t for t in tasks if t.responsible == current_user.full_name]
    return tasks


@app.get("/tasks/{task_id}", response_model=schemas.Task)
def read_task(task_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    # Сотрудники видят только свои задачи
    if current_user.role == "employee" and task.responsible != current_user.full_name:
        raise HTTPException(status_code=403, detail="Нет доступа к этой задаче")
    return task


@app.put("/tasks/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(require_role("manager"))
):
    task = crud.update_task(db, task_id, task_update)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(require_role("admin"))):
    success = crud.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


# ---------- Эндпоинты для аналитики ----------
@app.get("/analytics/dashboard")
def get_dashboard_data(db: Session = Depends(get_db), current_user: UserDB = Depends(require_role("manager"))):
    tasks = crud.get_tasks(db, limit=1000)
    total = len(tasks)
    by_status = {s: 0 for s in TaskStatus}
    by_department = {}
    by_period = {}
    overdue_count = 0
    for t in tasks:
        by_status[t.status] = by_status.get(t.status, 0) + 1
        by_department[t.department] = by_department.get(t.department, 0) + 1
        by_period[t.period] = by_period.get(t.period, 0) + 1
        if t.status == TaskStatus.overdue:
            overdue_count += 1
    employee_load = {}
    for t in tasks:
        if t.status not in [TaskStatus.done, TaskStatus.overdue]:
            employee_load[t.responsible] = employee_load.get(t.responsible, 0) + 1
    return {
        "total": total,
        "status_distribution": by_status,
        "department_distribution": by_department,
        "period_distribution": by_period,
        "overdue_count": overdue_count,
        "employee_load": employee_load,
        "high_priority_tasks": [
            {"id": t.id, "title": t.title, "deadline": t.deadline}
            for t in tasks
            if t.priority == "высокий" and t.status != TaskStatus.done
        ],
    }


# ---------- Эндпоинты для AI ----------
@app.get("/ai/summary")
def ai_summary(db: Session = Depends(get_db), current_user: UserDB = Depends(require_role("manager"))):
    return {"summary": ai_helper.get_ai_summary(db)}


@app.get("/ai/weekly_report")
def ai_weekly_report(db: Session = Depends(get_db), current_user: UserDB = Depends(require_role("manager"))):
    return {"report": ai_helper.get_weekly_report(db)}


@app.get("/ai/risk_tasks")
def risk_tasks(db: Session = Depends(get_db), current_user: UserDB = Depends(require_role("manager"))):
    tasks = crud.get_tasks(db, limit=1000)
    today = date.today()
    risky = []
    for t in tasks:
        if t.status not in [TaskStatus.done, TaskStatus.overdue]:
            days_left = (t.deadline - today).days
            if days_left <= 2 or t.priority == "высокий" and days_left <= 5:
                risky.append(
                    {
                        "id": t.id,
                        "title": t.title,
                        "deadline": t.deadline,
                        "responsible": t.responsible,
                    }
                )
    return {"risky_tasks": risky}


@app.post("/api/ai/ask")
async def ask_ai(request: Request, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    data = await request.json()
    question = data.get("question", "")
    answer = ai_helper.answer_question(question, db)
    return {"answer": answer}