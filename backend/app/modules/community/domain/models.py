"""Community: groups, activity feed, reactions, comments, challenges, friends, safety."""
import secrets
import uuid

from sqlalchemy.dialects.postgresql import UUID

from app.shared.extensions import db
from app.shared.utils.timezone import now_cuiaba

# No 0/O/1/I/L: codes are read aloud and typed from WhatsApp messages.
CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
SETTING_FIELDS = ('share_workouts', 'share_achievements', 'share_streaks', 'share_challenges', 'share_hydration', 'discoverable')


def new_code(length=8):
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def _user_fk():
    return db.ForeignKey('users.id', ondelete='CASCADE')


class CommunitySettings(db.Model):
    """What a user shares automatically and whether strangers can find them."""
    __tablename__ = 'community_settings'

    user_id = db.Column(UUID(as_uuid=True), _user_fk(), primary_key=True)
    share_workouts = db.Column(db.Boolean, nullable=False, default=True)
    share_achievements = db.Column(db.Boolean, nullable=False, default=True)
    share_streaks = db.Column(db.Boolean, nullable=False, default=True)
    share_challenges = db.Column(db.Boolean, nullable=False, default=True)
    share_hydration = db.Column(db.Boolean, nullable=False, default=True)
    discoverable = db.Column(db.Boolean, nullable=False, default=True)
    friend_code = db.Column(db.String(12), unique=True, nullable=False, default=new_code)
    updated_at = db.Column(db.DateTime, default=now_cuiaba, onupdate=now_cuiaba)


class CommunityGroup(db.Model):
    __tablename__ = 'community_groups'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(60), nullable=False)
    description = db.Column(db.String(280))
    profile_picture = db.Column(db.String(500))
    is_public = db.Column(db.Boolean, nullable=False, default=False, server_default='false', index=True)
    invite_code = db.Column(db.String(12), unique=True, nullable=False, default=new_code, index=True)
    owner_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)
    # Weekly AI summary cache.
    summary_text = db.Column(db.Text)
    summary_week = db.Column(db.Date)

    members = db.relationship('GroupMember', back_populates='group', cascade='all, delete-orphan', lazy='selectin')


class GroupMember(db.Model):
    __tablename__ = 'community_group_members'
    __table_args__ = (db.UniqueConstraint('group_id', 'user_id', name='uq_group_member'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(UUID(as_uuid=True), db.ForeignKey('community_groups.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    role = db.Column(db.String(10), nullable=False, default='member')  # 'admin' | 'member'
    joined_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)

    group = db.relationship('CommunityGroup', back_populates='members')


class Activity(db.Model):
    """A feed item. Automatic events (workout, streak…) or a manual post.

    audience: 'group' (only `group_id`), 'network' (my groups + friends), 'public'.
    """
    __tablename__ = 'community_activities'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'type', 'source_id', name='uq_activity_source'),
        db.Index('ix_activity_created', 'created_at', 'id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    type = db.Column(db.String(30), nullable=False)
    audience = db.Column(db.String(10), nullable=False, default='network')
    group_id = db.Column(UUID(as_uuid=True), db.ForeignKey('community_groups.id', ondelete='CASCADE'), index=True)
    payload = db.Column(db.JSON, nullable=False, default=dict)
    text = db.Column(db.Text)
    image_path = db.Column(db.String(500))
    source_id = db.Column(db.String(120))
    status = db.Column(db.String(10), nullable=False, default='visible')  # 'visible' | 'hidden'
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)


REACTION_KINDS = ('fire', 'clap', 'muscle', 'heart')


class Reaction(db.Model):
    __tablename__ = 'community_reactions'
    __table_args__ = (db.UniqueConstraint('activity_id', 'user_id', name='uq_reaction_user'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = db.Column(UUID(as_uuid=True), db.ForeignKey('community_activities.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False)
    kind = db.Column(db.String(10), nullable=False, default='fire')
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)


class Comment(db.Model):
    __tablename__ = 'community_comments'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = db.Column(UUID(as_uuid=True), db.ForeignKey('community_activities.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(10), nullable=False, default='visible')
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)


CHALLENGE_METRICS = {
    'workouts': 'treinos',
    'active_days': 'dias ativos',
    'workout_minutes': 'minutos de treino',
    'hydration_days': 'dias na meta de água',
    'meals': 'refeições registradas',
}


class Challenge(db.Model):
    """Time-boxed goal. group_id set → group challenge; otherwise a public FitGen challenge."""
    __tablename__ = 'community_challenges'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(UUID(as_uuid=True), db.ForeignKey('community_groups.id', ondelete='CASCADE'), index=True)
    creator_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    title = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(280))
    metric = db.Column(db.String(20), nullable=False)
    target = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_public = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)

    participants = db.relationship('ChallengeParticipant', back_populates='challenge', cascade='all, delete-orphan', lazy='selectin')


class ChallengeParticipant(db.Model):
    __tablename__ = 'community_challenge_participants'
    __table_args__ = (db.UniqueConstraint('challenge_id', 'user_id', name='uq_challenge_participant'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = db.Column(UUID(as_uuid=True), db.ForeignKey('community_challenges.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    joined_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)
    completed_at = db.Column(db.DateTime)

    challenge = db.relationship('Challenge', back_populates='participants')


class Friendship(db.Model):
    """Mutual friendship: a request becomes a friendship once the addressee accepts."""
    __tablename__ = 'community_friendships'
    __table_args__ = (db.UniqueConstraint('requester_id', 'addressee_id', name='uq_friendship_pair'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    addressee_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    status = db.Column(db.String(10), nullable=False, default='pending')  # 'pending' | 'accepted'
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)
    accepted_at = db.Column(db.DateTime)


class Follow(db.Model):
    """Following only adds public posts to the home feed; never grants private access."""
    __tablename__ = 'community_follows'
    __table_args__ = (db.UniqueConstraint('follower_id', 'followed_id', name='uq_follow_pair'),)
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    followed_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)


class Block(db.Model):
    __tablename__ = 'community_blocks'
    __table_args__ = (db.UniqueConstraint('blocker_id', 'blocked_id', name='uq_block_pair'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    blocked_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)


REPORT_TARGETS = ('activity', 'comment', 'user')
AUTO_HIDE_REPORTS = 3


class Report(db.Model):
    __tablename__ = 'community_reports'
    __table_args__ = (db.UniqueConstraint('reporter_id', 'target_type', 'target_id', name='uq_report_once'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = db.Column(UUID(as_uuid=True), _user_fk(), nullable=False)
    target_type = db.Column(db.String(10), nullable=False)
    target_id = db.Column(UUID(as_uuid=True), nullable=False, index=True)
    reason = db.Column(db.String(280))
    status = db.Column(db.String(10), nullable=False, default='open')  # 'open' | 'resolved'
    created_at = db.Column(db.DateTime, nullable=False, default=now_cuiaba)


ALL_TABLES = [
    CommunitySettings.__table__, CommunityGroup.__table__, GroupMember.__table__, Activity.__table__,
    Reaction.__table__, Comment.__table__, Challenge.__table__, ChallengeParticipant.__table__,
    Friendship.__table__, Follow.__table__, Block.__table__, Report.__table__,
]
