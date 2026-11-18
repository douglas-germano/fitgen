import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { prepareFeedPhoto } from '@/lib/photo';
import { uploadableFile } from '@/lib/upload';
import type {
  Audience,
  Challenge,
  ChallengeDetail,
  ChallengeMetric,
  CommunityActivity,
  CommunityComment,
  CommunityGroup,
  CommunityProfile,
  CommunitySettings,
  CommunityUser,
  FeedPage,
  FriendsList,
  GroupDetail,
  GroupPreview,
  ImageRatio,
  ReactionKind,
  UserSearchResult,
} from '@/types/api';

const C = '/community';

/** /image endpoints answer with a temporary `url` (R2) or, for legacy local files, a `data_uri`. */
export type ImagePayload = { url?: string; data_uri?: string; expires_in?: number };
export const imageUri = (p?: ImagePayload | null) => p?.url ?? p?.data_uri ?? null;
/** Signed URLs live ~1 h: keep the answer for 45 min so expo-image can reuse its disk cache for the same URL. */
export const imageQueryOptions = { staleTime: 45 * 60 * 1000, gcTime: 50 * 60 * 1000 } as const;

export type FeedScope =
  | { scope: 'home' }
  | { scope: 'public' }
  | { scope: 'group'; groupId: string }
  | { scope: 'user'; userId: string };

function feedPath({ scope, ...rest }: FeedScope, cursor?: string | null) {
  const params = new URLSearchParams({ scope });
  if ('groupId' in rest) params.set('group_id', rest.groupId);
  if ('userId' in rest) params.set('user_id', rest.userId);
  if (cursor) params.set('cursor', cursor);
  return `${C}/feed?${params}`;
}

const feedKey = (f: FeedScope) => ['community', 'feed', f.scope, 'groupId' in f ? f.groupId : 'userId' in f ? f.userId : ''];

/** Cursor-paginated feed. Read items with `feedItems(query.data)`. */
export const useFeed = (f: FeedScope, enabled = true) =>
  useInfiniteQuery({
    queryKey: feedKey(f),
    queryFn: ({ pageParam }) => api<FeedPage>(feedPath(f, pageParam)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    enabled,
    staleTime: 30 * 1000,
  });

export const feedItems = (data?: { pages: FeedPage[] }) => data?.pages.flatMap((p) => p.items) ?? [];

/** Patch one activity in every cached feed page and its detail query. */
function patchActivity(qc: QueryClient, next: CommunityActivity | ((a: CommunityActivity) => CommunityActivity | null), id: string) {
  const apply = (a: CommunityActivity) => (typeof next === 'function' ? next(a) : next);
  qc.setQueriesData<{ pages: FeedPage[]; pageParams: unknown[] }>({ queryKey: ['community', 'feed'] }, (old) =>
    old && {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        items: p.items.flatMap((a) => {
          if (a.id !== id) return [a];
          const updated = apply(a);
          return updated ? [updated] : [];
        }),
      })),
    });
  qc.setQueryData<CommunityActivity>(['community', 'activity', id], (old) => (old ? apply(old) ?? undefined : old));
}

export const useActivity = (id: string | undefined) =>
  useQuery({ queryKey: ['community', 'activity', id], queryFn: () => api<CommunityActivity>(`${C}/activities/${id}`), enabled: !!id });

export function useReact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: ReactionKind | null }) =>
      kind ? api<CommunityActivity>(`${C}/activities/${id}/reaction`, { method: 'PUT', body: { kind } })
        : api<CommunityActivity>(`${C}/activities/${id}/reaction`, { method: 'DELETE' }),
    // Optimistic: the tap shows instantly.
    onMutate: ({ id, kind }) =>
      patchActivity(qc, (a) => {
        const reactions = { ...a.reactions };
        if (a.my_reaction) reactions[a.my_reaction] = Math.max(0, (reactions[a.my_reaction] ?? 1) - 1);
        if (kind) reactions[kind] = (reactions[kind] ?? 0) + 1;
        for (const k of Object.keys(reactions) as ReactionKind[]) if (!reactions[k]) delete reactions[k];
        return { ...a, reactions, my_reaction: kind, reaction_total: Object.values(reactions).reduce((s, n) => s + (n ?? 0), 0) };
      }, id),
    onSuccess: (activity) => patchActivity(qc, activity, activity.id),
    onError: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
      qc.invalidateQueries({ queryKey: ['community', 'activity', id] });
    },
  });
}

