// Read settled ledger amounts without awarding money or changing the wallet.
// This is shared by the history screen and the partner notification endpoint.
export function lessonRewardTotal(lesson = {}) {
  return ['reward', 'checkReward', 'bonusReward'].reduce((sum, key) => {
    const amount = Number(lesson[key]);
    return sum + (Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0);
  }, 0);
}
