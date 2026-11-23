import { describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/app/routes';
import type { User } from '@/domain/types';
import { NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import {
  createAuthStore,
  type AuthDeps,
  type AuthStore,
  type RouterAccess,
  type Session,
} from './createAuthStore';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Deja correr las promesas ya resueltas (sin reloj falso). */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function user(id: string): User {
  return {
    id,
    username: `u${id}`,
    displayName: `Usuario ${id}`,
    avatarColor: '#123456',
    bio: '',
    timezone: 'America/Santiago',
    createdAt: '2026-01-01T00:00:00.000Z',
    email: `${id}@ejemplo.cl`,
  };
}

const ANA = user('1');
const BEA = user('2');
const CREDENTIALS = { email: 'ana@ejemplo.cl', password: 'secreto' };
const REGISTER = { ...CREDENTIALS, username: 'ana', displayName: 'Ana' };

/**
 * Almacén nuevo por prueba, con todas las dependencias falsas. `log` anota el orden de las llamadas
 * que importan (con el estado de la sesión en ese instante cuando hace falta).
 */
function setup(initialPath = '/inicio') {
  const log: string[] = [];
  let epoch = 0;
  let path = initialPath;
  let unauthorized: ((epoch: number) => void) | undefined;
  let otherTab: (() => void) | undefined;
  const off401 = vi.fn();
  const offTabs = vi.fn();
  // Las dependencias leen el estado del almacén que se crea justo después de ellas.
  const holder = {} as { store: AuthStore };
  const status = () => holder.store.getState().session.status;

  const deps = {
    api: {
      me: vi.fn<AuthDeps['api']['me']>(),
      login: vi.fn<AuthDeps['api']['login']>(),
      register: vi.fn<AuthDeps['api']['register']>(),
      logout: vi.fn<AuthDeps['api']['logout']>(() => Promise.resolve()),
    },
    isSessionCleared: vi.fn<AuthDeps['isSessionCleared']>(() => false),
    queryCache: {
      clear: vi.fn(() => {
        log.push(`clear@${status()}`);
      }),
      cancelQueries: vi.fn(() => {
        log.push('cancelQueries');
        return Promise.resolve();
      }),
    },
    abortAllRequests: vi.fn(() => {
      log.push('abortAllRequests');
      epoch += 1;
    }),
    currentEpoch: vi.fn(() => epoch),
    clearCsrfIfOwn: vi.fn(() => {
      log.push('clearCsrfIfOwn');
    }),
    announce: vi.fn((kind: 'login' | 'logout') => {
      log.push(`announce:${kind}@${status()}`);
    }),
    startWatching: vi.fn((onChange: () => void) => {
      otherTab = onChange;
      return offTabs;
    }),
    onUnauthorized: vi.fn((handler: (epoch: number) => void) => {
      unauthorized = handler;
      return off401;
    }),
    flushSync: vi.fn((update: () => void) => {
      log.push('flushSync');
      update();
    }),
    resetAgenda: vi.fn(() => {
      log.push(`resetAgenda@${status()}`);
    }),
  } satisfies AuthDeps;

  const store = createAuthStore(deps, { name: 'prueba', enabled: false });
  holder.store = store;
  const navigate = vi.fn<RouterAccess['navigate']>((to) => {
    log.push(`navigate:${to}`);
  });
  const router: RouterAccess = { pathname: () => path, navigate };
  store.subscribe((state, prev) => {
    if (state.session !== prev.session) log.push(`set:${state.session.status}`);
  });

  return {
    store,
    deps,
    log,
    navigate,
    router,
    off401,
    offTabs,
    state: () => store.getState(),
    session: (): Session => store.getState().session,
    setPath: (next: string) => {
      path = next;
    },
    fire401: (atEpoch: number) => unauthorized?.(atEpoch),
    fireOtherTab: () => otherTab?.(),
    epoch: () => epoch,
  };
}

/** Almacén con un usuario de sesión ya confirmado y el acceso a la navegación puesto. */
async function signedIn(initialPath = '/inicio') {
  const t = setup(initialPath);
  t.deps.api.me.mockResolvedValue(ANA);
  t.state().attachRouter(t.router);
  t.state().start();
  await flush();
  expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
  t.log.length = 0;
  t.navigate.mockClear();
  t.deps.resetAgenda.mockClear();
  t.deps.clearCsrfIfOwn.mockClear();
  return t;
}

describe('estado inicial y acceso a la navegación (RF-1)', () => {
  it('un almacén nuevo está en checking, sin usuario', () => {
    const t = setup();
    expect(t.session()).toEqual({ status: 'checking' });
  });

  it('el estado solo contiene la sesión y las acciones: ni comprobante ni contraseña (RF-1, RF-21)', () => {
    const t = setup();
    const data = Object.entries(t.state())
      .filter(([, value]) => typeof value !== 'function')
      .map(([key]) => key);
    expect(data).toEqual(['session']);
  });

  it('antes de attachRouter, una navegación no hace nada y no falla', async () => {
    const t = setup();
    t.deps.api.login.mockResolvedValue(ANA);
    await expect(t.state().login(CREDENTIALS, ROUTES.profile)).resolves.toBeUndefined();
    expect(t.navigate).not.toHaveBeenCalled();
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
  });
});

describe('RF-2: consulta de sesión', () => {
  it('start pasa por checking y termina en authenticated con el usuario', async () => {
    const t = setup();
    const me = deferred<User | null>();
    t.deps.api.me.mockReturnValue(me.promise);
    t.state().start();
    expect(t.session()).toEqual({ status: 'checking' });
    me.resolve(ANA);
    await flush();
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
    expect(t.deps.api.me).toHaveBeenCalledTimes(1);
  });

  it('respuesta sin sesión (401): anonymous, limpia la memoria, la agenda y el comprobante propio', async () => {
    const t = setup();
    t.deps.api.me.mockResolvedValue(null);
    t.state().start();
    await flush();
    expect(t.session()).toEqual({ status: 'anonymous' });
    expect(t.deps.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(t.deps.resetAgenda).toHaveBeenCalledTimes(1);
    expect(t.deps.abortAllRequests).toHaveBeenCalledTimes(1);
    expect(t.deps.clearCsrfIfOwn).toHaveBeenCalledTimes(1);
    expect(t.deps.announce).not.toHaveBeenCalled();
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('fallo que no es 401: error con el mensaje del error', async () => {
    const t = setup();
    t.deps.api.me.mockRejectedValue(new Error('Servidor caído'));
    t.state().start();
    await flush();
    expect(t.session()).toEqual({ status: 'error', message: 'Servidor caído' });
    expect(t.deps.queryCache.clear).not.toHaveBeenCalled();
  });

  it('fallo sin mensaje o que no es un Error: error con NO_MESSAGE_TEXT', async () => {
    const a = setup();
    a.deps.api.me.mockRejectedValue(new Error(''));
    a.state().start();
    await flush();
    expect(a.session()).toEqual({ status: 'error', message: NO_MESSAGE_TEXT });

    const b = setup();
    b.deps.api.me.mockRejectedValue('texto suelto');
    b.state().start();
    await flush();
    expect(b.session()).toEqual({ status: 'error', message: NO_MESSAGE_TEXT });
  });

  it('retry vuelve a checking y repite la consulta hasta authenticated', async () => {
    const t = setup();
    t.deps.api.me.mockRejectedValueOnce(new Error('Sin red'));
    t.state().start();
    await flush();
    expect(t.session().status).toBe('error');

    const me = deferred<User | null>();
    t.deps.api.me.mockReturnValueOnce(me.promise);
    t.state().retry();
    expect(t.session()).toEqual({ status: 'checking' });
    me.resolve(ANA);
    await flush();
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
  });

  it('start dos veces con la limpieza del primero (StrictMode): la respuesta del primero no tiene efecto', async () => {
    const t = setup();
    const first = deferred<User | null>();
    const second = deferred<User | null>();
    t.deps.api.me.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const stopFirst = t.state().start();
    stopFirst();
    t.state().start();
    expect(t.deps.api.me).toHaveBeenCalledTimes(2);

    first.resolve(BEA);
    await flush();
    expect(t.session()).toEqual({ status: 'checking' });

    second.resolve(ANA);
    await flush();
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
  });

  it('un error de un intento viejo tampoco tiene efecto', async () => {
    const t = setup();
    const first = deferred<User | null>();
    t.deps.api.me.mockReturnValueOnce(first.promise).mockResolvedValueOnce(ANA);
    const stopFirst = t.state().start();
    stopFirst();
    t.state().start();
    await flush();
    first.reject(new Error('tarde'));
    await flush();
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
  });

  it('retry con la primera respuesta llegando tarde: manda la del reintento', async () => {
    const t = setup();
    const first = deferred<User | null>();
    const second = deferred<User | null>();
    t.deps.api.me.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    t.state().start();
    t.state().retry();

    second.resolve(ANA);
    await flush();
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });

    first.resolve(null);
    await flush();
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
    expect(t.deps.queryCache.clear).not.toHaveBeenCalled();
  });

  it('consulta cancelada por una limpieza (isSessionCleared): se repite y no queda en error', async () => {
    const t = setup();
    const cancelled = new Error('cancelada');
    t.deps.isSessionCleared.mockImplementation((error) => error === cancelled);
    t.deps.api.me.mockRejectedValueOnce(cancelled).mockResolvedValueOnce(ANA);
    t.state().start();
    await flush();
    expect(t.deps.api.me).toHaveBeenCalledTimes(2);
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
  });

  it('start engancha el aviso del 401 y el de otras pestañas; su limpieza los suelta', () => {
    const t = setup();
    t.deps.api.me.mockReturnValue(new Promise(() => {}));
    const stop = t.state().start();
    expect(t.deps.onUnauthorized).toHaveBeenCalledTimes(1);
    expect(t.deps.startWatching).toHaveBeenCalledTimes(1);
    stop();
    expect(t.off401).toHaveBeenCalledTimes(1);
    expect(t.offTabs).toHaveBeenCalledTimes(1);
  });
});

describe('RF-3: inicio de sesión', () => {
  it('vacía la memoria, reinicia la agenda, pone al usuario, avisa y navega una sola vez, en ese orden', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.login.mockResolvedValue(ANA);
    await t.state().login(CREDENTIALS, ROUTES.matches);

    expect(t.deps.api.login).toHaveBeenCalledWith(CREDENTIALS);
    expect(t.log).toEqual([
      'clear@checking',
      'resetAgenda@checking',
      'flushSync',
      'set:authenticated',
      'announce:login@authenticated',
      `navigate:${ROUTES.matches}`,
    ]);
    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.matches, { replace: true });
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
  });

  it('D-016-1: poner al usuario y navegar ocurren dentro de la misma llamada a flushSync, sin estado visible authenticated sin navegar', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.login.mockResolvedValue(ANA);
    // Un flushSync que marca su principio y su fin: lo que pase entre ambos se pinta junto.
    t.deps.flushSync.mockImplementation((update: () => void) => {
      t.log.push('flushSync:start');
      update();
      t.log.push('flushSync:end');
    });
    await t.state().login(CREDENTIALS, '/configuracion');

    const start = t.log.indexOf('flushSync:start');
    const end = t.log.indexOf('flushSync:end');
    expect(t.deps.flushSync).toHaveBeenCalledTimes(1);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(t.log.indexOf('set:authenticated')).toBeGreaterThan(start);
    expect(t.log.indexOf('set:authenticated')).toBeLessThan(t.log.indexOf('navigate:/configuracion'));
    expect(t.log.indexOf('navigate:/configuracion')).toBeLessThan(end);
  });

  it('D-016-1: el registro con inicio de sesión también navega dentro del flushSync', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.register.mockResolvedValue(undefined as never);
    t.deps.api.login.mockResolvedValue(ANA);
    t.deps.flushSync.mockImplementation((update: () => void) => {
      t.log.push('flushSync:start');
      update();
      t.log.push('flushSync:end');
    });
    await t.state().register({ name: 'Ana', username: 'ana', email: 'a@b.c', password: 'x' } as never);

    const end = t.log.indexOf('flushSync:end');
    expect(t.log.indexOf('flushSync:start')).toBeLessThan(t.log.indexOf('set:authenticated'));
    expect(t.log.indexOf(`navigate:${ROUTES.home}`)).toBeLessThan(end);
    expect(end).toBeGreaterThan(0);
  });

  it('navega a la ruta que se le da (la de origen o Inicio)', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.login.mockResolvedValue(ANA);
    await t.state().login(CREDENTIALS, ROUTES.home);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.home, { replace: true });
  });

  it('si el servidor rechaza el inicio, el error llega a quien llama y nada cambia', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.login.mockRejectedValue(new Error('Credenciales inválidas'));
    await expect(t.state().login(CREDENTIALS, ROUTES.home)).rejects.toThrow('Credenciales inválidas');
    expect(t.session()).toEqual({ status: 'checking' });
    expect(t.log).toEqual([]);
    expect(t.deps.announce).not.toHaveBeenCalled();
  });
});

