const STRINGS = {
  en: {
    'lang.tag': 'en',
    'ui.title': 'Aetheria',
    'ui.subtitle': 'the mist speaks in intervals',
    'ui.start': 'Light the torch',
    'ui.again': 'Back into the mist',
    'ui.controls': 'arrows / wasd move &middot; space listen &middot; x sword',
    'ui.language': 'language',

    'world.title': 'Aetheria',
    'world.intro':
      'One world, and it speaks in intervals. West, the <strong>temple</strong> keeps its bells and a door ' +
      'that sings. East, a gate sings a leap no bell in the field knows — the key is a <strong>sound</strong>, ' +
      'and sounds are found by wandering. Beyond the gate waits something that sings before it strikes.',
    'world.startHint':
      'The temple sings to the west. The gate to the east waits for an answer. <strong>Space</strong> listens, <strong>X</strong> answers.',
    'world.winText':
      'The thing beyond the gate falls silent. You reached it by ear — temple, gate, and a leap no bell in the field knew.',

    'end.win': 'The mist parts',
    'end.lose': 'The mist swallows you',
    'end.loseText': 'Your body fell, but the ear remains. The doors you opened stay open.',

    'hint.bellRung': 'The bell sings and the whole world listens. <strong>X</strong> strikes, if it answers a door.',
    'hint.doorSang': 'The door sang. Keep the leap in your ear: the bell that answers it may be far away.',
    'hint.doorOpened': 'The bell answers and a door unmakes itself, wherever it sings.',
    'hint.wrongBell': 'The wrong bell bites your hand. The door sings again — compare it calmly.',
    'hint.enemySings': 'It sings. <strong>Perfect fifth</strong>: a charge — leave the line. <strong>Minor third</strong>: a blast — get away.',
    'hint.enemyDies': 'The creature comes apart into mist.',
    'hint.hurtDash': 'The charge lands. A perfect fifth tells you to leave the line.',
    'hint.hurtRing': 'The blast reaches you. A minor third tells you to run far.',
    'hint.hurtTouch': 'Touching it burns.',

    'hint.bossSings': 'It sings before it moves. Three leaps, three answers — your feet already know two of them.',
    'hint.hurtSweep': 'The closing ring catches you outside. That leap tells you to press in, not to flee.',
  },

  'pt-br': {
    'lang.tag': 'pt-BR',
    'ui.title': 'Aetheria',
    'ui.subtitle': 'a névoa fala em intervalos',
    'ui.start': 'Acender a tocha',
    'ui.again': 'Voltar à névoa',
    'ui.controls': 'setas / wasd mover &middot; espaço ouvir &middot; x espada',
    'ui.language': 'idioma',

    'world.title': 'Aetheria',
    'world.intro':
      'Um mundo só, e ele fala em intervalos. A oeste, o <strong>templo</strong> guarda sinos e uma porta ' +
      'que canta. A leste, um portão canta um salto que nenhum sino do campo conhece — a chave é um ' +
      '<strong>som</strong>, e sons se encontram explorando. Além do portão espera algo que canta antes de bater.',
    'world.startHint':
      'O templo canta a oeste. O portão a leste espera uma resposta. <strong>Espaço</strong> ouve, <strong>X</strong> responde.',
    'world.winText':
      'A coisa além do portão se cala. Você chegou até ela pelo ouvido — templo, portão e um salto que nenhum sino do campo conhecia.',

    'end.win': 'A névoa se abre',
    'end.lose': 'A névoa te engole',
    'end.loseText': 'Seu corpo caiu, mas o ouvido fica. As portas que você já abriu continuam abertas.',

    'hint.bellRung': 'O sino canta e o mundo inteiro escuta. <strong>X</strong> golpeia, se ele responde a alguma porta.',
    'hint.doorSang': 'A porta cantou. Guarde o salto no ouvido: o sino que responde pode estar longe.',
    'hint.doorOpened': 'O sino responde e uma porta se desfaz, onde quer que ela cante.',
    'hint.wrongBell': 'O sino errado morde sua mão. A porta canta de novo — compare com calma.',
    'hint.enemySings': 'Ela canta. <strong>Quinta justa</strong>: investida — saia da linha. <strong>Terça menor</strong>: explosão — afaste-se.',
    'hint.enemyDies': 'A criatura se desfaz em névoa.',
    'hint.hurtDash': 'A investida te acerta. Quinta justa manda sair da linha.',
    'hint.hurtRing': 'A explosão te alcança. Terça menor manda correr para longe.',
    'hint.hurtTouch': 'Encostar nela queima.',

    'hint.bossSings': 'Ela canta antes de se mexer. Três saltos, três respostas — seus pés já conhecem dois.',
    'hint.hurtSweep': 'O anel se fecha e te pega do lado de fora. Esse salto manda colar, não fugir.',
  },
};

export const LOCALES = Object.keys(STRINGS);

export const DEFAULT_LOCALE = 'en';

let current = DEFAULT_LOCALE;

export const setLocale = (locale) => {
  current = STRINGS[locale] ? locale : DEFAULT_LOCALE;
  return current;
};

export const getLocale = () => current;

export const t = (key) => STRINGS[current][key] ?? STRINGS[DEFAULT_LOCALE][key] ?? key;
