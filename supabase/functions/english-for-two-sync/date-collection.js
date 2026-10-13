// Bounded metadata for the already-linked partner. No cash value, gift
// request, notification or new database permission is created here.
export const DATE_ITEMS=['bouquet','coffee','ticket','bag','keys'];
export function cleanDateCollection(raw) {
  if(raw?.version!==1)return null;
  const counts=Object.fromEntries(DATE_ITEMS.map(id=>[id,
    Number.isSafeInteger(raw.counts?.[id])&&raw.counts[id]>=0?Math.min(10000,raw.counts[id]):0]));
  return {version:1,counts,completed:Math.min(...Object.values(counts))};
}
export function mergeDateCollection(a,b) {
  const left=cleanDateCollection(a),right=cleanDateCollection(b);
  if(!left)return right;if(!right)return left;
  return cleanDateCollection({version:1,counts:Object.fromEntries(DATE_ITEMS.map(id=>[id,Math.max(left.counts[id],right.counts[id])]))});
}