describe('RF-4: registro', () => {
  it('registra, inicia sesión con las mismas credenciales y va a Inicio', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.register.mockResolvedValue(ANA);
    t.deps.api.login.mockResolvedValue(ANA);
    await t.state().register(REGISTER);

    expect(t.deps.api.register).toHaveBeenCalledWith(REGISTER);
    expect(t.deps.api.login).toHaveBeenCalledWith({ email: REGISTER.email, password: REGISTER.password });
    expect(t.log).toEqual([
      'clear@checking',
      'resetAgenda@checking',
      'flushSync',
      'set:authenticated',
      'announce:login@authenticated',
      `navigate:${ROUTES.home}`,
    ]);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.home, { replace: true });
  });

  it('si el registro falla, el error llega al formulario y no se inicia sesión ni se navega', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.register.mockRejectedValue(new Error('Correo repetido'));
    await expect(t.state().register(REGISTER)).rejects.toThrow('Correo repetido');
    expect(t.deps.api.login).not.toHaveBeenCalled();
    expect(t.navigate).not.toHaveBeenCalled();
    expect(t.session()).toEqual({ status: 'checking' });
  });

  it('registro bien y inicio de sesión fallido: a login con el correo y el aviso registered, sin usuario', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.register.mockResolvedValue(ANA);
    t.deps.api.login.mockRejectedValue(new Error('Sin red'));
    await expect(t.state().register(REGISTER)).resolves.toBeUndefined();

    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.login, {
      replace: true,
      state: { email: REGISTER.email, notice: 'registered' },
    });
    expect(t.session()).toEqual({ status: 'checking' });
    expect(t.deps.announce).not.toHaveBeenCalled();
    expect(t.deps.queryCache.clear).not.toHaveBeenCalled();
  });
});

