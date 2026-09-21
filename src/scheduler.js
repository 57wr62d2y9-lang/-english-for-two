import { LEVELS, weaknessScore } from './learning.js';

const levelIndex = level => LEVELS.indexOf(level);

export function leastRecentlyUsed(items, progress = {}, recent = []) {
  return [...items].sort((a, b) => {
    const recentPenalty = Number(recent.includes(a.id)) - Number(recent.includes(b.id));
    return recentPenalty || weaknessScore(progress[b.id]) - weaknessScore(progress[a.id]) || (progress[a.id]?.l || 0) - (progress[b.id]?.l || 0);
  })[0];
}

export function chooseListeningLesson(lessons, level, progress = {}, recent = []) {
  const exact = lessons.filter(item => item.level === level);
  const lower = lessons.filter(item => levelIndex(item.level) < levelIndex(level));
  return leastRecentlyUsed(exact.length ? exact : lower, progress, recent);
}