export const useReactions = (id: string | undefined, enabled = true) =>
  useQuery({
    queryKey: ['community', 'reactions', id],
    queryFn: () => api<{ kind: ReactionKind; user: CommunityUser }[]>(`${C}/activities/${id}/reactions`),
    enabled: !!id && enabled,
  });

export const useComments = (id: string | undefined) =>
  useQuery({ queryKey: ['community', 'comments', id], queryFn: () => api<CommunityComment[]>(`${C}/activities/${id}/comments`), enabled: !!id });

export function useAddComment(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => api<CommunityComment>(`${C}/activities/${activityId}/comments`, { method: 'POST', body: { text } }),
    onSuccess: (comment) => {
      qc.setQueryData<CommunityComment[]>(['community', 'comments', activityId], (old) => [...(old ?? []), comment]);
      patchActivity(qc, (a) => ({ ...a, comment_count: a.comment_count + 1 }), activityId);
    },
  });
}

export function useDeleteComment(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`${C}/comments/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.setQueryData<CommunityComment[]>(['community', 'comments', activityId], (old) => old?.filter((c) => c.id !== id));
      patchActivity(qc, (a) => ({ ...a, comment_count: Math.max(0, a.comment_count - 1) }), activityId);
    },
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`${C}/activities/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => patchActivity(qc, () => null, id),
  });
}

export type NewPost = { text: string; audience: Audience; groupId?: string; imageUri?: string | null; ratio?: ImageRatio };

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ text, audience, groupId, imageUri, ratio }: NewPost) => {
      const form = new FormData();
      form.append('text', text);
      form.append('audience', audience);
      if (groupId) form.append('group_id', groupId);
      if (imageUri) {
        const format = ratio ?? '4:5';
        // Crop + 1080 px + JPEG 80%, like Instagram: far less to upload.
        form.append('file', await uploadableFile(await prepareFeedPhoto(imageUri, format)));
        form.append('ratio', format);
      }
      return api<CommunityActivity>(`${C}/posts`, { method: 'POST', body: form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'feed'] }),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (body: { target_type: 'activity' | 'comment' | 'user'; target_id: string; reason?: string }) =>
      api(`${C}/reports`, { method: 'POST', body }),
  });
}

// ---------- Groups ----------

export const usePublicGroups = () => useQuery({ queryKey: ['community', 'public-groups'], queryFn: () => api<CommunityGroup[]>(`${C}/groups?scope=public`) });

export const useGroups = () => useQuery({ queryKey: ['community', 'groups'], queryFn: () => api<CommunityGroup[]>(`${C}/groups`) });

export const useGroup = (id: string | undefined) =>
  useQuery({ queryKey: ['community', 'group', id], queryFn: () => api<GroupDetail>(`${C}/groups/${id}`), enabled: !!id });

export const useGroupSummary = (id: string | undefined) =>
  useQuery({
    queryKey: ['community', 'group-summary', id],
    queryFn: () => api<{ text: string }>(`${C}/groups/${id}/summary`),
    enabled: false,
    staleTime: 30 * 60 * 1000,
  });

export const useGroupPreview = (code: string | undefined) =>
  useQuery({
    queryKey: ['community', 'group-preview', code],
    queryFn: () => api<GroupPreview>(`${C}/groups/preview/${encodeURIComponent(code ?? '')}`),
    enabled: !!code,
    retry: false,
  });

