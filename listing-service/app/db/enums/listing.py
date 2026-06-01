from enum import Enum


class ListingType(str, Enum):
    CARGO = "CARGO"
    TRANSPORT = "TRANSPORT"


class ListingStatus(str, Enum):
    DRAFT = "DRAFT"
    MODERATION = "MODERATION"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"