describe('RF-5: cierre de sesión', () => {
  it('con el servidor respondiendo: limpia, borra el comprobante antes de avisar y navega a login', async () => {
    const t = await signedIn();
    await t.state().logout();

    expect(t.deps.api.logout).toHaveBeenCalledTimes(1);
    expect(t.session()).toEqual({ status: 'anonymous' });
    expect(t.log).toEqual([
      'resetAgenda@authenticated',
      'flushSync',
      'set:anonymous',
      'abortAllRequests',
      'cancelQueries',
      'clear@anonymous',
      'clearCsrfIfOwn',
      'announce:logout@anonymous',
      `navigate:${ROUTES.login}`,
    ]);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.login, { replace: true });
  });

  it('con api.logout rechazado: limpia igual, comprobante antes del aviso, y no relanza el error', async () => {
    const t = await signedIn();
    t.deps.api.logout.mockRejectedValue(new Error('Sin red'));
    await expect(t.state().logout()).resolves.toBeUndefined();

    expect(t.session()).toEqual({ status: 'anonymous' });
    expect(t.deps.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(t.deps.clearCsrfIfOwn).toHaveBeenCalledTimes(1);
    expect(t.log.indexOf('clearCsrfIfOwn')).toBeGreaterThan(-1);
    expect(t.log.indexOf('clearCsrfIfOwn')).toBeLessThan(t.log.indexOf('announce:logout@anonymous'));
    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.login, { replace: true });
  });
});

