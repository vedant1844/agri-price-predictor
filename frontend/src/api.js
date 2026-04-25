/**
 * API Service — Centralized communication with the backend
 * 
 * All frontend API calls go through this module.
 * Base URL comes from REACT_APP_API_URL environment variable.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'https://agri-backend-y21k.onrender.com';

/**
 * Generic fetch wrapper with error handling, timeout, and retry.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The server may be waking up — please try again.');
    }
    throw error;
  }
}

/**
 * Wake up the Render server (free tier sleeps after 15 min of inactivity).
 * Call this early to reduce wait time on actual API calls.
 */
export async function wakeUpServer() {
  try {
    await apiFetch('/health');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get price prediction using the hybrid ARIMA + XGBoost model.
 */
export async function fetchPrediction({ commodity, state, month, currentYear, futureYear }) {
  const params = new URLSearchParams({
    commodity: commodity || 'wheat',
    state: state || 'karnataka',
    month: String(month || 4),
    current_year: String(currentYear || 2026),
    future_year: String(futureYear || 2028),
  });

  return apiFetch(`/predict?${params}`);
}

/**
 * Get historical prices from Supabase.
 */
export async function fetchPrices({ commodity, state, limit } = {}) {
  const params = new URLSearchParams();
  if (commodity) params.set('commodity', commodity);
  if (state) params.set('state', state);
  if (limit) params.set('limit', String(limit));

  return apiFetch(`/prices?${params}`);
}

/**
 * Get aggregated price statistics.
 */
export async function fetchPriceStats({ commodity, state } = {}) {
  const params = new URLSearchParams();
  if (commodity) params.set('commodity', commodity);
  if (state) params.set('state', state);

  return apiFetch(`/price-stats?${params}`);
}

/**
 * Get live market data from the Government API.
 */
export async function fetchMarketData({ state, commodity } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (commodity) params.set('commodity', commodity);

  return apiFetch(`/market-data?${params}`);
}

/**
 * Get list of available commodities from the database.
 */
export async function fetchCommodities() {
  return apiFetch('/commodities');
}

/**
 * Get list of available states from the database.
 */
export async function fetchStates() {
  return apiFetch('/states');
}

/**
 * Trigger data update from the government API.
 */
export async function triggerDataUpdate() {
  return apiFetch('/update-data');
}

/**
 * Trigger model training.
 */
export async function triggerTraining() {
  return apiFetch('/train');
}
