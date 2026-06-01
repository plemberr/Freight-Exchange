from sqlalchemy.orm import Session
from app.db.models.transport import Transport


class TransportRepository:

    def create(self, db: Session, transport: Transport) -> Transport:
        db.add(transport)
        db.flush()
        return transport