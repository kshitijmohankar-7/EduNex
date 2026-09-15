export function attendanceProjection(present, total, target = 75) {
  const p = Number(present) || 0;
  const t = Number(total) || 0;
  const current = t ? (p / t) * 100 : 0;
  if (current >= target) return { current, needed: 0, message: `You are already at or above ${target}%.` };
  // Solve (p+x)/(t+x) >= target/100.
  const needed = Math.max(0, Math.ceil(((target / 100) * t - p) / (1 - target / 100)));
  return { current, needed, message: needed === 1 ? `Attend the next class to reach about ${target}%.` : `Attend the next ${needed} classes consecutively to reach about ${target}%.` };
}

export function absenceImpact(present, total) {
  const p = Number(present) || 0;
  const t = Number(total) || 0;
  return t ? Math.max(0, ((p / (t + 1)) * 100)) : 0;
}
