const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const imageToBase64 = require('image-to-base64');
const fetch = require('node-fetch');
require('dotenv').config()

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_TOKEN_PLANT = process.env.BOT_TOKEN_PLANT;
// const BOT_SECOND_TOKEN_PLANT = process.env.BOT_SECOND_TOKEN_PLANT;
const BOT_TOKEN_GOOGLE = process.env.BOT_TOKEN_GOOGLE;
const TOKEN_GOOGLE_ID = process.env.TOKEN_GOOGLE_ID;

const app = express();

app.use(express.json());

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const options = {
  reply_markup: JSON.stringify({
    keyboard: [
      [{ text: '🌻Распознать растение🌻', callback_data: 'data1' }],
    ],
  }),
};

bot.onText(/\/start/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Привет, ${msg.chat.first_name}! Выбери действие:`, options);
});


bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text === '🌻Распознать растение🌻') {
    bot.sendMessage(chatId, '🌱🌱🌱Загрузи свою фотографию растения🌱🌱🌱');
  }
});

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  bot.getFile(msg.photo[2].file_id).then((link) => {
    const linkImage = `https://api.telegram.org/file/bot${BOT_TOKEN}/${link.file_path}`;
    imageToBase64(linkImage)
      .then(
        (response) => {
          const imageArrToBase64 = ['data:image/jpeg;base64,' + response];
          const data = {
            api_key: BOT_TOKEN_PLANT,
            images: imageArrToBase64,
            modifiers: ["crops_fast", "similar_images"],
            plant_language: "en",
            plant_details: ["common_names",
              "url",
              "name_authority",
              "wiki_description",
              "taxonomy",
              "synonyms"]
          };
          fetch('https://api.plant.id/v2/identify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          })
            .then(response => response.json())
            .then(async (data) => {
              const resultPlant = data.suggestions[0].plant_name
              const resultPlantNew = resultPlant.replace(' ', '+');
              const urlGoogle = encodeURI(`https://www.googleapis.com/customsearch/v1?key=${BOT_TOKEN_GOOGLE}&cx=${TOKEN_GOOGLE_ID}&q=${resultPlantNew}+уход`);
              fetch(urlGoogle)
                .then(response => response.json())
                .then(async (dataGoogle) => {
                  const searchGoogle1 = dataGoogle.items[0].link;
                  const searchGoogle2 = dataGoogle.items[1].link;
                  const searchGoogle3 = dataGoogle.items[2].link;
                  await bot.sendMessage(chatId, `🍀🍀🍀Узнать больше про уход (TOP 1 GOOGLE 🇷🇺): ${searchGoogle1}`);
                  await bot.sendMessage(chatId, `🍀🍀Узнать больше про уход (TOP 2 GOOGLE 🇷🇺): ${searchGoogle2}`);
                  await bot.sendMessage(chatId, `🍀Узнать больше про уход (TOP 3 GOOGLE 🇷🇺): ${searchGoogle3}`);
                })
                .catch((error) => {
                  console.error('Error:', error);
                });
              await bot.sendMessage(chatId, `🌴🌱🌵Возможно это ... ${data.suggestions[0].plant_name}`);
              await bot.sendMessage(chatId, `🌿🌻🌳Краткое описание (ENG): ${data.suggestions[0].plant_details.wiki_description.value}`);
              await bot.sendMessage(chatId, `🌾🌷🌿Узнать больше (ENG WIKI): ${data.suggestions[0].plant_details.wiki_description.citation}`);
            })
            .catch((error) => {
              console.error('Error:', error);
            });
        }
      )
      .catch(
        (error) => {
          console.log(error);
        }
      )
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Сервер запущен. Порт:', port);
});
