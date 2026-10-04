export function cleanVocabularySummary(value) {
  if(!value || value.version!==1 || !Number.isFinite(Number(value.total)) || Number(value.total)<1)return null;
  const total=Math.min(10000,Math.trunc(Number(value.total)));
  const count=value=>Math.max(0,Math.min(total,Math.trunc(Number(value)||0)));
  const introduced=count(value.introduced);
  return {version:1,total,introduced,verified:Math.min(introduced,count(value.verified)),ready:Math.min(introduced,count(value.ready))};
}
