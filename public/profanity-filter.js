const SEPARATORS = /[\s._\-~`'"“”‘’()[\]{}<>/\\|+*=,;:!?ㆍ·…]/gu;

const RAW_INITIAL_PATTERNS = [
  /ㅆ?ㅅㅂ/u,
  /ㅂㅅ/u,
  /ㅈㄹ/u,
  /ㅈㄴ/u,
  /ㄱㅅㄲ/u,
  /ㄱㅅㄱ/u,
  /ㄷㅊ/u,
  /ㄲㅈ/u,
  /ㅁㅊ(?:ㄴ|ㄴㅇ|ㄴㄴ|ㅅㄲ)?/u,
  /ㅈ(?:같|까|밥)/u
];

const PROFANITY_PATTERNS = [
  // Strong Korean curse stems and common obfuscated forms.
  /(?:씨|시|씹|십|씨이|시이|씨ㅣ|시ㅣ)+발(?!점)/u,
  /(?:씨|시|씹|십)+팔/u,
  /(?:씨|시)+바(?:ㄹ|르|알|라)?/u,
  /ㅆ?ㅣ?ㅂㅏㄹ/u,
  /(?:개)?(?:좆|좃|졷|좄|좇)/u,
  /(?:좆|좃|졷|좄|좇|조)+같/u,
  /(?:좆|좃|졷|좄|좇|조)+까/u,
  /엿(?:먹|이나)/u,

  // Insults students commonly type with spacing, repeated vowels, or light spelling changes.
  /지+이*랄/u,
  /쥐+랄/u,
  /지+롤/u,
  /염+병/u,
  /육+갑/u,
  /병+신/u,
  /븅+신/u,
  /빙+신/u,
  /개+소리/u,
  /개+(?:같|가튼|가타|같은)/u,
  /개+(?:새+끼|세+끼|색+기|쉐+끼|쉑+끼|샊+끼|샠+기)/u,
  /(?:새+끼|쉐+끼|쉑+끼|샊+끼|샠+기)/u,
  /(?:존+나|졸+라|줜+나|조+낸|존+내|졸+래)/u,
  /(?:닥+쳐|다+쳐)/u,
  /(?:꺼+져|끄+져|ㄲㅓ져)/u,
  /(?:뒤+져|디+져|죽+어)/u,
  /(?:미+친|미취+인)(?:놈|년|뇬|련|새끼|쉐끼|쉑|자식)/u,
  /(?:씹|십|쓉|쒸입|씨입)(?:놈|년|뇬|련|새끼|쉐끼|쉑|자식)/u,
  /(?:또+라이|돌+아이)/u,
  /찐+따/u,
  /호+구/u,

  // Gendered, family-targeting, and direct-person abuse.
  /개+(?:년|뇬|련)/u,
  /(?:썅|쌍)(?:년|놈|뇬|련)?/u,
  /(?:창+녀|걸+레)/u,
  /(?:니애미|느금마|니미|애미뒤|애비뒤)/u,
  /(?:후레|호로)(?:자식|새끼|쉐끼)/u
];

export function normalizeProfanityText(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[1!l]/gu, "이")
    .replace(/[0o]/gu, "ㅇ")
    .replace(/[3]/gu, "ㅔ")
    .replace(/[4@]/gu, "아")
    .replace(/[8]/gu, "ㅂ")
    .replace(SEPARATORS, "")
    .replace(/(.)\1{3,}/gu, "$1$1$1");
}

export function detectProfanity(text) {
  const compactRaw = String(text ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(SEPARATORS, "");

  if (RAW_INITIAL_PATTERNS.some((pattern) => pattern.test(compactRaw))) return true;

  const normalized = normalizeProfanityText(text);
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized));
}
