export const WEEKDAY_FULL_LABELS = {
  ru: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  de: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
  pt: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
  it: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  ko: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
};

export const HEALTH_COIN_LABELS = {
  ru: {
    pink: "розовых монет",
    red: "красных монет",
    orange: "оранжевых монет",
    blue: "синих монет",
    green: "зелёных монет",
  },
  en: {
    pink: "pink coins",
    red: "red coins",
    orange: "orange coins",
    blue: "blue coins",
    green: "green coins",
  },
  es: {
    pink: "monedas rosas",
    red: "monedas rojas",
    orange: "monedas naranjas",
    blue: "monedas azules",
    green: "monedas verdes",
  },
  fr: {
    pink: "pièces roses",
    red: "pièces rouges",
    orange: "pièces orange",
    blue: "pièces bleues",
    green: "pièces vertes",
  },
  de: {
    pink: "rosa Münzen",
    red: "rote Münzen",
    orange: "orange Münzen",
    blue: "blaue Münzen",
    green: "grüne Münzen",
  },
  pt: {
    pink: "moedas rosas",
    red: "moedas vermelhas",
    orange: "moedas laranja",
    blue: "moedas azuis",
    green: "moedas verdes",
  },
  it: {
    pink: "monete rosa",
    red: "monete rosse",
    orange: "monete arancioni",
    blue: "monete blu",
    green: "monete verdi",
  },
  ar: {
    pink: "عملات وردية",
    red: "عملات حمراء",
    orange: "عملات برتقالية",
    blue: "عملات زرقاء",
    green: "عملات خضراء",
  },
  zh: {
    pink: "粉色币",
    red: "红色币",
    orange: "橙色币",
    blue: "蓝色币",
    green: "绿色币",
  },
  ko: {
    pink: "분홍 코인",
    red: "빨간 코인",
    orange: "주황 코인",
    blue: "파란 코인",
    green: "초록 코인",
  },
};

export const ZERO_HEALTH_REWARD_LABELS = {
  ru: "0 монет",
  en: "0 coins",
  es: "0 monedas",
  fr: "0 pièce",
  de: "0 Münzen",
  pt: "0 moedas",
  it: "0 monete",
  ar: "0 عملات",
  zh: "0 个币",
  ko: "코인 0개",
};

export const WEEKDAY_LABELS = {
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  it: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
  ar: ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  ko: ["일", "월", "화", "수", "목", "금", "토"],
};

export const WEEKDAY_LABELS_MONDAY_FIRST = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  fr: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  pt: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
  ar: ["اثن", "ثلا", "أرب", "خمي", "جمع", "سبت", "أحد"],
  zh: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  ko: ["월", "화", "수", "목", "금", "토", "일"],
};

export const WEEKDAY_SELECTOR_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_LABEL_KEYS = {
  0: "frequencyWeekdaySunday",
  1: "frequencyWeekdayMonday",
  2: "frequencyWeekdayTuesday",
  3: "frequencyWeekdayWednesday",
  4: "frequencyWeekdayThursday",
  5: "frequencyWeekdayFriday",
  6: "frequencyWeekdaySaturday",
};

export const FREQUENCY_COUNTDOWN_TOKENS = {
  ru: { day: "д", hour: "ч", minute: "м" },
  en: { day: "d", hour: "h", minute: "m" },
  es: { day: "d", hour: "h", minute: "m" },
  fr: { day: "j", hour: "h", minute: "m" },
  de: { day: "T", hour: "Std", minute: "Min" },
  pt: { day: "d", hour: "h", minute: "min" },
  it: { day: "g", hour: "h", minute: "min" },
  ar: { day: "ي", hour: "س", minute: "د" },
  zh: { day: "天", hour: "小时", minute: "分" },
  ko: { day: "일", hour: "시간", minute: "분" },
};

export const FRIDGE_DOOR_NOTE_LABELS = {
  ru: "Список покупок",
  en: "Shopping list",
  es: "Lista de compras",
  fr: "Liste d’achats",
  de: "Einkaufsliste",
  pt: "Lista de compras",
  it: "Lista acquisti",
  ar: "قائمة المشتريات",
  zh: "购物清单",
  ko: "구매 목록",
};

export const TEMPTATION_SAVINGS_SCORE_LABELS = {
  ru: "Рейтинг экономии",
  en: "Savings score",
  es: "Puntuación de ahorro",
  fr: "Score d’épargne",
  de: "Spar-Score",
  pt: "Pontuação de poupança",
  it: "Punteggio risparmio",
  ar: "درجة الادخار",
  zh: "储蓄评分",
  ko: "저축 점수",
};

export const TEMPTATION_SAVINGS_SCORE_COMPACT_TEMPLATES = {
  ru: "Пропущено {{count}}× · +{{amount}}",
  en: "Skipped {{count}}× · +{{amount}}",
  es: "Omitido {{count}}× · +{{amount}}",
  fr: "Évité {{count}}× · +{{amount}}",
  de: "Übersprungen {{count}}× · +{{amount}}",
  pt: "Evitado {{count}}× · +{{amount}}",
  it: "Saltato {{count}}× · +{{amount}}",
  ar: "تم التخطي {{count}}× · +{{amount}}",
  zh: "已跳过 {{count}}× · +{{amount}}",
  ko: "{{count}}× 건너뜀 · +{{amount}}",
};

export const TEMPTATION_DUPLICATE_ACTION_LABELS = {
  ru: "Дублировать карточку",
  en: "Duplicate card",
  es: "Duplicar tarjeta",
  fr: "Dupliquer la carte",
  de: "Karte duplizieren",
  pt: "Duplicar cartão",
  it: "Duplica scheda",
  ar: "تكرار البطاقة",
  zh: "复制卡片",
  ko: "카드 복제",
};

export const TEMPTATION_DUPLICATE_HINTS = {
  ru: "Копия уже создана. Обновите её название и детали.",
  en: "The copy is already created. Update its name and details.",
  es: "La copia ya está creada. Actualiza su nombre y sus detalles.",
  fr: "La copie est déjà créée. Modifiez son nom et ses détails.",
  de: "Die Kopie ist bereits erstellt. Passe ihren Namen und ihre Details an.",
  pt: "A cópia já foi criada. Atualize o nome e os detalhes.",
  it: "La copia è già stata creata. Aggiorna il nome e i dettagli.",
  ar: "تم إنشاء النسخة بالفعل. حدّث اسمها وتفاصيلها.",
  zh: "副本已创建。请更新名称和详细信息。",
  ko: "복사본이 이미 생성되었습니다. 이름과 세부 정보를 수정하세요.",
};
