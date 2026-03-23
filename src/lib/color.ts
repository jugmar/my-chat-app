export function getUserColor(userIdStr: string) {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
    '#f43f5e'
  ];
  let hash = 0;
  for (let i = 0; i < userIdStr.length; i++) {
    hash = userIdStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
