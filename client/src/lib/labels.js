export const COLOR_LABELS = {
  red: '红',
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  white: '白',
};

export const COLORS = ['red', 'yellow', 'green', 'blue', 'white'];

export function resultText(result, score, label) {
  if (result === 'win') return `满分胜利！${score} 分 · ${label}`;
  if (result === 'lose') return `三次失误，表演失败… 得分 ${score}`;
  if (result === 'score') return `终局得分 ${score} · ${label}`;
  return '';
}
