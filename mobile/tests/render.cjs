// Smoke-render every page using the real UI and React Native Web primitives.
// Native device APIs, animations and network hooks are replaced with fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const RN = require('react-native-web');
const root = path.resolve(__dirname, '../src');
const now = new Date().toISOString();
const outdoor = {
  id: 'outdoor', started_at: new Date(Date.parse(now) - 1000).toISOString(), duration_seconds: 600, workout_name: 'Corrida ao ar livre',
  outdoor_type: 'run', distance_meters: 1200, calories: 96, route: [[[-16.46, -54.63], [-16.462, -54.632]]],
};
const bike = {
  ...outdoor, id: 'bike', started_at: now, workout_name: 'Pedal ao ar livre', outdoor_type: 'bike',
  distance_meters: 4000, calories: 120,
};
let outdoorDetail = outdoor;
const plan = { id: 'plan', name: 'Plano de teste', is_active: true, created_at: now, days: [{ id: 'day', day_of_week: ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()], name: 'Treino A', exercises: [{ id: 'ex', name: 'Prancha Frontal', sets: 3, reps: '12', rest_seconds: 60, exercise_library_id: 'prancha', animation_url: 'https://example.test/prancha.gif' }] }] };
const profile = { id: 'user', name: 'Atleta de teste', email: 'test@example.com', onboarding_completed: true, height_cm: 180, current_weight_kg: 80, target_weight_kg: 78, age: 30, gender: 'male' };
const profilePhoto = 'https://example.test/atleta.jpg';
const coachMessages = [{role:'user',content:'Qual é o treino de hoje?',created_at:now},{role:'model',content:'Vamos treinar!',created_at:now}];
const diet = { id: 'diet', weekly_plan: { segunda: { cafe: { nome: 'Ovos', calorias: 300, ingredientes: ['2 ovos'] } } }, macro_targets: { protein: 100, carbs: 200, fats: 60 }, shopping_list: [{ item: 'Ovos', quantidade: '12 unidades', preco_aprox: 10 }] };
const libraryExercise = {
  id: 'prancha', name: 'Prancha Frontal', category: 'strength', difficulty_level: 'beginner',
  muscle_groups: ['abs'], equipment_needed: ['bodyweight'],
  instructions: ['Apoie os antebraços no chão.'], tips: ['Mantenha o abdômen firme.'],
  common_mistakes: ['Deixar o quadril cair.'],
  animation_url: 'https://example.test/prancha.gif',
};
let mode = 'content';
let theme = 'light';
let historyPremium = true;
let historyEnabled;
const query = (data) => ({ data: mode === 'empty' ? (Array.isArray(data) ? [] : undefined) : data, isLoading: mode === 'loading', error: mode === 'error' ? new Error('Fixture request failed') : null, isRefetching: false, refetch: async () => {}, dataUpdatedAt: 1 });
const mutation = () => ({ isPending: false, mutate() {}, mutateAsync: async () => ({}) });
const hooks = new Proxy({}, { get: (_, key) => {
  if (key === '__esModule') return false;
  if (/^use(Log|Set|Generate|Delete|Update|Mark|Estimate)/.test(key)) return mutation;
  return (id, enabled) => {
    if (key === 'useActiveWorkoutPlan') return { ...query(plan), plan: mode === 'content' ? plan : undefined };
    if (key === 'useExerciseLibrary') return query([libraryExercise]);
    if (key === 'useProfile') return query({ ...profile, profile_picture: profilePhoto, is_premium: historyPremium });
    if (key === 'useChatHistory') return query(coachMessages);
    if (key === 'useWorkoutHistory') return query([
      { id: 'session', started_at: now, duration_seconds: 900, workout_name: 'Treino A', calories: 70 },
      outdoor, bike,
    ]);
    if (key === 'useLibraryExerciseHistory') {
      historyEnabled = enabled;
      return query({ pages: [{ sessions: [{ id: 'session', started_at: now, sets: [{ id: 'set', set_number: 1, weight_kg: 15, reps: 12 }] }] }] });
    }
    return query(({ useProfile: profile, useDashboard: {}, useDietPlan: diet, useWorkoutPlan: plan, useDailyNutrition: {totals:{calories:300}, meals:[{id:'meal', name:'Ovos', meal_type:'breakfast',calories:300, protein:20,carbs:10,fats:20}]}, useMetricHistory:[{date: now,value:80}], useHydration:{total_intake_ml:500,daily_goal_ml:2500,percentage:20},useHydrationHistory:[{date: now,value:500}],useNotifications:[{id:'n',title:'Lembrete',message:'Beba água',type:'hydration',created_at:now,is_read:false},{id:'follow-notification',title:'Pessoa teste quer seguir você',message:'Aceite ou recuse a solicitação.',type:'social',created_at:now,is_read:false,link_type:'community_follow_request',link_id:'follow-request'}],useUnreadNotifications:[],useAchievements:[{id:'a',name:'Primeiro treino',description:'Treine uma vez',category:'workout',unlocked:true,unlocked_at:now}],useGamificationProgress:{level:1,xp:10,next_level_xp:100,progress_percent:10},useStreaks:{workout_streak:1},useRecentRecords:[{ exercise_library_id: libraryExercise.id, name: 'Supino', weight_kg: 32, previous_kg: 30, achieved_at: now }]}[key]));
  };
} });
const chain = new Proxy({}, { get: () => () => chain });
const svg = new Proxy({ __esModule: true, default: 'svg' }, { get: (target, key) => target[key] ?? 'g' });
const icons = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : () => React.createElement('i') });
const pushedRoutes = [];
let bellsChecked = 0;
const scrollViews = [];
const notificationButtons = [];
const exerciseThumbnails = [];
const exerciseAddButtons = [];
const dismissedRoutes = [];
let outdoorStartButton;
let latestOutdoorButton;
let catalogList;
let exerciseSheet;
let exerciseRouteParams;
let workoutActions;
const stubs = {
  expo: { requireOptionalNativeModule: () => null },
  'react-native': { ...RN, FlatList: (props) => {
    if (props.data?.[0] === libraryExercise) catalogList = props;
    return React.createElement(RN.FlatList, props);
  }, ScrollView: (props) => { scrollViews.push(props); return React.createElement(RN.ScrollView, props); }, useColorScheme: () => theme, Pressable: (props) => {
    if (props.accessibilityHint === 'Abre a tela de notificações') notificationButtons.push(props);
    if (props.accessibilityLabel?.startsWith('Ver execução de')) exerciseThumbnails.push(props);
    if (props.accessibilityLabel?.toLowerCase() === 'adicionar exercício') exerciseAddButtons.push(props);
    if (props.accessibilityLabel === 'Iniciar atividade') outdoorStartButton = props;
    if (props.accessibilityHint === 'Abre o resumo com o trajeto') latestOutdoorButton = props;
    return React.createElement(RN.Pressable, props);
  } },
  'react-native-reanimated': { __esModule:true, default:{ View:RN.View }, FadeIn:chain, FadeInDown:chain, useReducedMotion:()=>false, useSharedValue:(value)=>({value}), useAnimatedRef:()=>React.useRef(null), useAnimatedStyle:()=>({}), withTiming:()=>0,withRepeat:()=>0,withDelay:()=>0,Easing:{out:()=>0,quad:0} },
  'react-native-safe-area-context': {useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})},
  'react-native-svg': svg,
  'lucide-react-native':icons,
  'expo-router':{router:{push:(href)=>pushedRoutes.push(href),dismissTo:(href)=>dismissedRoutes.push(href)},useFocusEffect:()=>{},useLocalSearchParams:()=>exerciseRouteParams ?? {id:'plan',dayId:'day'},Link:({children})=>children},
  'expo-blur':{BlurView:({children})=>React.createElement('div',null,children)},
  'expo-image':{Image:({accessibilityLabel,source})=>React.createElement('img',{alt:accessibilityLabel,src:typeof source === 'string' ? source : source?.uri})},
  'expo-keep-awake':{useKeepAwake(){}},
  'expo-crypto': {},
  'expo-location': { Accuracy: { High: 4 } },
  'expo-task-manager': { defineTask() {} },
  'expo-maps': { AppleMaps: { View: () => null, MapColorScheme: { LIGHT: 'LIGHT', DARK: 'DARK' } } },
  'expo-sqlite/kv-store': { SQLiteStorage: class {
    items = new Map();
    getItemSync(key) { return this.items.get(key) ?? null; }
    setItemSync(key, value) { this.items.set(key, value); }
    removeItemSync(key) { this.items.delete(key); }
  } }, 'expo-image-picker':{}, 'expo-image-manipulator':{ ImageManipulator:{}, SaveFormat:{ JPEG:'jpeg' } }, 'expo-file-system':{ File: class File { constructor(uri) { this.uri = uri; } } }, 'expo-haptics':{}, 'expo-web-browser':{}, 'expo-secure-store':{},
  'expo-constants':{__esModule:true,default:{expoConfig:{version:'1.0.0'}}},
  'expo-apple-authentication':{ isAvailableAsync:async()=>false, AppleAuthenticationButton:()=>null, AppleAuthenticationButtonType:{}, AppleAuthenticationButtonStyle:{}, AppleAuthenticationScope:{} },
  '@react-native-google-signin/google-signin':{ GoogleSignin:{ configure(){} }, isCancelledResponse:()=>false, isErrorWithCode:()=>false, statusCodes:{} },
  '@tanstack/react-query': {useQueryClient:()=>({refetchQueries:async()=>{}}),useQuery:options=>{
    const key = options?.queryKey?.[0];
    if (key === 'nutrition-history' && mode === 'empty') return { ...query(undefined), data: { data: [] } };
    return query(key === 'outdoor-detail' ? { record: outdoorDetail, pending: false } : key === 'outdoor-route' ? outdoor.route : key === 'recent-records' ? [{ exercise_library_id: 'lib', name: 'Supino', weight_kg: 32, previous_kg: 30, achieved_at: now }] : key === 'health-summary-weight' ? [] : {data:[],summary:{avg_calories:0}});
  }},
};
let cache;
let onboardingStates = null;
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = {exports:{}};cache.set(file,mod);
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const req=(id)=>{
    if (id === '@/components/action-menu' && file.endsWith('/app/(tabs)/workouts.tsx')) {
      const actionMenu = load(path.join(root, 'components/action-menu.tsx'));
      return {
        ...actionMenu,
        ActionMenu: (props) => {
          workoutActions = props;
          return React.createElement(actionMenu.ActionMenu, props);
        },
      };
    }
    if (id === 'expo-router' && file.endsWith('/app/exercises/[id].tsx')) return {
      ...stubs[id], useLocalSearchParams: () => ({ id: libraryExercise.id }),
    };
    if (id === '@/components/exercise-form-sheet' && exerciseRouteParams) return {
      ExerciseFormSheet: (props) => { exerciseSheet = props; return null; },
    };
    // Render each conversation state with the real controls, without running effects,
    // touching device storage, posting profile data or contacting an AI provider.
    if (id === 'react' && file.endsWith('/app/onboarding.tsx') && onboardingStates) return {
      ...React, useState: initial => React.useState(onboardingStates.length ? onboardingStates.shift() : initial),
    };
    if(id==='@/hooks/community')return new Proxy({}, { get: (_, key) => {
      if (key === 'feedItems') return data => data?.pages?.flatMap(p => p.items) ?? [];
      if (/^use(Create|Join|Leave|Delete|Update|Rotate|Remove|Set|Nudge|Send|Respond|Block|Save|React$|Report|Add|Follow)/.test(key)) return mutation;
      return () => {
        const values = {useFeed:{pages:[{items:[],next_cursor:null}]},useGroups:[],usePublicGroups:[],useChallenges:[],useFriends:{friends:[],received:[{id:'follow-request',user:{id:'sender',name:'Pessoa teste'},created_at:now}],sent:[]},useBlocks:[],useComments:[],useUserSearch:[],useCommunitySettings:{friend_code:'ABCD2345',share_workouts:false},useGroup:{id:'g',name:'Turma',member_count:1,my_role:'admin',members:[],challenges:[],invite_code:'ABCD2345'},useGroupSummary:{text:'Semana começando!'},useChallenge:{id:'c',title:'Treinar',status:'active',target:12,metric:'workouts',leaderboard:[],start_date:'2026-11-01',end_date:'2026-11-30'},useActivity:{id:'a',type:'post',user:{id:'u',name:'Ana'},reactions:{},text:'Bora treinar',created_at:now},useCommunityProfile:{id:'u',name:'Ana',stats:{},friendship:'none',follow_state:'none',following:false}};
        return {...query(values[key]),isFetching:false};
      };
    }});
    if(id==='@/hooks/use-health-sync')return {useHealthWeek:()=>query([]),useHealthSync:()=>({connected:false,sync:query(null),account:query(true)})};
    if(id==='@/hooks/queries')return hooks;
    // Crash reporting / analytics are native SDKs; the web build's no-op twin keeps the same API.
    if(id==='@/lib/analytics')return load(path.join(root,'lib/analytics.web.ts'));
    if(id==='@/providers/auth')return {useAuth:()=>({signIn:async()=>{},signOut:async()=>{}})};
    if(/\.(png|jpe?g|webp)$/.test(id))return 1;
    if(stubs[id])return stubs[id];
    if(id.startsWith('@/')||id.startsWith('.')) {
      const absolute = id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(file),id);
      for(const suffix of ['','.tsx','.ts'])if(fs.existsSync(absolute+suffix)&&fs.statSync(absolute+suffix).isFile())return load(absolute+suffix);
    }
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(req,mod,mod.exports);
  return mod.exports;
}
function files(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap((f)=>f.isDirectory()?files(path.join(dir,f.name)):[path.join(dir,f.name)]);}
let count=0;
const pages=files(path.join(root,'app')).filter((f)=>f.endsWith('.tsx')&&!/_layout(?:\.[^.]+)?\.tsx$/.test(f));
const oldWarn=console.warn;console.warn=()=>{};
try {
  for (theme of ['light', 'dark']) {
  for (mode of ['content','empty','loading','error']) {
    cache=new Map();
    for(const file of pages) {
      try {
        const { AppThemeProvider } = load(path.join(root, 'providers/theme.tsx'));
        notificationButtons.length = 0;
        exerciseThumbnails.length = 0;
        scrollViews.length = 0;
        workoutActions = undefined;
        outdoorStartButton = undefined;
        latestOutdoorButton = undefined;
        const result=renderToStaticMarkup(React.createElement(AppThemeProvider, null, React.createElement(load(file).default)));
        assert.ok(result.length>0);
        if (mode === 'empty' && file.endsWith('/app/nutrition-history.tsx')) {
          assert.ok(result.includes('Nenhuma refeição registrada neste período.'));
        }
        if (mode === 'content' && file.endsWith('/app/(tabs)/metrics.tsx')) {
          for (const text of ['Peso', 'Gordura', 'Músculo', 'Evolução de peso', 'Registros de peso', 'Hoje', 'Esta semana', 'Minhas medalhas', 'Resumo semanal']) {
            assert.ok(result.includes(text), `Missing metrics content: ${text}`);
          }
        }
        if (mode === 'content' && file.endsWith('/app/profile.tsx')) {
          for (const text of ['Sua semana', 'Minhas medalhas', 'Minhas atividades', 'Medidas', 'Seus dados', 'Conta e preferências', 'Outros', 'Versão:']) {
            assert.ok(result.includes(text), `Missing web profile content: ${text}`);
          }
        }
        if (mode === 'content' && file.endsWith('/app/coach.tsx')) {
          assert.ok(result.includes('Como posso te ajudar hoje?'));
          assert.ok(result.includes('Qual é o treino de hoje?') && result.includes(profilePhoto));
        }
        if (['empty', 'content'].includes(mode) && file.endsWith('/app/(tabs)/workouts.tsx')) {
          const title = 'Atividade ao ar livre';
          assert.ok(result.includes('Ações de treino'));
          assert.ok(!result.includes(title));
          for (const text of ['Atividades ao ar livre', 'Corrida, caminhada e pedal com GPS', 'Iniciar atividade']) {
            assert.ok(result.includes(text));
          }
          outdoorStartButton.onPress();
          assert.equal(pushedRoutes.pop(), '/outdoor');
          if (mode === 'content') {
            assert.ok(result.includes('Escolher outro treino'));
            const todayCardIndex = result.indexOf('Treino de hoje');
            assert.ok(todayCardIndex >= 0 && todayCardIndex < result.indexOf('Atividades ao ar livre'));
            assert.ok(result.includes('Último pedal') && result.includes('4,00 km'));
            latestOutdoorButton.onPress();
            assert.deepEqual(pushedRoutes.pop(), { pathname: '/outdoor/[id]', params: { id: bike.id } });
          } else {
            assert.equal(latestOutdoorButton, undefined);
          }
          assert.equal(workoutActions.visible, false);
          const outdoorAction = workoutActions.items.find((item) => item.key === 'outdoor');
          assert.equal(outdoorAction?.title, title);
          assert.ok(outdoorAction.caption.includes('pedal'));
          outdoorAction.onPress();
          assert.equal(pushedRoutes.pop(), '/outdoor');
        }
        if (mode === 'content' && file.endsWith('/app/workout/history.tsx')) {
          for (const text of ['Treino A', 'Corrida ao ar livre', '1,20 km', 'Pedal ao ar livre', '4,00 km']) assert.ok(result.includes(text));
        }
        if (mode === 'content' && file.endsWith('/app/outdoor/[id].tsx')) {
          for (const text of ['Trajeto GPS', '1,20 km', '96 kcal', '8:20 /km']) assert.ok(result.includes(text));
          outdoorDetail = bike;
          const bikeResult = renderToStaticMarkup(React.createElement(AppThemeProvider, null, React.createElement(load(file).default)));
          outdoorDetail = outdoor;
          for (const text of ['Pedal ao ar livre', '4,00 km', '120 kcal', '24 km/h']) assert.ok(bikeResult.includes(text));
          assert.ok(!bikeResult.includes('Ritmo médio'));
        }
        if (mode === 'content' && file.endsWith('/app/outdoor/index.tsx')) {
          for (const text of ['Corrida', 'Caminhada', 'Pedal']) assert.ok(result.includes(text));
        }
        if (mode === 'content' && file.endsWith('/app/exercises/index.tsx')) {
          for (const text of ['Prancha Frontal', 'Buscar exercício', 'Dá pra fazer em casa', libraryExercise.animation_url]) assert.ok(result.includes(text));
          catalogList.renderItem({ item: libraryExercise }).props.children.props.onPress();
          assert.deepEqual(pushedRoutes.pop(), { pathname: '/exercises/[id]', params: { id: libraryExercise.id } });
        }
        if (mode === 'content' && file.endsWith('/app/exercises/[id].tsx')) {
          for (const text of ['Prancha Frontal', 'Abdômen', libraryExercise.animation_url, '15 kg', ...libraryExercise.instructions, ...libraryExercise.tips, ...libraryExercise.common_mistakes]) {
            assert.ok(result.includes(text));
          }
          assert.equal(historyEnabled, true);
          historyPremium = false;
          const locked = renderToStaticMarkup(React.createElement(AppThemeProvider, null, React.createElement(load(file).default)));
          historyPremium = true;
          assert.equal(historyEnabled, false);
          assert.ok(locked.includes('Histórico Premium') && !locked.includes('15 kg'));
        }
        if (mode === 'content' && file.endsWith('/app/workout/[id]/index.tsx')) {
          assert.equal(exerciseThumbnails.length, 1);
          exerciseThumbnails[0].onPress();
          assert.deepEqual(pushedRoutes.at(-1), { pathname: '/exercises/[id]', params: { id: 'prancha' } });
        }
        if (mode === 'content' && ['/(tabs)/social.tsx', '/community/group/[id].tsx', '/community/user/[id].tsx'].some(p => file.endsWith(p))) {
          assert.ok(scrollViews.some(v => typeof v.refreshControl?.props.onRefresh === 'function' && v.alwaysBounceVertical === true), 'feed owns a pull-to-refresh control, including short content');
          assert.ok(!result.includes('Atualizar feed'), 'feed has no refresh button');
        }
        if (mode === 'content' && file.endsWith('/community/group/[id].tsx')) {
          assert.ok(result.includes('Mais opções'), 'admin can open club options');
          assert.ok(result.includes('Adicionar ao clube'), 'club uses the shared floating add button');
          assert.ok(!result.includes('Membros e ranking') && !result.includes('Nova publicação'), 'no shortcuts or publication button above club feed');
          assert.ok(!result.includes('Editar grupo') && !result.includes('Excluir grupo') && !result.includes('Alterar foto do clube'), 'club feed does not contain settings');
        }

        const { LightColors, DarkColors } = load(path.join(root, 'constants/theme.ts'));
        const palette = theme === 'dark' ? DarkColors : LightColors;
        const rgb = (hex) => `rgba(${[1,3,5].map((i) => parseInt(hex.slice(i,i+2),16)).join(',')},1.00)`;
        if (mode === 'content') assert.ok(result.includes(`color:${rgb(palette.ink)}`), `${theme}: page has themed text`);
        if (mode === 'content' && file.endsWith('/app/notifications.tsx')) assert.ok(result.includes('Aceitar') && result.includes('Recusar'), 'pending follow request has both actions');
        if (mode === 'content' && file.endsWith('/app/community/people.tsx')) assert.ok(!result.includes('Código do amigo') && !result.includes('Seu código'), 'follow flow does not ask for a friend code');
        assert.ok(result.includes(`background-color:${rgb(palette.surface)}`), `${theme}: page has themed background`);
        for (const button of notificationButtons) {
          assert.equal(button.accessibilityRole, 'button');
          const before = pushedRoutes.length;
          button.onPress();
          assert.deepEqual(pushedRoutes.slice(before), ['/notifications'], `${theme}/${mode}: bell opens notifications`);
        }
        bellsChecked += notificationButtons.length;
        count++;
      }
      catch(error) {throw new Error(`${theme}/${mode}: ${path.relative(root,file)}: ${error.stack}`);}
    }
  }
  }
  for (theme of ['light', 'dark']) {
    mode = 'content'; cache = new Map();
    const { onboardingSteps } = load(path.join(root, 'lib/onboarding.ts'));
    const answers = Object.fromEntries(onboardingSteps.map(s => [s.key, s.kind === 'multi' ? s.options.slice(0, s.min ?? 0).map(o => o.value) : s.kind === 'single' ? s.options[0].value : s.kind === 'number' ? String(s.min) : s.kind === 'date' ? '01/01/1995' : s.key === 'name' ? 'Teste' : '']));
    for (let i = 0; i < onboardingSteps.length + 2; i++) {
      const saved = i === onboardingSteps.length + 1;
      onboardingStates = [answers, i, answers[onboardingSteps[i]?.key] ?? '', true, false, saved, '', '', {workout:false,diet:false}, '', false];
      const { AppThemeProvider } = load(path.join(root, 'providers/theme.tsx'));
      const html = renderToStaticMarkup(React.createElement(AppThemeProvider, null, React.createElement(load(path.join(root, 'app/onboarding.tsx')).default)));
      assert.ok(html.includes('Seu começo no FitGen'));
      if (i < onboardingSteps.length) assert.ok(html.includes(onboardingSteps[i].question), `question ${i} renders`);
      else assert.ok(html.includes(saved ? 'Ir para o painel' : 'Salvar e continuar'));
      assert.ok(!html.includes('undefined') && !html.includes('NaN'));
      onboardingStates = null; count++;
    }
    onboardingStates = [answers, 0, '', true, false, false, '', '', {workout:false,diet:false}, '', false, false, true];
    const { AppThemeProvider } = load(path.join(root, 'providers/theme.tsx'));
    const welcome = renderToStaticMarkup(React.createElement(AppThemeProvider, null, React.createElement(load(path.join(root, 'app/onboarding.tsx')).default)));
    assert.ok(welcome.includes('Oi, eu sou o Otto!') && welcome.includes('Começar'));
    onboardingStates = null; count++;
  }
  mode = 'content'; cache = new Map();
  const { finishDraft, pauseDraft, readDraft, readPending, recordLocations, writeDraft } = load(path.join(root, 'lib/outdoor-recording.ts'));
  const start = Date.parse(now);
  const fix = (offset, longitude) => ({ timestamp: start + offset, coords: { latitude: 0, longitude, accuracy: 5 } });
  writeDraft({
    id: 'offline-bike', owner: 'bike-owner', type: 'bike', weight: 75, started: start,
    runningSince: start, activeMs: 0, lastFix: null, lastPointAt: null, background: false, route: [], meters: 0,
  });
  recordLocations([fix(0, 0), fix(4000, 0.0006), fix(8000, 0.01)], 'bike-owner');
  const recorded = readDraft('bike-owner');
  assert.equal(recorded.route[0].length, 2, 'accepts cycling speed and drops an implausible GPS jump');
  assert.ok(recorded.meters > 65 && recorded.meters < 68);
  const paused = pauseDraft(recorded, start + 8000);
  const offlineBike = finishDraft(paused, start + 20000);
  assert.equal(offlineBike.outdoor_type, 'bike');
  assert.equal(offlineBike.duration_seconds, 8);
  assert.deepEqual(readPending('bike-owner'), [offlineBike]);
  assert.equal(readDraft('bike-owner'), null);

  const { AppThemeProvider } = load(path.join(root, 'providers/theme.tsx'));
  const renderPickerRoute = (route) => renderToStaticMarkup(React.createElement(AppThemeProvider, null, React.createElement(load(path.join(root, 'app', route)).default)));
  for (const [source, route, pathname] of [
    ['plan', 'workout/[id]/index.tsx', '/workout/[id]'],
    ['session', 'workout/[id]/play/[dayId].tsx', '/workout/[id]/play/[dayId]'],
  ]) {
    exerciseRouteParams = { id: plan.id, dayId: plan.days[0].id };
    exerciseAddButtons.length = 0;
    renderPickerRoute(route);
    exerciseAddButtons[0].onPress();
    const catalog = pushedRoutes.pop();
    assert.deepEqual(catalog, { pathname: '/exercises', params: { workoutId: plan.id, workoutDay: plan.days[0].id, source } });
    exerciseRouteParams = catalog.params;
    assert.ok(renderPickerRoute('exercises/index.tsx').includes('Selecionar exercício'));
    catalogList.renderItem({ item: libraryExercise }).props.children.props.onPress();
    const returned = dismissedRoutes.pop();
    assert.equal(returned.pathname, pathname);
    exerciseRouteParams = returned.params;
    exerciseSheet = undefined;
    renderPickerRoute(route);
    assert.equal(exerciseSheet.dayId, plan.days[0].id);
    assert.equal(exerciseSheet.libraryExercise, libraryExercise);
    assert.equal(exerciseSheet.exercise, null);
  }
  exerciseRouteParams = undefined;
} finally { console.warn=oldWarn; }
assert.ok(bellsChecked > 0, 'notification bells were checked');
console.log(`${count} smoke renders passed: ${pages.length} pages in both themes and query states, plus every onboarding question, review and completion. Native APIs mocked; device layout and gestures require iPhone validation.`);
