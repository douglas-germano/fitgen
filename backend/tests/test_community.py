"""Community contracts with a real isolated SQLite DB; no live data or AI calls."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-community-test')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-community-jwt-secret-32chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import io
import tempfile
import unittest
from datetime import timedelta
from unittest.mock import patch
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from app.shared.extensions import db
from app.shared import model_registry
from app.commands import apply_community_sharing_defaults_command
from app.modules.identity.domain.models import User
from app.modules.community.domain.models import Activity, Challenge, ChallengeParticipant, CommunitySettings, ALL_TABLES, SETTING_FIELDS
from app.modules.community.application import graph, moderation, publisher, challenges
from app.modules.community.interface.routes_feed import feed_bp
from app.modules.community.interface.routes_groups import groups_bp
from app.modules.community.interface.routes_people import people_bp
from app.modules.community.interface.routes_challenges import challenges_bp
from app.modules.community.interface.routes_admin import clubs_admin_bp
from app.shared.utils.timezone import get_today_cuiaba


def real_jpeg(size=(1600, 1200)):
    """A decodable photo: feed posts are re-encoded by the server."""
    from PIL import Image
    out = io.BytesIO(); Image.new('RGB', size, (20, 120, 200)).save(out, 'JPEG'); return out.getvalue()


class CommunityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.app = Flask(__name__, instance_path=self.tmp.name)
        self.app.config.update(SQLALCHEMY_DATABASE_URI='sqlite://', JWT_SECRET_KEY='isolated-community-jwt-secret-32chars', TESTING=True)
        db.init_app(self.app)
        JWTManager(self.app)
        for bp in (feed_bp, groups_bp, people_bp, challenges_bp):
            self.app.register_blueprint(bp, url_prefix='/community')
        self.app.register_blueprint(clubs_admin_bp, url_prefix='/admin/clubs')
        self.app.cli.add_command(apply_community_sharing_defaults_command)
        self.ctx = self.app.app_context(); self.ctx.push()
        self.addCleanup(self.ctx.pop)
        # Legacy analytics constraints use PG-specific casts; this suite only needs these tables.
        needed = ['users', 'user_profiles', 'workout_sessions', 'meals', 'hydration_logs', 'hydration_goals', 'user_streaks', 'achievements', 'user_achievements', 'workout_plans', 'workout_days', 'notifications', 'audit_logs']
        db.metadata.create_all(db.engine, tables=[db.metadata.tables[n] for n in needed] + ALL_TABLES)
        self.addCleanup(db.engine.dispose)
        self.addCleanup(db.session.remove)
        self.users = [User(name=f'Pessoa {i}', email=f'{i}@test.invalid', password_hash='unused') for i in range(5)]
        db.session.add_all(self.users); db.session.commit()
        self.headers = [{'Authorization': 'Bearer ' + create_access_token(identity=str(u.id))} for u in self.users]
        self.client = self.app.test_client()
        for target in ('app.modules.community.application.moderation.check_text', 'app.modules.community.interface.routes_groups.notify', 'app.modules.community.interface.routes_feed.notify', 'app.modules.community.interface.routes_people.notify', 'app.modules.community.interface.routes_challenges.notify'):
            p = patch(target, return_value=(True, None) if target.endswith('check_text') else None); p.start(); self.addCleanup(p.stop)

    def request(self, path, user=0, method='get', **kwargs):
        return getattr(self.client, method)('/community' + path, headers=self.headers[user], **kwargs)

    def group(self):
        res = self.request('/groups', method='post', json={'name': 'Turma'})
        self.assertEqual(res.status_code, 201, res.json)
        return res.json

    def join(self, group, user=1):
        return self.request('/groups/join', user, 'post', json={'code': group['invite_code']})

    def test_group_invite_membership_admin_and_rotation(self):
        g = self.group()
        self.assertEqual(self.request('/groups/' + g['id'], 1).status_code, 404)
        self.assertEqual(self.join(g).status_code, 200)
        self.assertEqual(self.join(g).json['member_count'], 2)
        self.assertEqual(self.request('/groups/' + g['id'], 1, 'put', json={'name': 'Other'}).status_code, 403)
        self.assertEqual(self.join(g, 2).json['member_count'], 3)  # no member cap
        rotated = self.request('/groups/' + g['id'] + '/invite-code', method='post')
        self.assertEqual(rotated.status_code, 200)
        self.assertEqual(self.join(g, 2).status_code, 404)

    def test_sharing_defaults_and_search_respect_later_opt_out(self):
        uid = str(self.users[1].id)
        self.assertIsNone(db.session.get(CommunitySettings, self.users[1].id))
        found = self.request('/users/search?q=Pessoa+1').json
        self.assertEqual([user['id'] for user in found], [uid])
        self.assertEqual(self.request('/settings', 1).json, dict.fromkeys(SETTING_FIELDS, True))
        self.request('/settings', 1, 'put', json={'discoverable': False})
        self.assertEqual(self.request('/users/search?q=Pessoa+1').json, [])
        self.assertEqual(self.request('/users/' + uid).status_code, 404)
        self.users[2].soft_delete()
        db.session.commit()
        self.assertEqual(self.request('/users/search?q=Pessoa+2').json, [])

    def test_existing_settings_are_enabled_once_without_creating_publications(self):
        uid = self.users[0].id
        self.request('/settings', method='put', json=dict.fromkeys(SETTING_FIELDS, False))
        friend_code = graph.settings_for(uid).friend_code
        runner = self.app.test_cli_runner()
        applied = runner.invoke(args=['apply-community-sharing-defaults'])
        self.assertEqual(applied.exit_code, 0, applied.output)
        self.assertIn('1 existing settings rows', applied.output)
        self.assertEqual(self.request('/settings').json, dict.fromkeys(SETTING_FIELDS, True))
        self.assertEqual(graph.settings_for(uid).friend_code, friend_code)
        self.assertEqual(Activity.query.count(), 0)
        self.request('/settings', method='put', json={'share_hydration': False})
        repeated = runner.invoke(args=['apply-community-sharing-defaults'])
        self.assertEqual(repeated.exit_code, 0, repeated.output)
        self.assertIn('already applied', repeated.output)
        self.assertFalse(self.request('/settings').json['share_hydration'])

    def test_auto_feed_deduplicates_and_respects_sharing_controls(self):
        uid = self.users[0].id
        self.request('/settings', method='put', json={'share_workouts': False, 'share_hydration': False})
        self.assertIsNone(publisher.publish(uid, 'workout_completed', {'workout_name': 'A'}, source_id='s'))
        self.request('/settings', method='put', json={'share_workouts': True})
        first = publisher.publish(uid, 'workout_completed', {'workout_name': 'A'}, source_id='s')
        second = publisher.publish(uid, 'workout_completed', {'workout_name': 'A'}, source_id='s')
        self.assertEqual(first.id, second.id)
        self.assertEqual(Activity.query.count(), 1)
        self.assertFalse(graph.settings_for(uid).share_hydration)

    def test_group_post_visibility_reaction_comment_block(self):
        g = self.group(); self.join(g)
        post = self.request('/posts', method='post', json={'text': 'Treino feito', 'audience': 'group', 'group_id': g['id']}).json
        path = '/activities/' + post['id']
        self.assertEqual(self.request(path, 2).status_code, 404)
        self.assertEqual(self.request(path + '/reaction', 1, 'put', json={'kind': 'fire'}).json['reaction_total'], 1)
        self.assertEqual(self.request(path + '/reaction', 1, 'put', json={'kind': 'heart'}).json['reaction_total'], 1)
        comment = self.request(path + '/comments', 1, 'post', json={'text': 'Boa!'}).json
        self.assertEqual(self.request('/comments/' + comment['id'], 2, 'delete').status_code, 404)
        self.request('/blocks', 1, 'post', json={'user_id': str(self.users[0].id)})
        self.assertEqual(self.request(path, 1).status_code, 404)
        self.assertTrue(all(a['user']['id'] != str(self.users[0].id) for a in self.request('/feed?scope=home', 1).json['items']))

    def test_friendship_acceptance_and_follow_do_not_grant_private_access(self):
        self.request('/settings', method='put', json={'discoverable': True, 'share_workouts': True})
        public = self.request('/posts', method='post', json={'text': 'Public', 'audience': 'public'}).json
        private = self.request('/posts', method='post', json={'text': 'Turma', 'audience': 'network'}).json
        uid = str(self.users[0].id)
        self.assertEqual(self.request('/users/' + uid, 1).json['stats'], {})
        self.assertEqual(self.request('/users/' + uid + '/follow', 1, 'put').status_code, 201)
        self.assertEqual(self.request('/feed', 1).json['items'], [])
        self.assertEqual(self.request('/users/' + uid, 1).json['follow_state'], 'pending')
        self.assertEqual(self.request('/activities/' + private['id'], 1).status_code, 404)
        self.request('/friends/requests', 1, 'post', json={'user_id': uid})
        received = self.request('/friends').json['received'][0]
        self.assertEqual(self.request('/friends/requests/' + received['id'] + '/accept', 1, 'post').status_code, 404)
        self.assertEqual(self.request('/friends/requests/' + received['id'] + '/accept', 0, 'post').status_code, 200)
        self.assertEqual(self.request('/activities/' + private['id'], 1).status_code, 200)
        self.assertIn('month_workouts', self.request('/users/' + uid, 1).json['stats'])
        self.request('/blocks', 0, 'post', json={'user_id': str(self.users[1].id)})
        self.assertEqual(graph.followed_ids(self.users[1].id), set())
        self.assertEqual(graph.friend_ids(self.users[1].id), set())

    def test_follow_requests_notify_require_explicit_accept_and_allow_independent_reverse(self):
        from app.modules.community.interface import routes_people as routes
        from app.modules.communication.application.notification_service import NotificationService
        from app.modules.communication.domain.notification import Notification
        from app.modules.community.domain.models import Friendship
        for u in (0, 1):
            self.request('/settings', u, 'put', json={'discoverable': True})
        target = str(self.users[1].id)
        def persist(uid, title, message, **kwargs):
            return NotificationService.trigger_notification(uid, 'social', title, message, **kwargs)
        with patch.object(routes, 'notify', side_effect=persist), patch('app.modules.communication.domain.device_token.DeviceToken') as devices:
            devices.query.filter_by.return_value.all.return_value = []
            sent = self.request('/users/' + target + '/follow', 0, 'put')
            self.assertEqual(sent.status_code, 201)
            rid = sent.json['request_id']
            self.assertEqual(sent.json['state'], 'pending')
            self.request('/users/' + target + '/follow', 0, 'put')
            self.assertEqual(Notification.query.count(), 1)
            n = Notification.query.one()
            self.assertEqual(n.user_id, self.users[1].id)
            self.assertEqual(n.link_type, 'community_follow_request')
            self.assertEqual(str(n.link_id), rid)
            self.assertFalse(n.is_read)
            # Request recipient may view the sender's basic profile even when private.
            self.assertEqual(self.request('/users/' + str(self.users[0].id), 1).status_code, 200)
            self.assertEqual(self.request('/friends/requests/' + rid + '/accept', 2, 'post').status_code, 404)
            reverse = self.request('/users/' + str(self.users[0].id) + '/follow', 1, 'put')
            self.assertEqual(reverse.json['state'], 'pending')
            self.assertEqual(Friendship.query.filter_by(status='accepted').count(), 0)
            self.assertEqual(self.request('/friends/requests/' + rid + '/accept', 1, 'post').status_code, 200)
            self.assertTrue(db.session.get(Notification, n.id).is_read)
            self.assertIn(self.users[1].id, graph.followed_ids(self.users[0].id))
            self.assertNotIn(self.users[0].id, graph.followed_ids(self.users[1].id))
            self.assertEqual(self.request('/friends/requests/' + rid + '/accept', 1, 'post').status_code, 404)
            self.assertEqual(Notification.query.filter_by(user_id=self.users[0].id, link_type='community_user').count(), 1)
            reverse_id = reverse.json['request_id']
            self.assertEqual(self.request('/friends/requests/' + reverse_id, 0, 'delete').status_code, 200)
            retry = self.request('/users/' + str(self.users[0].id) + '/follow', 1, 'put')
            self.assertEqual(retry.json['state'], 'pending')
            self.assertEqual(Notification.query.filter_by(user_id=self.users[0].id, link_type='community_follow_request').count(), 2)
            self.request('/users/' + target + '/follow', 0, 'delete')
            self.assertNotIn(self.users[1].id, graph.followed_ids(self.users[0].id))
            self.request('/blocks', 0, 'post', json={'user_id': target})
            self.assertEqual(Friendship.query.count(), 0)
            self.assertEqual(self.request('/users/' + target + '/follow', 0, 'put').status_code, 404)

    def test_friend_code_flow_is_no_longer_available(self):
        self.assertNotIn('friend_code', self.request('/settings').json)
        code = graph.settings_for(self.users[0].id).friend_code
        self.assertEqual(self.request('/friends/requests', 1, 'post', json={'code': code}).status_code, 404)
        self.assertEqual(self.request('/settings/friend-code', method='post').status_code, 404)

    def test_cursor_and_unique_reports_auto_hide(self):
        for i in range(3):
            self.request('/posts', method='post', json={'text': str(i), 'audience': 'public'})
        page = self.request('/feed?scope=public&limit=2').json
        next_page = self.request('/feed?scope=public&limit=2&cursor=' + page['next_cursor']).json
        self.assertEqual(len(next_page['items']), 1)
        self.assertNotIn(next_page['items'][0]['id'], [a['id'] for a in page['items']])
        ident = page['items'][0]['id']
        for u in (1, 1, 2):
            self.request('/reports', u, 'post', json={'target_type': 'activity', 'target_id': ident})
        self.assertEqual(self.request('/activities/' + ident, 4).status_code, 200)
        self.request('/reports', 3, 'post', json={'target_type': 'activity', 'target_id': ident})
        self.assertEqual(self.request('/activities/' + ident, 4).status_code, 404)

    def test_challenge_creation_progress_completion_idempotence(self):
        g = self.group(); self.join(g)
        body = {'title': 'Treinar', 'metric': 'workouts', 'target': 1, 'duration_days': 7, 'group_id': g['id']}
        res = self.request('/challenges', method='post', json=body)
        self.assertEqual(res.status_code, 201, res.json)
        cid = res.json['id']; path = '/challenges/' + cid
        self.assertEqual(self.request(path, 2).status_code, 404)
        self.assertEqual(self.request('/challenges', 1, 'post', json={**body, 'is_public': True}).status_code, 403)
        self.assertEqual(self.request('/challenges', method='post', json={**body, 'metric': 'active_days', 'target': 8}).status_code, 400)
        challenge = db.session.get(Challenge, graph.as_uuid(cid))
        with patch('app.modules.community.application.challenges._award') as award, patch('app.modules.community.application.challenges.notify'):
            challenges.complete_if_reached(challenge, {self.users[0].id: 1})
            challenges.complete_if_reached(challenge, {self.users[0].id: 1})
            award.assert_called_once()
        self.assertIsNotNone(challenge.participants[0].completed_at)

    def test_logged_workout_updates_progress_awards_once_and_respects_ranking_privacy(self):
        from app.modules.training.domain.models import WorkoutSession, WorkoutPlan, WorkoutDay
        from app.modules.identity.domain.models import UserProfile
        from app.modules.gamification.domain.achievements import UserAchievement
        from app.modules.community.application import metrics
        from app.shared.utils.timezone import now_cuiaba
        uid = self.users[0].id
        profile = UserProfile(user_id=uid, xp=0, level=1)
        db.session.add(profile)
        plan = WorkoutPlan(user_id=uid, name='Treino')
        db.session.add(plan); db.session.flush()
        day = WorkoutDay(workout_plan_id=plan.id, user_id=uid, name='A', day_of_week='monday')
        db.session.add(day); db.session.flush()
        session = WorkoutSession(user_id=uid, workout_day_id=day.id, status='completed', completed_at=now_cuiaba(), total_duration_seconds=1800)
        db.session.add(session); db.session.commit()
        today = get_today_cuiaba()
        challenge = Challenge(title='Um treino', metric='workouts', target=1, start_date=today, end_date=today + timedelta(days=7), is_public=True)
        challenge.participants.append(ChallengeParticipant(user_id=uid))
        db.session.add(challenge); db.session.commit()
        self.assertEqual(challenges.progress_by_user(challenge)[uid], 1)
        with patch('app.modules.community.application.challenges.notify'):
            challenges.refresh_user(uid)
            challenges.refresh_user(uid)
        self.assertEqual(profile.xp, 100)
        self.assertEqual(UserAchievement.query.count(), 1)
        self.assertEqual(self.request('/challenges/' + str(challenge.id) + '/leave', method='post').status_code, 409)
        self.request('/settings', method='put', json={'share_workouts': False})
        self.assertEqual(metrics.weekly_ranking([uid])[0]['workouts'], 0)
        self.request('/settings', method='put', json={'share_workouts': True})
        self.assertEqual(metrics.weekly_ranking([uid])[0]['workouts'], 1)

    def test_reward_failure_does_not_commit_completion(self):
        g = self.group()
        res = self.request('/challenges', method='post', json={'title': 'Um treino', 'metric': 'workouts', 'target': 1, 'duration_days': 7, 'group_id': g['id']})
        challenge = db.session.get(Challenge, graph.as_uuid(res.json['id']))
        with patch('app.modules.community.application.challenges._award', side_effect=RuntimeError('award failed')):
            with self.assertRaises(RuntimeError):
                challenges.complete_if_reached(challenge, {self.users[0].id: 1})
        db.session.rollback()
        self.assertIsNone(challenge.participants[0].completed_at)

    def test_temporarily_disabled_moderation_does_not_call_provider(self):
        self.app.config['COMMUNITY_MODERATION_ENABLED'] = False
        data = real_jpeg()
        with patch.object(moderation, '_ai') as ai:
            self.assertEqual(moderation.check_text('Texto de teste'), (True, None))
            self.assertEqual(moderation.check_image(data, 'image/jpeg'), (True, None))
            response = self.request('/posts', method='post', data={'text': 'Foto de treino', 'file': (io.BytesIO(data), 'foto.jpg')})
            self.assertEqual(response.status_code, 201, response.json)
            ai.assert_not_called()
        # File validation continues to apply even with moderation off.
        response = self.request('/posts', method='post', data={'file': (io.BytesIO(b'not an image'), 'foto.jpg')})
        self.assertEqual(response.status_code, 400)

    def test_group_photo_create_read_replace_remove_and_permissions(self):
        from pathlib import Path
        self.app.config['COMMUNITY_MODERATION_ENABLED'] = False
        jpeg = b'\xff\xd8\xff\xe0' + b'\0' * 32
        response = self.request('/groups', method='post', data={'name': 'Clube com foto', 'file': (io.BytesIO(jpeg), 'IMG.HEIC')})
        self.assertEqual(response.status_code, 201, response.json)
        group = response.json
        self.assertTrue(group['profile_picture'].endswith('.jpg'))
        first = Path(self.tmp.name) / group['profile_picture']
        self.assertTrue(first.exists())
        self.assertEqual(self.request('/groups').json[0]['profile_picture'], group['profile_picture'])
        self.join(group)
        path = '/groups/' + group['id'] + '/image'
        self.assertEqual(self.request(path, 1).status_code, 200)
        self.assertEqual(self.request(path, 1).headers['Cache-Control'], 'no-store')
        self.assertEqual(self.request(path, 2).status_code, 404)
        self.assertEqual(self.client.get('/community' + path).status_code, 401)
        self.assertEqual(self.request(path, 1, 'post', data={'file': (io.BytesIO(jpeg), 'a.jpg')}).status_code, 403)
        self.assertEqual(self.request(path, 1, 'delete').status_code, 403)
        self.assertEqual(self.request(path, method='post', data={'file': (io.BytesIO(b'invalid'), 'a.jpg')}).status_code, 400)
        self.assertTrue(first.exists())
        replacement = self.request(path, method='post', data={'file': (io.BytesIO(jpeg), 'a.jpg')})
        self.assertEqual(replacement.status_code, 200)
        self.assertNotEqual(replacement.json['profile_picture'], group['profile_picture'])
        self.assertFalse(first.exists())
        second = Path(self.tmp.name) / replacement.json['profile_picture']
        self.assertTrue(second.exists())
        self.assertEqual(self.request(path, method='delete').json['profile_picture'], None)
        self.assertFalse(second.exists())
        self.assertEqual(self.request(path).status_code, 404)

    def test_group_photo_invalid_upload_does_not_create_group_and_delete_cleans_file(self):
        from pathlib import Path
        from app.modules.community.domain.models import CommunityGroup
        self.app.config['COMMUNITY_MODERATION_ENABLED'] = False
        res = self.request('/groups', method='post', data={'name': 'Clube', 'file': (io.BytesIO(b'invalid'), 'a.jpg')})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(CommunityGroup.query.count(), 0)
        jpeg = b'\xff\xd8\xff\xe0' + b'\0' * 32
        with patch('app.modules.community.interface.routes_feed.MAX_POST_IMAGE_BYTES', 16):
            res = self.request('/groups', method='post', data={'name': 'Clube', 'file': (io.BytesIO(jpeg), 'a.jpg')})
            self.assertEqual(res.status_code, 400)
            self.assertEqual(CommunityGroup.query.count(), 0)
        res = self.request('/groups', method='post', data={'name': 'Clube', 'file': (io.BytesIO(jpeg), 'a.jpg')})
        picture = Path(self.tmp.name) / res.json['profile_picture']
        self.assertTrue(picture.exists())
        self.request('/groups/' + res.json['id'], method='delete')
        self.assertFalse(picture.exists())

    def test_public_club_discovery_and_entry_preserve_member_only_content(self):
        private = self.group()
        self.assertFalse(private['is_public'])
        self.assertEqual(self.request('/groups?scope=public', 1).json, [])
        self.assertEqual(self.request('/groups/join', 1, 'post', json={'group_id': private['id']}).status_code, 404)
        public = self.request('/groups', method='post', json={'name': 'Aberto', 'is_public': True}).json
        self.assertTrue(public['is_public'])
        discovered = self.request('/groups?scope=public', 1).json
        self.assertEqual([g['id'] for g in discovered], [public['id']])
        self.assertNotIn('invite_code', discovered[0])
        page = self.request('/groups/' + public['id'], 1)
        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.json['members'], [])
        self.assertEqual(page.json['challenges'], [])
        self.assertIsNone(page.json['my_role'])
        self.assertEqual(self.request('/feed?scope=group&group_id=' + public['id'], 1).status_code, 404)
        self.assertEqual(self.request('/groups/' + public['id'] + '/summary', 1).status_code, 404)
        self.assertEqual(self.request('/posts', 1, 'post', json={'audience': 'group', 'group_id': public['id'], 'text': 'Test'}).status_code, 403)
        joined = self.request('/groups/join', 1, 'post', json={'group_id': public['id']})
        self.assertEqual(joined.status_code, 200)
        self.assertEqual(self.request('/feed?scope=group&group_id=' + public['id'], 1).status_code, 200)
        self.assertEqual(self.request('/groups/' + public['id'], 1, 'put', json={'is_public': False}).status_code, 403)
        self.assertEqual(self.request('/groups/' + public['id'], method='put', json={'is_public': False}).status_code, 200)
        self.assertEqual(self.request('/groups?scope=public', 2).json, [])
        self.assertEqual(self.request('/groups/' + public['id'], 2).status_code, 404)
        self.assertEqual(self.request('/groups/' + public['id'], 1).status_code, 200)

    def test_public_club_visibility_validation_photo_and_blocks(self):
        self.app.config['COMMUNITY_MODERATION_ENABLED'] = False
        for bad in ('true', 'false', None, 1, 'invalid'):
            self.assertEqual(self.request('/groups', method='post', json={'name': 'Clube', 'is_public': bad}).status_code, 400)
        jpeg = b'\xff\xd8\xff\xe0' + b'\0' * 32
        public = self.request('/groups', method='post', data={'name': 'Público', 'is_public': 'true', 'file': (io.BytesIO(jpeg), 'a.jpg')}).json
        self.assertTrue(public['is_public'])
        self.assertEqual(self.request('/groups/' + public['id'] + '/image', 1).status_code, 200)
        self.request('/blocks', 0, 'post', json={'user_id': str(self.users[1].id)})
        self.assertEqual(self.request('/groups?scope=public', 1).json, [])
        self.assertEqual(self.request('/groups/' + public['id'], 1).status_code, 404)
        self.assertEqual(self.request('/groups/' + public['id'] + '/image', 1).status_code, 404)
        self.assertEqual(self.request('/groups/join', 1, 'post', json={'group_id': public['id']}).status_code, 403)

    def test_photo_moderation_failure_and_private_delivery(self):
        data = real_jpeg()
        with patch.object(moderation, '_ai') as ai:
            ai.return_value.analyze_image.return_value = None
            self.assertFalse(moderation.check_image(data, 'image/jpeg')[0])
            res = self.request('/posts', method='post', data={'text': 'Foto', 'file': (io.BytesIO(data), 'foto.jpg')})
            self.assertEqual(res.status_code, 422)
            ai.return_value.analyze_image.return_value = {'allowed': True}
            res = self.request('/posts', method='post', data={'text': 'Foto', 'file': (io.BytesIO(data), 'foto.jpg')})
        self.assertEqual(res.status_code, 201, res.json)
        path = '/activities/' + res.json['id'] + '/image'
        self.assertEqual(self.request(path).status_code, 200)
        self.assertEqual(self.request(path, 1).status_code, 404)
        self.assertEqual(self.client.get('/community' + path).status_code, 401)
        self.assertEqual(self.request(path).headers['Cache-Control'], 'no-store')

    def test_feed_photo_is_reencoded_to_the_chosen_format(self):
        from PIL import Image
        self.app.config['COMMUNITY_MODERATION_ENABLED'] = False
        for ratio, expected in (('4:5', (960, 1200)), ('9:16', (675, 1200))):
            res = self.request('/posts', method='post', data={'text': 'x', 'ratio': ratio, 'file': (io.BytesIO(real_jpeg((1600, 1200))), 'f.jpg')})
            self.assertEqual(res.status_code, 201, res.json)
            self.assertEqual(res.json['payload']['ratio'], ratio)
            self.assertTrue(res.json['image'].endswith('.jpg'))
            body = self.request('/activities/' + res.json['id'] + '/image').json
            stored = Image.open(io.BytesIO(__import__('base64').b64decode(body['data_uri'].split(',', 1)[1])))
            self.assertEqual(stored.size, expected)
        bad = self.request('/posts', method='post', data={'text': 'x', 'file': (io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'0' * 20), 'f.png')})
        self.assertEqual(bad.status_code, 400)

    def admin(self, path, method='get', user=4, **kwargs):
        return getattr(self.client, method)('/admin/clubs' + path, headers=self.headers[user], **kwargs)

    def test_admin_clubs_requires_admin(self):
        self.assertEqual(self.admin('').status_code, 403)

    def test_admin_clubs_manage(self):
        self.users[4].role = 'admin'; db.session.commit()
        g = self.group(); self.join(g); self.join(g, 2)
        listing = self.admin('?search=' + g['name'][:3]).json
        self.assertEqual(listing['total'], 1)
        self.assertEqual(listing['clubs'][0]['member_count'], 3)
        self.assertEqual(listing['stats']['memberships'], 3)
        detail = self.admin('/' + g['id']).json
        self.assertEqual([m['role'] for m in detail['members']], ['admin', 'member', 'member'])
        self.assertEqual(self.admin('/' + g['id'], 'put', json={'name': 'Novo nome', 'is_public': True}).status_code, 200)
        self.assertEqual(self.admin('/' + g['id']).json['name'], 'Novo nome')
        owner = detail['members'][0]['id']
        self.assertEqual(self.admin(f"/{g['id']}/members/{owner}/role", 'put', json={'role': 'member'}).status_code, 400)
        self.assertEqual(self.admin(f"/{g['id']}/members/{owner}", 'delete').status_code, 200)
        after = self.admin('/' + g['id']).json
        self.assertEqual(after['member_count'], 2)
        self.assertIn('admin', [m['role'] for m in after['members']])
        self.assertEqual(after['owner']['id'], next(m['id'] for m in after['members'] if m['role'] == 'admin'))
        old_code = after['invite_code']
        self.assertNotEqual(self.admin(f"/{g['id']}/invite-code", 'post').json['invite_code'], old_code)
        self.assertEqual(self.admin('/' + g['id'], 'delete').status_code, 200)
        self.assertEqual(self.admin('/' + g['id']).status_code, 404)

if __name__ == '__main__':
    unittest.main()
