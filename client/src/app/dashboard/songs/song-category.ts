const CHO_TO_CAT: Record<number, string> = {
  0:'ㄱ',1:'ㄱ',2:'ㄴ',3:'ㄷ',4:'ㄷ',5:'ㄹ',6:'ㅁ',7:'ㅂ',8:'ㅂ',
  9:'ㅅ',10:'ㅅ',11:'ㅇ',12:'ㅈ',13:'ㅈ',14:'ㅊ',15:'ㅊ',16:'ㅊ',17:'ㅊ',18:'ㅎ',
};

export function getSongCategory(title: string): string | null {
  if (!title) return null;
  const code = title.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return CHO_TO_CAT[Math.floor((code - 0xAC00) / (21 * 28))] ?? null;
  }
  const upper = title[0].toUpperCase();
  if (upper >= 'A' && upper <= 'Z') return upper;
  return null;
}
