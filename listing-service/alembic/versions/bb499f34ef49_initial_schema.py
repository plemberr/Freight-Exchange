"""initial_schema

Revision ID: bb499f34ef49
Revises:
Create Date: 2026-06-03 08:45:44.177765
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'bb499f34ef49'
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'listings',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('owner_id', sa.String(), nullable=False),
        sa.Column('type', sa.Enum('CARGO', 'TRANSPORT', name='listingtype'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'MODERATION', 'ACTIVE', 'REJECTED', 'ARCHIVED', name='listingstatus'), nullable=False),
        sa.Column('moderation_comment', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_index('ix_listings_owner_id', 'listings', ['owner_id'])
    op.create_index('ix_listings_status', 'listings', ['status'])

    op.create_table(
        'points',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('city', sa.String(length=255), nullable=False),
        sa.Column('country', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
    )

    op.create_table(
        'cargo',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('listing_id', sa.String(), sa.ForeignKey('listings.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('cargo_type', sa.String(length=255), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('volume', sa.Float(), nullable=True),
        sa.Column('length', sa.Float(), nullable=True),
        sa.Column('width', sa.Float(), nullable=True),
        sa.Column('height', sa.Float(), nullable=True),
        sa.Column('price', sa.Float(), nullable=True),
    )

    op.create_table(
        'transport',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('listing_id', sa.String(), sa.ForeignKey('listings.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('transport_type', sa.String(length=255), nullable=True),
        sa.Column('max_weight', sa.Float(), nullable=True),
        sa.Column('max_volume', sa.Float(), nullable=True),
    )

    op.create_table(
        'routes',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('listing_id', sa.String(), sa.ForeignKey('listings.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('origin_id', sa.String(), sa.ForeignKey('points.id')),
        sa.Column('destination_id', sa.String(), sa.ForeignKey('points.id')),
        sa.Column('distance_km', sa.Float(), nullable=True),
    )

    op.create_table(
        'route_waypoints',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('route_id', sa.String(), sa.ForeignKey('routes.id', ondelete='CASCADE')),
        sa.Column('point_id', sa.String(), sa.ForeignKey('points.id')),
        sa.Column('order_index', sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('route_waypoints')
    op.drop_table('routes')
    op.drop_table('transport')
    op.drop_table('cargo')
    op.drop_table('points')
    op.drop_table('listings')