const invalidateGroups = (qc: QueryClient) => qc.invalidateQueries({ queryKey: ['community'] });

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageUri, ...body }: { name: string; description?: string; imageUri?: string | null; is_public?: boolean }) => {
      if (!imageUri) return api<CommunityGroup>(`${C}/groups`, { method: 'POST', body });
      const form = new FormData();
      form.append('name', body.name);
      form.append('is_public', String(body.is_public ?? false));
      if (body.description) form.append('description', body.description);
      form.append('file', await uploadableFile(imageUri));
      return api<CommunityGroup>(`${C}/groups`, { method: 'POST', body: form });
    },
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: string | { group_id: string }) => api<CommunityGroup>(`${C}/groups/join`, { method: 'POST', body: typeof input === 'string' ? { code: input.trim().toUpperCase() } : input }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`${C}/groups/${id}/leave`, { method: 'POST' }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`${C}/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useUpdateGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; description?: string; is_public?: boolean }) => api<CommunityGroup>(`${C}/groups/${id}`, { method: 'PUT', body }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useRotateInvite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ invite_code: string }>(`${C}/groups/${id}/invite-code`, { method: 'POST' }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api(`${C}/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useSetMemberRole(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) =>
      api(`${C}/groups/${groupId}/members/${userId}/role`, { method: 'PUT', body: { role } }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useNudge(groupId: string) {
  return useMutation({
    mutationFn: (userId: string) => api<{ msg: string }>(`${C}/groups/${groupId}/members/${userId}/nudge`, { method: 'POST' }),
  });
}

// ---------- Challenges ----------

export const useChallenges = (scope: 'mine' | 'available' | 'public') =>
  useQuery({ queryKey: ['community', 'challenges', scope], queryFn: () => api<Challenge[]>(`${C}/challenges?scope=${scope}`) });

export const useChallenge = (id: string | undefined) =>
  useQuery({ queryKey: ['community', 'challenge', id], queryFn: () => api<ChallengeDetail>(`${C}/challenges/${id}`), enabled: !!id });

export type NewChallenge = {
  title: string;
  description?: string;
  metric: ChallengeMetric;
  target: number;
  duration_days: number;
  group_id?: string;
  is_public?: boolean;
};

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewChallenge) => api<Challenge>(`${C}/challenges`, { method: 'POST', body }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useJoinChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, join }: { id: string; join: boolean }) => api<Challenge>(`${C}/challenges/${id}/${join ? 'join' : 'leave'}`, { method: 'POST' }),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`${C}/challenges/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateGroups(qc),
  });
}

// ---------- People ----------

export const useFriends = () => useQuery({ queryKey: ['community', 'friends'], queryFn: () => api<FriendsList>(`${C}/friends`), staleTime: 0, refetchInterval: 15_000 });

export const useCommunityProfile = (id: string | undefined) =>
  useQuery({ queryKey: ['community', 'user', id], queryFn: () => api<CommunityProfile>(`${C}/users/${id}`), enabled: !!id });

export const useUserSearch = (q: string) =>
  useQuery({
    queryKey: ['community', 'search', q],
    queryFn: () => api<UserSearchResult[]>(`${C}/users/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: 60 * 1000,
  });

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept ? api(`${C}/friends/requests/${id}/accept`, { method: 'POST' }) : api(`${C}/friends/requests/${id}`, { method: 'DELETE' }),
    onError: () => { qc.invalidateQueries({ queryKey: ['community', 'friends'] }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export const useBlocks = () => useQuery({ queryKey: ['community', 'blocks'], queryFn: () => api<CommunityUser[]>(`${C}/blocks`) });

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) =>
      block ? api(`${C}/blocks`, { method: 'POST', body: { user_id: userId } }) : api(`${C}/blocks/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community'] }),
  });
}

export const useCommunitySettings = () =>
  useQuery({ queryKey: ['community', 'settings'], queryFn: () => api<CommunitySettings>(`${C}/settings`) });

export function useSaveCommunitySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CommunitySettings>) => api<CommunitySettings>(`${C}/settings`, { method: 'PUT', body }),
    onMutate: (body) => qc.setQueryData<CommunitySettings>(['community', 'settings'], (old) => old && { ...old, ...body }),
    onSuccess: (data) => qc.setQueryData(['community', 'settings'], data),
    onError: () => qc.invalidateQueries({ queryKey: ['community', 'settings'] }),
  });
}

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, follow }: { id: string; follow: boolean }) => api(`/community/users/${id}/follow`, { method: follow ? 'PUT' : 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community'] }),
  });
}


export function useGroupImage(id: string, version?: string | null) {
  return useQuery({ queryKey: ['community', 'group-image', id, version], queryFn: () => api<ImagePayload>(`${C}/groups/${id}/image`), enabled: !!version, ...imageQueryOptions });
}

export function useSetGroupImage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uri: string | null) => {
      if (!uri) return api<CommunityGroup>(`${C}/groups/${id}/image`, { method: 'DELETE' });
      const form = new FormData();
      form.append('file', await uploadableFile(uri));
      return api<CommunityGroup>(`${C}/groups/${id}/image`, { method: 'POST', body: form });
    },
    onSuccess: () => invalidateGroups(qc),
  });
}
