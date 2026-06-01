from sqlalchemy.orm import Session
from app.db.models.cargo import Cargo


class CargoRepository:

    def create(self, db: Session, cargo: Cargo) -> Cargo:
        db.add(cargo)
        db.flush()
        return cargo