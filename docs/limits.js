export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
export const EVENT_LIMITS = Object.freeze({revisions:500,reviews:2000,connections:2000,modelRuns:200,resolutions:500,contextDefinitions:200,contextEvents:2000,assertions:2000,assertionReviews:2000});
export function checkCounts(state) {
 for (const [name,limit] of Object.entries(EVENT_LIMITS)) {
  if ((state[name]||[]).length > limit) throw Error('This record has reached its '+name+' limit. Export it and start a linked record to continue.');
 }
}
