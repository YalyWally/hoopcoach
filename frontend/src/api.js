const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => req('/health'),

  createPlayer: (data) => req('/players', { method: 'POST', body: JSON.stringify(data) }),
  getPlayer: (id) => req(`/players/${id}`),
  updatePlayer: (id, data) => req(`/players/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getContext: (id) => req(`/players/${id}/context`),

  getTests: () => req('/tests'),
  getLabels: () => req('/labels'),
  submitAssessment: (id, body) => req(`/players/${id}/assessments`, { method: 'POST', body: JSON.stringify(body) }),
  getAssessments: (id) => req(`/players/${id}/assessments`),
  getLatestRatings: (id) => req(`/players/${id}/ratings/latest`),
  getBadges: (id) => req(`/players/${id}/badges`),

  getWorkouts: (id, from, to) => req(`/players/${id}/workouts${from ? `?from=${from}&to=${to}` : ''}`),
  getWorkout: (id) => req(`/workouts/${id}`),
  updateWorkout: (id, body) => req(`/workouts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  checkin: (workoutId, body) => req(`/workouts/${workoutId}/checkin`, { method: 'POST', body: JSON.stringify(body) }),
  completeWorkout: (workoutId, body) => req(`/workouts/${workoutId}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  moveWorkout: (playerId, body) => req(`/players/${playerId}/workouts/move`, { method: 'POST', body: JSON.stringify(body) }),
  getChangeHistory: (playerId) => req(`/players/${playerId}/change-history`),

  getNutritionTargets: (id) => req(`/players/${id}/nutrition/targets`),
  recomputeTargets: (id) => req(`/players/${id}/nutrition/targets/recompute`, { method: 'POST' }),
  getNutritionToday: (id) => req(`/players/${id}/nutrition/today`),
  logMeal: (id, body) => req(`/players/${id}/nutrition/log`, { method: 'POST', body: JSON.stringify(body) }),
  deleteMealLog: (logId) => req(`/nutrition/logs/${logId}`, { method: 'DELETE' }),
  updateMealLog: (logId, body) => req(`/nutrition/logs/${logId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getNutritionHistory: (id, days) => req(`/players/${id}/nutrition/history?days=${days || 14}`),
  setFoodPrefs: (id, body) => req(`/players/${id}/food-prefs`, { method: 'POST', body: JSON.stringify(body) }),

  getChatHistory: (id) => req(`/players/${id}/chat/history`),
  sendChat: (id, message) => req(`/players/${id}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),
  fixMyPlan: (id) => req(`/players/${id}/fix-my-plan`, { method: 'POST' }),
  getPlanIssues: (id) => req(`/players/${id}/plan-issues`),

  // Meal plan
  getMealPlan: (id, from, to) => req(`/players/${id}/meal-plan?from=${from}&to=${to}`),
  generateMealPlan: (id, days) => req(`/players/${id}/meal-plan/generate`, { method: 'POST', body: JSON.stringify({ days }) }),
  swapMeal: (id, body) => req(`/players/${id}/meal-plan/swap`, { method: 'POST', body: JSON.stringify(body) }),

  // Grocery list
  getGroceryList: (id, weekStart) => req(`/players/${id}/grocery-list${weekStart ? `?weekStart=${weekStart}` : ''}`),

  // Photo meal scan
  scanMeal: (id, imageBase64, mediaType) => req(`/players/${id}/nutrition/scan`, { method: 'POST', body: JSON.stringify({ imageBase64, mediaType }) }),

  // Food data
  getIngredients: () => req('/food/ingredients'),
  getRecipes: (mealType) => req(`/food/recipes${mealType ? `?mealType=${mealType}` : ''}`),

  // Calendar
  importCalendar: (id, icsText) => req(`/players/${id}/calendar/import`, { method: 'POST', body: JSON.stringify({ icsText }) }),
  getExternalEvents: (id) => req(`/players/${id}/calendar/external-events`),
  deleteExternalEvent: (eventId) => req(`/calendar/external-events/${eventId}`, { method: 'DELETE' }),

  // Push / notifications
  getNotificationPrefs: (id) => req(`/players/${id}/notification-prefs`),
  setNotificationPrefs: (id, prefs) => req(`/players/${id}/notification-prefs`, { method: 'PATCH', body: JSON.stringify(prefs) }),
  sendTestPush: (id) => req(`/players/${id}/push/test`, { method: 'POST' }),
};