describe('RF-6: 401 en una operación protegida', () => {
  it('con usuario: limpia con el estado ya anonymous, borra el comprobante y navega con from y expired', async () => {
    const t = await signedIn();
    t.setPath(ROUTES.matches);
    t.fire401(t.epoch());

    expect(t.session()).toEqual({ status: 'anonymous' });
    // El estado ya es anonymous cuando se vacía la memoria (defecto D-A2).
    expect(t.log).toContain('clear@anonymous');
    expect(t.log.indexOf('flushSync')).toBeLessThan(t.log.indexOf('clear@anonymous'));
    expect(t.log.indexOf('set:anonymous')).toBeLessThan(t.log.indexOf('clear@anonymous'));
    expect(t.deps.clearCsrfIfOwn).toHaveBeenCalledTimes(1);
    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.login, {
      replace: true,
      state: { from: ROUTES.matches, notice: 'expired' },
    });
  });

  it('dos avisos con la misma época: una sola limpieza y una sola navegación', async () => {
    const t = await signedIn();
    const epoch = t.epoch();
    t.fire401(epoch);
    t.fire401(epoch);
    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.deps.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(t.deps.resetAgenda).toHaveBeenCalledTimes(1);
  });

  it('un aviso de una época vieja no hace nada', async () => {
    const t = await signedIn();
    t.deps.abortAllRequests();
    t.log.length = 0;
    t.fire401(t.epoch() - 1);
    expect(t.session()).toEqual({ status: 'authenticated', user: ANA });
    expect(t.log).toEqual([]);
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('flushSync pinta el estado anonymous antes de vaciar la memoria', async () => {
    const t = await signedIn();
    t.fire401(t.epoch());
    expect(t.deps.flushSync).toHaveBeenCalledTimes(1);
    expect(t.log.slice(0, 3)).toEqual(['resetAgenda@authenticated', 'flushSync', 'set:anonymous']);
  });

  it('from es la ruta del acceso inyectado si es protegida y undefined si es pública', async () => {
    const protectedCase = await signedIn();
    protectedCase.setPath(ROUTES.schedule);
    protectedCase.fire401(protectedCase.epoch());
    expect(protectedCase.navigate.mock.calls[0]?.[1].state?.from).toBe(ROUTES.schedule);

    const publicCase = await signedIn();
    publicCase.setPath(ROUTES.landing);
    publicCase.fire401(publicCase.epoch());
    expect(publicCase.navigate.mock.calls[0]?.[1].state?.from).toBeUndefined();
    expect(publicCase.navigate.mock.calls[0]?.[1].state?.notice).toBe('expired');
  });

  it('sin usuario de sesión: a login con from y sin notice, sin limpiar', async () => {
    const t = setup(ROUTES.profile);
    t.state().attachRouter(t.router);
    t.deps.api.me.mockResolvedValue(null);
    t.state().start();
    await flush();
    t.log.length = 0;
    t.deps.queryCache.clear.mockClear();
    t.navigate.mockClear();

    t.fire401(t.epoch());
    expect(t.navigate).toHaveBeenCalledTimes(1);
    const state = t.navigate.mock.calls[0]?.[1].state;
    expect(state?.from).toBe(ROUTES.profile);
    expect(state?.notice).toBeUndefined();
    expect(t.deps.queryCache.clear).not.toHaveBeenCalled();
    expect(t.session()).toEqual({ status: 'anonymous' });
  });
});

describe('RF-7: cambio de sesión en otra pestaña', () => {
  it('con usuario y ruta protegida: limpia sin borrar el comprobante y navega con from y otherTab', async () => {
    const t = await signedIn();
    t.setPath(ROUTES.profile);
    t.fireOtherTab();

    expect(t.session()).toEqual({ status: 'anonymous' });
    expect(t.deps.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(t.deps.clearCsrfIfOwn).not.toHaveBeenCalled();
    expect(t.deps.announce).not.toHaveBeenCalled();
    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.navigate).toHaveBeenCalledWith(ROUTES.login, {
      replace: true,
      state: { from: ROUTES.profile, notice: 'otherTab' },
    });
  });

  it('con usuario y ruta pública: limpia pero no navega', async () => {
    const t = await signedIn();
    t.setPath(ROUTES.landing);
    t.fireOtherTab();
    expect(t.session()).toEqual({ status: 'anonymous' });
    expect(t.deps.clearCsrfIfOwn).not.toHaveBeenCalled();
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('en checking: solo limpia, el estado sigue en checking y no navega', () => {
    const t = setup(ROUTES.profile);
    t.state().attachRouter(t.router);
    t.deps.api.me.mockReturnValue(new Promise(() => {}));
    t.state().start();
    t.fireOtherTab();
    expect(t.session()).toEqual({ status: 'checking' });
    expect(t.deps.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(t.deps.clearCsrfIfOwn).not.toHaveBeenCalled();
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('en error: solo limpia, el estado sigue en error y no navega', async () => {
    const t = setup(ROUTES.profile);
    t.state().attachRouter(t.router);
    t.deps.api.me.mockRejectedValue(new Error('Sin red'));
    t.state().start();
    await flush();
    t.deps.queryCache.clear.mockClear();
    t.fireOtherTab();
    expect(t.session()).toEqual({ status: 'error', message: 'Sin red' });
    expect(t.deps.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(t.deps.clearCsrfIfOwn).not.toHaveBeenCalled();
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('en anonymous: solo limpia y no navega', async () => {
    const t = setup(ROUTES.profile);
    t.state().attachRouter(t.router);
    t.deps.api.me.mockResolvedValue(null);
    t.state().start();
    await flush();
    t.deps.queryCache.clear.mockClear();
    t.fireOtherTab();
    expect(t.deps.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(t.navigate).not.toHaveBeenCalled();
  });
});

describe('RF-8: actualizar el usuario de la sesión', () => {
  it('con usuario de sesión lo sustituye y sigue authenticated', async () => {
    const t = await signedIn();
    const updated = { ...ANA, displayName: 'Ana Pérez' };
    t.state().setUser(updated);
    expect(t.session()).toEqual({ status: 'authenticated', user: updated });
  });

  it('sin usuario de sesión no cambia nada', () => {
    const checking = setup();
    const before = checking.session();
    checking.state().setUser(ANA);
    expect(checking.session()).toBe(before);
    expect(checking.log).toEqual([]);
  });

  it('en anonymous y en error tampoco cambia nada', async () => {
    const anon = setup();
    anon.deps.api.me.mockResolvedValue(null);
    anon.state().start();
    await flush();
    anon.state().setUser(ANA);
    expect(anon.session()).toEqual({ status: 'anonymous' });

    const failed = setup();
    failed.deps.api.me.mockRejectedValue(new Error('Sin red'));
    failed.state().start();
    await flush();
    failed.state().setUser(ANA);
    expect(failed.session()).toEqual({ status: 'error', message: 'Sin red' });
  });
});

describe('RF-16: la agenda se reinicia con la sesión', () => {
  it('en cada limpieza (consulta con 401, cierre de sesión, 401, otra pestaña) y antes de pintar sin usuario', async () => {
    const me401 = setup();
    me401.deps.api.me.mockResolvedValue(null);
    me401.state().start();
    await flush();
    expect(me401.deps.resetAgenda).toHaveBeenCalledTimes(1);

    const out = await signedIn();
    await out.state().logout();
    expect(out.deps.resetAgenda).toHaveBeenCalledTimes(1);
    expect(out.log[0]).toBe('resetAgenda@authenticated');

    const expired = await signedIn();
    expired.fire401(expired.epoch());
    expect(expired.deps.resetAgenda).toHaveBeenCalledTimes(1);
    expect(expired.log[0]).toBe('resetAgenda@authenticated');

    const tab = await signedIn();
    tab.fireOtherTab();
    expect(tab.deps.resetAgenda).toHaveBeenCalledTimes(1);
    expect(tab.log[0]).toBe('resetAgenda@authenticated');
  });

  it('al entrar un usuario (inicio de sesión y registro), una vez y después de vaciar la memoria', async () => {
    const t = setup();
    t.state().attachRouter(t.router);
    t.deps.api.login.mockResolvedValue(ANA);
    await t.state().login(CREDENTIALS, ROUTES.home);
    expect(t.deps.resetAgenda).toHaveBeenCalledTimes(1);
    expect(t.log.indexOf('clear@checking')).toBeLessThan(t.log.indexOf('resetAgenda@checking'));

    const r = setup();
    r.state().attachRouter(r.router);
    r.deps.api.register.mockResolvedValue(ANA);
    r.deps.api.login.mockResolvedValue(ANA);
    await r.state().register(REGISTER);
    expect(r.deps.resetAgenda).toHaveBeenCalledTimes(1);
  });

  it('un fallo de la consulta de sesión (error) no reinicia la agenda', async () => {
    const t = setup();
    t.deps.api.me.mockRejectedValue(new Error('Sin red'));
    t.state().start();
    await flush();
    expect(t.deps.resetAgenda).not.toHaveBeenCalled();
  });
});
