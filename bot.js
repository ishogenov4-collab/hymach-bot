const { Telegraf } = require('telegraf');
const fs = require('fs');

// === ✅ ИСПРАВЛЕНО: токен в кавычках ===
const bot = new Telegraf('8300837101:AAFDOPKONZZ8g7__j1C-bMlAJayaY-_omug');
// =====================================

// Загрузка слов
let dictionary = [];
let accentMap = {};

try {
  const wordsContent = fs.readFileSync('words.txt', 'utf-8');
  dictionary = wordsContent
    .split('\n')
    .map(word => word.trim())
    .filter(word => word.length > 0);

  const accentsContent = fs.readFileSync('accents.txt', 'utf-8');
  accentsContent
    .split('\n')
    .map(line => line.split('='))
    .forEach(([word, accented]) => {
      if (word && accented) {
        accentMap[word.trim().toLowerCase()] = accented.trim();
      }
    });
} catch (error) {
  console.error('Ошибка загрузки словарей:', error.message);
}

// Функция: применить ударение
function applyAccent(word) {
  const lower = word.toLowerCase();
  return accentMap[lower] || word;
}

// Функция: получить "стем" рифмы (от ударного гласного)
function getRhymeStem(word) {
  const accentedVowels = {
    'а́': 'а', 'е́': 'е', 'ё': 'е', 'и́': 'и', 'о́': 'о',
    'у́': 'у', 'ы́': 'ы', 'э́': 'э', 'ю́': 'ю', 'я́': 'я'
  };

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (accentedVowels[char]) {
      return word.slice(i).replace(char, accentedVowels[char]);
    }
  }
  return word.slice(-3).toLowerCase();
}

// Функция: найти рифмы
function findRhymes(word) {
  const stem = getRhymeStem(word.toLowerCase());
  return dictionary.filter(w => {
    const lowerW = w.toLowerCase();
    return lowerW !== word.toLowerCase() && lowerW.endsWith(stem);
  }).slice(0, 10);
}

// Хранилище избранного
const favorites = {};

// Команда /start
bot.start((ctx) => {
  ctx.reply(
    '👋 Привет! Я Рифмач — бот для подбора рифм.\n\n' +
    '▸ /рифма машина — найти рифмы\n' +
    '▸ Добавляй в избранное ⭐\n\n' +
    'Работает без интернета!'
  );
});

// Команда /рифма
bot.command('рифма', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!args) {
    return ctx.reply('Введите слово: /рифма река');
  }

  const word = applyAccent(args);
  const rhymes = findRhymes(word);

  if (rhymes.length === 0) {
    return ctx.reply('Рифмы не найдены. Попробуйте другое слово.');
  }

  const message = [
    `Рифмы к слову "${word}":`,
    ...rhymes.map(r => `• ${r}`)
  ].join('\n');

  ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⭐ Добавить в избранное', callback_data: `fav_${word}` }]
      ]
    }
  });

  if (!favorites[ctx.from.id]) {
    favorites[ctx.from.id] = [];
  }
});

// Обработчик кнопки "в избранное"
bot.action(/fav_(.+)/, (ctx) => {
  const word = ctx.match[1];
  const userId = ctx.from.id;

  if (!favorites[userId]) {
    favorites[userId] = [];
  }

  if (!favorites[userId].includes(word)) {
    favorites[userId].push(word);
    ctx.answerCbQuery('Добавлено в избранное ✅');
  } else {
    ctx.answerCbQuery('Уже в избранном');
  }
});

// Команда /избранное
bot.command('избранное', (ctx) => {
  const list = favorites[ctx.from.id] || [];
  if (list.length === 0) {
    return ctx.reply('Пока нет избранных слов. Используйте /рифма и кнопку ⭐');
  }

  ctx.reply('Ваше избранное:\n' + list.map(r => `• ${r}`).join('\n'));
});

// Запуск бота
bot.launch().then(() => {
  console.log('✅ Telegram-бот "Рифмач" успешно запущен!');
  console.log('Напишите боту в Telegram: @YOUR_BOT_USERNAME');
});

// Ошибка в обработке
process.on('unhandledRejection', (error) => {
  console.error('Ошибка:', error.message);
});
