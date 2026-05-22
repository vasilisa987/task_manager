from sqlalchemy.orm import Session
from database import TaskDB, TaskStatus
from schemas import TaskCreate, TaskUpdate
from datetime import date


def get_task(db: Session, task_id: int):
    return db.query(TaskDB).filter(TaskDB.id == task_id).first()


def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TaskDB).offset(skip).limit(limit).all()


def create_task(db: Session, task: TaskCreate):
    db_task = TaskDB(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: int, task_update: TaskUpdate):
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int):
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False


# Автоматически помечать просроченные задачи (вызывать при каждом запросе)
def mark_overdue_tasks(db: Session):
    today = date.today()
    tasks = (
        db.query(TaskDB)
        .filter(TaskDB.deadline < today, TaskDB.status != TaskStatus.done)
        .all()
    )
    for t in tasks:
        t.status = TaskStatus.overdue
    db.commit()
