import axios from 'axios';

const USER_STORAGE_KEY = 'user';

const PUBLIC_API_PATH_PREFIXES = ['/api/movies'];
const PUBLIC_API_EXACT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/forgot-password',
  '/api/auth/email-exists',
];

let interceptorsInitialized = false;
const getCache = new Map();
const inflightGetRequests = new Map();

const isJsonLikeValue = (value) => {
  return typeof value === 'string' && value.trim() !== '';
};

export const parseStoredJson = (value, fallback = null) => {
  if (!isJsonLikeValue(value)) return fallback;

  const trimmedValue = value.trim();
  if (trimmedValue === 'undefined' || trimmedValue === 'null') return fallback;

  try {
    const parsed = JSON.parse(trimmedValue);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const getStoredUser = () => {
  return parseStoredJson(localStorage.getItem(USER_STORAGE_KEY), null);
};

export const getStoredToken = () => {
  const storedUser = getStoredUser();
  const token = storedUser?.token;
  return typeof token === 'string' && token.trim() ? token : null;
};

export const authHeaders = (token) => {
  const resolvedToken = token || getStoredToken();
  if (!resolvedToken) return {};

  return {
    Authorization: `Bearer ${resolvedToken}`,
  };
};

const serializeParams = (params = {}) => {
  const keys = Object.keys(params).sort();
  if (!keys.length) return '';

  const search = new URLSearchParams();
  keys.forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  return search.toString();
};

const buildCacheKey = (url, config = {}, cacheKey) => {
  if (cacheKey) return cacheKey;
  const paramsPart = serializeParams(config.params);
  return paramsPart ? `${url}?${paramsPart}` : String(url);
};

export const cachedGet = async (url, options = {}) => {
  const { ttlMs = 15000, cacheKey, config = {} } = options;
  const key = buildCacheKey(url, config, cacheKey);
  const now = Date.now();
  const cached = getCache.get(key);

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.value;
  }

  if (inflightGetRequests.has(key)) {
    return inflightGetRequests.get(key);
  }

  const requestPromise = axios
    .get(url, config)
    .then((response) => {
      getCache.set(key, { timestamp: Date.now(), value: response.data });
      return response.data;
    })
    .finally(() => {
      inflightGetRequests.delete(key);
    });

  inflightGetRequests.set(key, requestPromise);
  return requestPromise;
};

export const invalidateApiCache = (matcher) => {
  if (!matcher) {
    getCache.clear();
    inflightGetRequests.clear();
    return;
  }

  for (const key of getCache.keys()) {
    if (key.includes(matcher)) getCache.delete(key);
  }
  for (const key of inflightGetRequests.keys()) {
    if (key.includes(matcher)) inflightGetRequests.delete(key);
  }
};

export const clearApiCache = () => invalidateApiCache();

const resolveRequestPath = (config = {}) => {
  const requestUrl = config.url || '';
  const baseUrl = config.baseURL || '';

  const isAbsolute = /^https?:\/\//i.test(requestUrl);
  if (isAbsolute) {
    try {
      return new URL(requestUrl).pathname;
    } catch {
      return requestUrl;
    }
  }

  const normalizedBase = baseUrl ? `/${String(baseUrl).replace(/^\/+|\/+$/g, '')}` : '';
  const normalizedPath = requestUrl ? `/${String(requestUrl).replace(/^\/+/, '')}` : '';
  const joinedPath = `${normalizedBase}${normalizedPath}`;
  return joinedPath || requestUrl;
};

const isPublicApiPath = (path) => {
  if (!path || !path.startsWith('/api')) return true;
  if (PUBLIC_API_EXACT_PATHS.includes(path)) return true;
  return PUBLIC_API_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const isProtectedApiRequest = (config) => {
  const path = resolveRequestPath(config);
  if (!path.startsWith('/api')) return false;
  return !isPublicApiPath(path);
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/') return;
  const next = `${window.location.pathname}${window.location.search || ''}`;
  window.location.replace(`/?redirect=${encodeURIComponent(next)}`);
};

export const setupAxiosInterceptors = () => {
  if (interceptorsInitialized) return;
  interceptorsInitialized = true;

  axios.interceptors.request.use(
    (config) => {
      const token = getStoredToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
        return config;
      }

      if (isProtectedApiRequest(config)) {
        redirectToLogin();
        const error = new Error('Missing authentication token');
        error.code = 'AUTH_TOKEN_MISSING';
        return Promise.reject(error);
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && isProtectedApiRequest(error.config)) {
        localStorage.removeItem(USER_STORAGE_KEY);
        clearApiCache();
        redirectToLogin();
      }

      return Promise.reject(error);
    }
  );
};
