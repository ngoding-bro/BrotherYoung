const TelegramBot = require('node-telegram-bot-api');
const { iclik, ngiclik } = require('./lib/nubi.js');
const { getCityName } = require('./lib/loc.js')
const fs = require('fs'); // Menggunakan fs untuk createWriteStream
const fsPromises = require('fs/promises'); // Menggunakan fs/promises untuk operasi berbasis Promise
const axios = require('axios')
const { removeBackground } = require('./lib/removeBg.js')
const path = require('path')
const { getTokenAndOwner, sendAccGdrive, getDataGdrive } = require('./db');
require('ansicolor').nice
const { listStoreFolders } = require('./lib/gdrive.js')
var add_stock = {}, add_gdrive = {}, add_public = {}
const maxPerRow = 4;
console.log (('Start '.cyan + 'Telegram '.yellow + 'Bot'.red).red)
const putrod = async (token, idPemilik) => {
const bot = new TelegramBot(ngiclik(token), { polling: true, request: {
      agentOptions: {
        keepAlive: true,
        family: 4
    }
  } 
});
  try {
    bot.onText(/\/start/, (msg) => {
      const idUser = msg.from.id;
      if (idUser == parseInt(ngiclik(idPemilik), 10)) {
        const start1 = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Stock 🧳', callback_data: 'stock' },
                { text: 'Gdrive 🔑', callback_data: 'gdrive' }
              ],
              [
                { text: 'Sale 💰', callback_data: 'sale' },
                { text: 'AI 🔮', callback_data: 'artificial' }
              ],
              [
                { text: 'Urusan Loker', callback_data: 'loker' },
                { text: 'Publik', callback_data: 'publik'}
              ]
            ]
          }
        };
        bot.sendMessage(idUser, 'Hai tuan, apa yang kau inginkan?', start1);
      }else{
        public(idUser, bot, 'user')
    }
  });
  bot.onText(/\/waktutersisa/, async (msg) => {
    const chatId = msg.from.id;
    if (add_public[chatId] && add_public[chatId].response === 'SOAL_SKD') {
        const elapsed = Date.now() - add_public[chatId].startTime;
        const timeLeft = 80 * 60 * 1000 - elapsed; // 1 jam 20 menit
        
        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            bot.sendMessage(chatId, `Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik`);
        } else {
            bot.sendMessage(chatId, 'Waktu habis!');
        }
    } else {
        bot.sendMessage(chatId, 'Maaf, anda sedang tidak mengerjakan soal.');
    }
});
    bot.on('location', async (msg) => {
      if(add_public[msg.chat.id] && add_public[msg.chat.id].response === "ADZAN_TIMER"){
        await getCityName(msg.location.latitude, msg.location.longitude)
        .then((resolve)=>{
          console.log(resolve.data)
          if(resolve.data===undefined){
            bot.deleteMessage(msg.chat.id,add_public[msg.chat.id].message_id)
            .then(()=>{
              bot.sendMessage(msg.chat.id,'Maaf, lokasi kotamu tidak dapat ditemukan, mohon untuk kembali dan mencoba memasukkan nama kota manual!', {reply_markup:{inline_keyboard:[[{text:'Kembali',callback_data:'publik'}]]}})
            })
          }else{
            let mixedCity = (resolve.data.address.county||resolve.data.address.city)
            if((mixedCity.toUpperCase()).includes('KABUPATEN')){
              mixedCity = (mixedCity.toUpperCase()).replace('KABUPATEN ','KAB. ')
            }else if(!(mixedCity.toUpperCase()).includes('KABUPATEN')){
              mixedCity = 'KOTA ' + mixedCity.toUpperCase()
            }
            const hasil = JSON.parse(fs.readFileSync('./lib/dataIdAdzan.json'))
            const matchingEntry = hasil.data.find(entry => entry.lokasi === mixedCity);
            bot.deleteMessage(msg.chat.id, add_public[msg.chat.id].message_id)
            .then(()=>{
              bot.sendMessage(msg.chat.id, `Apakah benar nama kota/kabupaten kamu adalah ${resolve.data.address.county||resolve.data.address.city}, ${resolve.data.address.country}?`,{reply_markup:{inline_keyboard:[[{text:'Benar',callback_data:'benar_kota_adzan_timer'}],[{text:'Ulangi',callback_data:'adzan_timer'}]]}})
              add_public[msg.chat.id] = { id_location : matchingEntry.id}
              delete add_public[msg.chat.id].response
              delete add_public[msg.chat.id].message_id
              .catch((err)=>{
                console.error('Error geting api quran search city: ', err)
              })
            })
            .catch((err)=>{
              console.error('Error bot location delete message: ', err)
            })
          }
        })
        .catch((err)=>{
          console.error('Error get location on bot location: ', err)
        })
      }
    })
    bot.on('photo', async (msg) => {
      if (add_public[msg.chat.id] && add_public[msg.chat.id].response === 'REMOVE_BACKGROUND') {
          const chatId = msg.chat.id;
          const fileId = msg.photo[msg.photo.length - 1].file_id;
  
          try {
              const file = await bot.getFile(fileId);
              const fileUrl = `https://api.telegram.org/file/bot${encodeURIComponent(ngiclik(token))}/${file.file_path}`;
              const response = await axios({
                  url: fileUrl,
                  responseType: 'stream',
              });
              const filePath = path.join(__dirname, 'public', 'images', `${chatId}.jpg`);
              const fileStream = fs.createWriteStream(filePath);
              response.data.pipe(fileStream);
              fileStream.on('finish', async () => {
                  try {
                      const loadText = bot.sendMessage(chatId, 'Dalam pemrosesan, lama atau cepatnya tergantung dari object foto yang kamu kirim, mohon tunggu!')
                      await removeBackground(filePath)
                      .then(async(resolve)=>{
                        await bot.deleteMessage(chatId, (await loadText).message_id)
                        await bot.sendPhoto(chatId, resolve, { caption: 'Ini hasilnya! jangan lupa Subscribe Youtube IndraTech!' });
                        const outputPath = path.join(__dirname, 'public', 'images', `${chatId}-output.png`);
                        await fsPromises.writeFile(outputPath, resolve);
                        await bot.sendDocument(chatId, outputPath, {caption: 'Ini yang wajib kamu unduh!'})
                        await fsPromises.unlink(outputPath);
                      })
                      .catch((err)=>{
                        console.error(err)
                      })
                      await fsPromises.unlink(filePath, (err) => {
                          if (err) console.error('Error deleting input file:', err);
                      });
                  } catch (err) {
                      console.error('Error on removing photo:', err);
                      bot.sendMessage(chatId, 'Sorry, there was an error processing your image.');
                  }
              });
          } catch (err) {
              console.error('Error on downloading file:', err);
              bot.sendMessage(chatId, 'Sorry, there was an error downloading your image.');
          }
      }
  });
    bot.on('message', (msg) => {
      if (add_gdrive.response === 'name_add_gdrive') {
        bot.sendMessage(msg.chat.id, `Apakah benar? nama gdrive adalah ${msg.text}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Betul', callback_data: `ya_gdrive_add_name_${msg.text}` }],
              [{ text: 'Ulangi', callback_data: 'gmail_add_gdrive' }]
            ]
          }
        });
        delete add_gdrive.response;
      }else if(add_gdrive.response === 'password_add_gdrive'){
        bot.sendMessage(msg.chat.id, `Apakah benar? password gdrivenya adalah ${msg.text}`,{
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Betul', callback_data: `ya_gdrive_add_password_${msg.text}` }],
              [{ text: 'Ulangi', callback_data: 'gmail_add_gdrive' }]
            ]
          }
        })
        delete add_gdrive.response
      }else if(add_gdrive.response === 'email_recovery_add_gdrive'){
        bot.sendMessage(msg.chat.id, `Apakah benar? Email Recovery gdrivenya adalah ${msg.text}`,{
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Betul', callback_data: `ya_gdrive_add_email_recovery_${msg.text}` }],
              [{ text: 'Ulangi', callback_data: 'gmail_add_gdrive' }]
            ]
          }
        })
        delete add_gdrive.response
      }else if(add_gdrive.response === 'sisa_size_add_gdrive'){
        bot.sendMessage(msg.chat.id, `Apakah benar? Sisa Size gdrivenya adalah ${msg.text}`,{
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Betul', callback_data: `ya_gdrive_add_sisa_size_${msg.text}` }],
              [{ text: 'Ulangi', callback_data: 'gmail_add_gdrive' }]
            ]
          }
        })
        delete add_gdrive.response
      }else if(add_public[msg.chat.id] && add_public[msg.chat.id].response === "ADZAN_TIMER"){
        
      }
    });

    bot.on('callback_query', (msg) => {
      switch (msg.data) {
        // for 'start'
        case 'stock':
          const stock1 = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Add Stock ➕', callback_data: 'add_stock' },
                  { text: 'Del Stock ➖', callback_data: 'del_stock' }
                ],[
                  { text: 'Update Stock', callback_data: 'update_stock'}
                ],[
                  { text: 'View Stock', callback_data: 'view_stock' }]
              ]
            }
          };
          bot.editMessageText("Ngestock? Siapp boskuu, ini dibawah ya", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            reply_markup: stock1.reply_markup
          });
          break;
        case 'gdrive':
          const gdrive1 = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Add Acc ➕', callback_data: 'add_acc_gdrive' },
                  { text: 'Del Acc ➖', callback_data: 'dell_acc_gdrive' }
                ],
                [{ text: 'Update', callback_data: 'update_acc_gdrive' }],
                [{ text: 'View', callback_data: 'view_acc_gdrive' }],
                [{ text: 'Share Gdrive', callback_data: 'share_folder_gdrive' }]
              ]
            }
          };
          bot.editMessageText("Gdrive? Siapp boskuu, ini dibawah ya", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            reply_markup: gdrive1.reply_markup
          });
          break;
        case 'sale':
          const sale1 = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Add Sale', callback_data: 'add_sale' },
                  { text: 'Update Sale', callback_data: 'update_sale' }
                ],
                [{ text: 'Create Nota', callback_data: 'create_nota' }]
              ]
            }
          };
          bot.editMessageText("Siapp boskuu, ini dibawah ya", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            reply_markup: sale1.reply_markup
          });
          break;
        case 'artificial':
          const ai1 = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'AI Price', callback_data: 'ai_price' },
                  { text: 'AI Produk', callback_data: 'ai_produk' }
                ]
              ]
            }
          };
          bot.editMessageText("Wokeh bosku, gunakan AI Sebijak mungkin ya!", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            reply_markup: ai1.reply_markup
          });
          break;
        case 'loker':
          const loker1 = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Welcome Text', callback_data: 'welcome_text_loker' },
                  { text: 'Schedule Group', callback_data: 'schedule_group_loker' }
                ],
                [{ text: 'Validation', callback_data: 'validation_loker' }]
              ]
            }
          };
          bot.editMessageText("Siapp bosquee!", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            reply_markup: loker1.reply_markup
          });
          break;
        case 'publik':
          public(msg.message.chat.id, bot, 'public', msg.message.message_id)
          break;
      }
      stock(msg);
    });

    // stock
    const stock = async (msg) => {
      if(msg.data.includes('ya_loker_add_text_')){
        add_stock = {text:msg.data.split("_")[4]}
        bot.editMessageText(`Siap, text ${msg.data.split("_")[4]} sudah masuk!`,{chat_id: msg.message.chat.id,message_id: msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"Back >",callback_data:"add_stock"}]]}})
      }
      if(msg.data.includes('ya_gdrive_add_name_')){
        add_gdrive.name = msg.data.split("_")[4]
        bot.editMessageText(`Siap, nama ${msg.data.split("_")[4]} sudah masuk!`,{chat_id: msg.message.chat.id,message_id: msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"Back >",callback_data:"add_acc_gdrive"}]]}})
      }else if(msg.data.includes('ya_gdrive_add_password_')){
        add_gdrive.password = msg.data.split("_")[4]
        bot.editMessageText(`Siap, password ${msg.data.split("_")[4]} sudah masuk!`,{chat_id: msg.message.chat.id,message_id: msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"Back >",callback_data:"add_acc_gdrive"}]]}})
      }else if(msg.data.includes('ya_gdrive_add_email_recovery_')){
        add_gdrive.email_recovery = msg.data.split("_")[5]
        bot.editMessageText(`Siap, email recovery ${msg.data.split("_")[4]} sudah masuk!`,{chat_id: msg.message.chat.id,message_id: msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"Back >",callback_data:"add_acc_gdrive"}]]}})
      }else if(msg.data.includes('ya_gdrive_add_sisa_size_')){
        if(!isNaN(msg.data.split("_")[5])){
          add_gdrive.sisa_size = parseFloat(msg.data.split("_")[5])
          bot.editMessageText(`Siap, email recovery ${msg.data.split("_")[5]} sudah masuk!`,{chat_id: msg.message.chat.id,message_id: msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"Back >",callback_data:"add_acc_gdrive"}]]}})
          delete add_gdrive
        }else{
          bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
          .then(()=>{
            bot.sendMessage(msg.message.chat.id, `Maaf, ini bukanlah angka\n\nSisa Size : ${add_gdrive.sisa_size ? add_gdrive.sisa_size : '❌'}\n\nMohon kirimkan teks Sisa Ruangan Gdrive yang akan ditambahkan kedalam Database`)
            add_gdrive.response = 'sisa_size_add_gdrive'
          })
          .catch((err)=>{
            console.error('Failed to gmail recovery message:', err)
          })
        }
      }
      if(msg.data.includes('jawaban_skd_')){
        let labels = ['A', 'B', 'C', 'D']
        const chatId = msg.message.chat.id
        if(add_public[chatId]&&add_public[chatId].response==="SOAL_SKD"){
          const getSoalSKD = JSON.parse(fs.readFileSync('./lib/soal_skd.json'))
          const elapsed = Date.now() - add_public[chatId].startTime;
          const timeLeft = 80 * 60 * 1000 - elapsed;
          const hours = Math.floor(timeLeft / (60 * 60 * 1000));
          const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
          if(msg.data.split("_")[2]=="twk"){
              if(msg.data.split("_")[4]!==undefined){
                let soalArray = add_public[chatId].TWK;
                const soalId = parseInt(msg.data.split("_")[3]);
                const jawabanId = parseInt(msg.data.split("_")[4]);
                const index = soalArray.findIndex(item => item.no === soalId);
                if (index !== -1) {
                    soalArray[index].jawaban_id = jawabanId;
                }
                add_public[chatId].TWK = soalArray;
              }
              let buttonJawabTWK = [], jawaban_pilihan = '';
              const lembarTWK = getSoalSKD[2].data.find(item => item.id === parseInt(msg.data.split("_")[3]));
              const urutanJawaban = add_public[chatId].TWK[parseInt(msg.data.split("_")[3])-1].random_jawaban;
              for (let i = 0; i < urutanJawaban.length; i++) {
                const id = urutanJawaban[i];
                const jawaban = lembarTWK.jawaban_pilihan.find(item => item.id === id);
                if (add_public[chatId].TWK[parseInt(msg.data.split("_")[3]) - 1].jawaban_id === id) {
                    buttonJawabTWK.push([{
                        text: `🔒 ${labels[i]} 🔒`,
                        callback_data: `jawaban_skd_twk_${parseInt(msg.data.split("_")[3])}_${id}`
                    }]);
                } else {
                    buttonJawabTWK.push([{
                        text: `${labels[i]}`,
                        callback_data: `jawaban_skd_twk_${parseInt(msg.data.split("_")[3])}_${id}`
                    }]);
                }
                jawaban_pilihan += `${labels[i]}. ${jawaban.text}\n`;
            }
            if(parseInt(msg.data.split("_")[3])>=add_public[chatId].TWK.length){
              buttonJawabTWK.push([{text: '<< Previous',callback_data: `jawaban_skd_twk_${parseInt(msg.data.split("_")[3])-1}`},{text: 'Next >>',callback_data:'jawaban_skd_tiu_1'}])
            }else if(parseInt(msg.data.split("_")[3])<=1){
              buttonJawabTWK.push([{text: 'Next >>',callback_data:`jawaban_skd_twk_${parseInt(msg.data.split("_")[3])+1}`}])
            }else{
                buttonJawabTWK.push([{text: '<< Previous',callback_data: `jawaban_skd_twk_${parseInt(msg.data.split("_")[3])-1}`},{text: 'Next >>',callback_data:`jawaban_skd_twk_${parseInt(msg.data.split("_")[3])+1}`}])
            }
            buttonJawabTWK.push([
                { text: 'Back', callback_data: 'skd_awal_twk' }
            ]);
            bot.editMessageText(
                `Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik (Waktu akan tetap berjalan)\nSoal TWK\n\n${msg.data.split("_")[3]}. ${lembarTWK.soal}\n${jawaban_pilihan}`,
                {
                    chat_id: chatId,
                    message_id: msg.message.message_id,
                    reply_markup: { inline_keyboard: buttonJawabTWK }
                }
            );
          }else if (msg.data.split("_")[2] == "tkp") {
            if (msg.data.split("_")[4] !== undefined) {
              let soalArray = add_public[chatId].TKP;
              const soalId = parseInt(msg.data.split("_")[3]);
              const jawabanId = parseInt(msg.data.split("_")[4]);
              const index = soalArray.findIndex(item => item.no === soalId);
              if (index !== -1) {
                soalArray[index].jawaban_id = jawabanId;
              }
              add_public[chatId].TKP = soalArray;
            }
            let buttonJawabTKP = [], jawaban_pilihan = '';
            const lembarTKP = getSoalSKD[1].data.find(item => item.id === parseInt(msg.data.split("_")[3]));
            const urutanJawaban = add_public[chatId].TKP[parseInt(msg.data.split("_")[3]) - 1].random_jawaban;
            for (let i = 0; i < urutanJawaban.length; i++) {
              const id = urutanJawaban[i];
              const jawaban = lembarTKP.jawaban_pilihan.find(item => item.id === id);
              if (add_public[chatId].TKP[parseInt(msg.data.split("_")[3]) - 1].jawaban_id === id) {
                buttonJawabTKP.push([{
                  text: `🔒 ${labels[i]} 🔒`,
                  callback_data: `jawaban_skd_tkp_${parseInt(msg.data.split("_")[3])}_${id}`
                }]);
              } else {
                buttonJawabTKP.push([{
                  text: `${labels[i]}`,
                  callback_data: `jawaban_skd_tkp_${parseInt(msg.data.split("_")[3])}_${id}`
                }]);
              }
              jawaban_pilihan += `${labels[i]}. ${jawaban.text}\n`;
            }
            if (parseInt(msg.data.split("_")[3]) >= add_public[chatId].TKP.length) {
              buttonJawabTKP.push([
                { text: '<< Previous', callback_data: `jawaban_skd_tkp_${parseInt(msg.data.split("_")[3]) - 1}` },
                { text: 'Next >>', callback_data: 'jawaban_skd_tiu_1' }
              ]);
            }else {
              buttonJawabTKP.push([
                { text: '<< Previous', callback_data: `jawaban_skd_tkp_${parseInt(msg.data.split("_")[3]) - 1}` },
                { text: 'Next >>', callback_data: `jawaban_skd_tkp_${parseInt(msg.data.split("_")[3]) + 1}` }
              ]);
            }
            buttonJawabTKP.push([
              { text: 'Back', callback_data: 'skd_awal_tkp' }
            ]);
            bot.editMessageText(
              `Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik (Waktu akan tetap berjalan)\nSoal TKP\n\n${msg.data.split("_")[3]}. ${lembarTKP.soal}\n${jawaban_pilihan}`,
              {
                chat_id: chatId,
                message_id: msg.message.message_id,
                reply_markup: { inline_keyboard: buttonJawabTKP }
              }
            );
          }else if (msg.data.split("_")[2] == "tiu") {
            if (msg.data.split("_")[4] !== undefined) {
              let soalArray = add_public[chatId].TIU;
              const soalId = parseInt(msg.data.split("_")[3]);
              const jawabanId = parseInt(msg.data.split("_")[4]);
              const index = soalArray.findIndex(item => item.no === soalId);
              if (index !== -1) {
                soalArray[index].jawaban_id = jawabanId;
              }
              add_public[chatId].TIU = soalArray;
            }
            let buttonJawabTIU = [], jawaban_pilihan = '';
            const lembarTIU = getSoalSKD[0].data.find(item => item.id === parseInt(msg.data.split("_")[3]));
            const urutanJawaban = add_public[chatId].TIU[parseInt(msg.data.split("_")[3]) - 1].random_jawaban;
            for (let i = 0; i < urutanJawaban.length; i++) {
              const id = urutanJawaban[i];
              const jawaban = lembarTIU.jawaban_pilihan.find(item => item.id === id);
              if (add_public[chatId].TIU[parseInt(msg.data.split("_")[3]) - 1].jawaban_id === id) {
                buttonJawabTIU.push([{
                  text: `🔒 ${labels[i]} 🔒`,
                  callback_data: `jawaban_skd_tiu_${parseInt(msg.data.split("_")[3])}_${id}`
                }]);
              } else {
                buttonJawabTIU.push([{
                  text: `${labels[i]}`,
                  callback_data: `jawaban_skd_tiu_${parseInt(msg.data.split("_")[3])}_${id}`
                }]);
              }
              jawaban_pilihan += `${labels[i]}. ${jawaban.text}\n`;
            }
            if (parseInt(msg.data.split("_")[3]) >= add_public[chatId].TIU.length) {
              buttonJawabTIU.push([
                { text: '<< Previous', callback_data: `jawaban_skd_tiu_${parseInt(msg.data.split("_")[3]) - 1}` },
                { text: 'Next >>', callback_data: 'jawaban_skd_tkp_1' }
              ]);
            } else if (parseInt(msg.data.split("_")[3]) <= 1) {
              buttonJawabTIU.push([{ text: 'Next >>', callback_data: `jawaban_skd_tiu_${parseInt(msg.data.split("_")[3]) + 1}` }]);
            } else {
              buttonJawabTIU.push([
                { text: '<< Previous', callback_data: `jawaban_skd_tiu_${parseInt(msg.data.split("_")[3]) - 1}` },
                { text: 'Next >>', callback_data: `jawaban_skd_tiu_${parseInt(msg.data.split("_")[3]) + 1}` }
              ]);
            }
            buttonJawabTIU.push([
              { text: 'Back', callback_data: 'skd_awal_tiu' }
            ]);
            bot.editMessageText(
              `Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik (Waktu akan tetap berjalan)\nSoal TIU\n\n${msg.data.split("_")[3]}. ${lembarTIU.soal}\n${jawaban_pilihan}`,
              {
                chat_id: chatId,
                message_id: msg.message.message_id,
                reply_markup: { inline_keyboard: buttonJawabTIU }
              }
            );
          }                    
        }else{
          bot.editMessageText('Mohon maaf, anda belum berada di sesi ujian', {chat_id:chatId,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"Back",callback_data:'public'}]]}})
        }
      }
      const chatId = msg.message.chat.id;
      switch (msg.data) {
        // add stock
        case 'add_stock':
          let statusMessage = `Nama: ${add_stock.text ? add_stock.text : '❌'}\n`;
          if (add_stock.varian && add_stock.varian.length > 0) {
            add_stock.varian.forEach((varian, index) => {
              statusMessage += `\nVarian ${index + 1}: ${varian.name ? varian.name : '❌'}\n`;
              statusMessage += `  Stok: ${varian.stock ? varian.stock : '❌'}\n`;
              statusMessage += `  Harga: ${varian.harga ? `Rp${varian.harga}` : '❌'}\n`;
            });
          } else {
            statusMessage += `Varian: ❌\n`;
            statusMessage += `Harga: ${add_stock.harga ? `Rp${add_stock.harga}` : '❌'}\n`;
            statusMessage += `Stok: ${add_stock.stok ? add_stock.stok : '❌'}\n`;
          }
          const addStock = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: `Nama ${add_stock.text ? '✔️' : '❌'}`, callback_data: 'text_add_loker' }
                ],
                [
                  { text: `Varian ${add_stock.varian && add_stock.varian.length > 0 ? '✔️' : '❌'} (Opsional)`, callback_data: 'varian_add_loker' }
                ],
                [
                  { text: `Harga ${add_stock.harga || (add_stock.varian && add_stock.varian.some(varian => !varian.harga)) ? '✔️' : '❌'}`, callback_data: 'harga_add_loker' }
                ],
                [
                  { text: `Stok ${add_stock.stok || (add_stock.varian && add_stock.varian.some(varian => !varian.stock)) ? '✔️' : '❌'}`, callback_data: 'stok_add_loker' }
                ]
              ]
            }
          };
          bot.editMessageText(statusMessage, {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            reply_markup: addStock.reply_markup
          });
          break;
        case 'text_add_loker':
          bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
            .then(() => {
              bot.sendMessage(msg.message.chat.id, `Text : ${add_stock.text ? add_stock.text : '❌'}\n\nMohon kirimkan teks nama barang yang akan ditambahkan kedalam Database`);
              add_stock = { response: 'text_add_loker' };
            })
            .catch((err) => {
              console.error('Failed to delete message:', err);
            });
          break;
        case 'add_acc_gdrive':
          let driveStatusMessage = `Gmail: ${add_gdrive.name ? add_gdrive.name : '❌'}\n`;
          driveStatusMessage += `Password: ${add_gdrive.password ? add_gdrive.password : '❌'}\n`;
          driveStatusMessage += `Email Recovery: ${add_gdrive.email_recovery ? add_gdrive.email_recovery : '❌'}\n`;
          driveStatusMessage += `Sisa Size: ${add_gdrive.sisa_size ? add_gdrive.sisa_size : '❌'}\n`;
          const addGDrive = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: `Gmail ${add_gdrive.name ? '✔️' : '❌'}`, callback_data: 'gmail_add_gdrive' }
                ],
                [
                  { text: `Password ${add_gdrive.password ? '✔️' : '❌'}`, callback_data: 'password_add_gdrive' }
                ],
                [
                  { text: `Email Recovery ${add_gdrive.email_recovery ? '✔️' : '❌'}`, callback_data: 'email_recovery_add_gdrive' }
                ],
                [
                  { text: `Sisa Size ${add_gdrive.sisa_size ? '✔️' : '❌'}`, callback_data: 'sisa_size_add_gdrive' }
                ],[
                  { text: 'Accept', callback_data: 'accept_add_gdrive'}
                ],[
                  { text: 'Cancel', callback_data: 'cancel_add_gdrive'}
                ]
              ]
            }
          };
          bot.editMessageText(driveStatusMessage, {chat_id:msg.message.chat.id,message_id:msg.message.message_id,reply_markup:addGDrive.reply_markup});
          break;
        case 'gmail_add_gdrive':
          bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
            .then(() => {
              bot.sendMessage(msg.message.chat.id, `Gdrive Name : ${add_gdrive.name ? add_gdrive.name : '❌'}\n\nMohon kirimkan teks nama Gdrive yang akan ditambahkan kedalam Database`);
              add_gdrive.response = 'name_add_gdrive';
            })
            .catch((err) => {
              console.error('Failed to gmail name message:', err);
            });
          break;
        case 'password_add_gdrive':
          bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
          .then(()=>{
            bot.sendMessage(msg.message.chat.id, `Password : ${add_gdrive.password ? add_gdrive.password : '❌'}\n\nMohon kirimkan teks password Gdrive yang akan ditambahkan kedalam Database`)
            add_gdrive.response = 'password_add_gdrive'
          })
          .catch((err)=>{
            console.error('Failed to gmail pass message:', err)
          })
          break;
        case 'email_recovery_add_gdrive':
          bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
          .then(()=>{
            bot.sendMessage(msg.message.chat.id, `Email Recovery : ${add_gdrive.email_recovery ? add_gdrive.email_recovery : '❌'}\n\nMohon kirimkan teks Email Recovery Gdrive yang akan ditambahkan kedalam Database`)
            add_gdrive.response = 'email_recovery_add_gdrive'
          })
          .catch((err)=>{
            console.error('Failed to gmail recovery message:', err)
          })
          break;
        case 'sisa_size_add_gdrive':
          bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
          .then(()=>{
            bot.sendMessage(msg.message.chat.id, `Sisa Size : ${add_gdrive.sisa_size ? add_gdrive.sisa_size : '❌'}\n\nMohon kirimkan teks Sisa Ruangan Gdrive yang akan ditambahkan kedalam Database`)
            add_gdrive.response = 'sisa_size_add_gdrive'
          })
          .catch((err)=>{
            console.error('Failed to gmail recovery message:', err)
          })
          break;
        case 'accept_add_gdrive':
          if(add_gdrive.name&&add_gdrive.password&&add_gdrive.email_recovery&&add_gdrive.sisa_size){
            bot.editMessageText(`Cek terlebih dahulu data ini\n\nEmail: ${add_gdrive.name}\nPassword: ${add_gdrive.password}\nEmail Recovery: ${add_gdrive.email_recovery}\nSisa Ruangan: ${add_gdrive.sisa_size}\n\nApa benar?`,{chat_id:msg.message.chat.id,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:'Oke',callback_data:'oke_accept_add_gdrive'}],[{text:'Batal',callback_data:'add_acc_gdrive'}]]}})
          }else{
            bot.editMessageText('Maaf, salah satu data ada yang belum lengkap mohon lengkapi terlebih dahulu!',{chat_id:msg.message.chat.id,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:'oke',callback_data:'add_acc_gdrive'}]]}})
          }
          break;
        case 'oke_accept_add_gdrive':
          sendAccGdrive(iclik(add_gdrive.name),iclik(add_gdrive.password),iclik(add_gdrive.email_recovery),add_gdrive.sisa_size)
          bot.editMessageText('Data sudah masuk kedalam database!',{chat_id:msg.message.chat.id,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:'Done',callback_data:'gdrive'}]]}})
          break;
        case 'share_folder_gdrive':
          const lost = await listStoreFolders()
          break;
        case 'view_acc_gdrive':
          function escapeHtml(text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
          }
          function markAsSpoiler(text) {
            return `<span class="tg-spoiler">${escapeHtml(text)}</span>`;
          }
          await getDataGdrive()
            .then((results) => {
                let textViewGdrive = "Berikut data data:\n\n";
                for (let array of results) {
                    textViewGdrive += `${escapeHtml(array.id.toString())}.\nEmail: <code>${escapeHtml(ngiclik(array.name))}</code>\nEmail Recovery: ${escapeHtml(ngiclik(array.email_recovery))}\nPassword: ${markAsSpoiler(ngiclik(array.password))}\nSpace: ${escapeHtml(array.remaining_space.toString())}Gb\n\n`;
                }
                bot.editMessageText(textViewGdrive, {
                    chat_id: msg.message.chat.id,
                    message_id: msg.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Back', callback_data: 'gdrive' }]
                        ]
                    }
                });
            })
            .catch((err) => {
                console.error("Error view gdrive: ", err);
            });
            break;
        case 'remove_background':
          bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
          .then(()=>{
            bot.sendMessage(msg.message.chat.id, 'Mohon kirimkan foto untuk hapus background')
            add_public[msg.message.chat.id] = {response: "REMOVE_BACKGROUND"}
          })
          .catch((err)=>{
            console.error('Error removing background : ', err)
          })
          break;
        case 'adzan_timer':
          bot.editMessageText('Mohon kirimkan nama kotamu atau kirim lokasimu sekarang!',{chat_id:msg.message.chat.id,message_id:msg.message.message_id,reply_markup:null})
          .then((resolve)=>{
            add_public[msg.message.chat.id] = { response : 'ADZAN_TIMER', message_id : resolve.message_id}
          })
          .catch((err)=>{
            console.error('Adzan timer error get bot: ', err)
          })
          break;
        case 'soal_skd':
          bot.editMessageText('Kamu akan diberikan 110 soal dalam waktu 1 Jam\n\nApa kamu sudah siap?\n(Perlu diingat bahwa seluruh Soal SKD ini dibuat oleh AI)', {chat_id: msg.message.chat.id, message_id: msg.message.message_id, reply_markup:{inline_keyboard:[[{text:'Siap',callback_data:'skd_awal_twk'},{text:'Batal',callback_data:'public'}]]}})
          break
        case 'skd_awal_twk':
          if(add_public[chatId]&&add_public[chatId].response=='SOAL_SKD'){
            let buttonTWK = [];
            for (let g = 0; g < add_public[chatId].TWK.length; g++) {
                const buttonText = add_public[chatId].TWK[g].jawaban_id === undefined
                    ? `${add_public[chatId].TWK[g].no}.❌`
                    : `${add_public[chatId].TWK[g].no}.✅`;
                const callbackData = `jawaban_skd_twk_${add_public[chatId].TWK[g].no}`;

                // Tambahkan tombol ke baris
                if (g % maxPerRow === 0) {
                    // Jika sudah mencapai batas maksimum per baris, tambahkan baris baru
                    buttonTWK.push([]);
                }

                // Tambahkan tombol ke baris terakhir
                buttonTWK[buttonTWK.length - 1].push({
                    text: buttonText,
                    callback_data: callbackData
                });
            }
            buttonTWK.push([
                { text: '<< TKP', callback_data: 'skd_awal_tkp' },
                { text: 'TIU >>', callback_data: 'skd_awal_tiu' }
            ],[
                { text: 'Finish 🏁', callback_data: 'skd_finish'} 
            ],[
                { text: 'Batal', callback_data: 'batal_soal_skd'}
            ]);
            const elapsed = Date.now() - add_public[chatId].startTime;
            const timeLeft = 80 * 60 * 1000 - elapsed;
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            bot.editMessageText(`Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik (Waktu akan tetap berjalan)\n\n`+'Total soal TWK adalah 30 soal, kamu dapat mengerjakan soal selain soal TKP\n\nPetunjuk :\n❌ = Belum menjawab\n✅ = Sudah menjawab\n\nMohon kerjakan dengan cermat\n',{chat_id:chatId,message_id:msg.message.message_id,reply_markup:{inline_keyboard:buttonTWK}})
          }else{
            startTimer(chatId);
            const getSoalSkd = JSON.parse(fs.readFileSync('./lib/soal_skd.json'));
            const soalTIU = getSoalSkd.find(item => item.type === 'TIU').data;
            const soalTWK = getSoalSkd.find(item => item.type === 'TWK').data;
            const soalTKP = getSoalSkd.find(item => item.type === 'TKP').data;

            // Mengacak soal TIU
            for (let i = soalTIU.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [soalTIU[i], soalTIU[j]] = [soalTIU[j], soalTIU[i]];
            }
            const shuffledSoalTIU = soalTIU.slice(0, 35);

            // Mengacak soal TWK
            for (let i = soalTWK.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [soalTWK[i], soalTWK[j]] = [soalTWK[j], soalTWK[i]];
            }
            const shuffledSoalTWK = soalTWK.slice(0, 30);

            // Mengacak soal TKP
            for (let i = soalTKP.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [soalTKP[i], soalTKP[j]] = [soalTKP[j], soalTKP[i]];
            }
            const shuffledSoalTKP = soalTKP.slice(0, 45);

            // Menambahkan random_jawaban langsung
            for (const soal of shuffledSoalTIU) {
                const jawabanPilihan = soal.jawaban_pilihan.map(jawaban => jawaban.id);
                // Mengacak jawaban_pilihan
                for (let i = jawabanPilihan.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [jawabanPilihan[i], jawabanPilihan[j]] = [jawabanPilihan[j], jawabanPilihan[i]];
                }
                soal.random_jawaban = jawabanPilihan;
            }

            for (const soal of shuffledSoalTWK) {
                const jawabanPilihan = soal.jawaban_pilihan.map(jawaban => jawaban.id);
                // Mengacak jawaban_pilihan
                for (let i = jawabanPilihan.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [jawabanPilihan[i], jawabanPilihan[j]] = [jawabanPilihan[j], jawabanPilihan[i]];
                }
                soal.random_jawaban = jawabanPilihan;
            }

            for (const soal of shuffledSoalTKP) {
                const jawabanPilihan = soal.jawaban_pilihan.map(jawaban => jawaban.id);
                // Mengacak jawaban_pilihan
                for (let i = jawabanPilihan.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [jawabanPilihan[i], jawabanPilihan[j]] = [jawabanPilihan[j], jawabanPilihan[i]];
                }
                soal.random_jawaban = jawabanPilihan;
            }

            // Menyimpan atau menggunakan data yang sudah diacak
            storeSoalData(chatId, shuffledSoalTIU, shuffledSoalTWK, shuffledSoalTKP);

            // Menghasilkan tombol berdasarkan data yang telah diacak
            let buttonTWK = [];
            for (let g = 0; g < add_public[chatId].TWK.length; g++) {
                const buttonText = add_public[chatId].TWK[g].jawaban_id === undefined
                    ? `${add_public[chatId].TWK[g].no}.❌`
                    : `${add_public[chatId].TWK[g].no}.✅`;
                const callbackData = `jawaban_skd_twk_${add_public[chatId].TWK[g].no}`;

                // Tambahkan tombol ke baris
                if (g % maxPerRow === 0) {
                    buttonTWK.push([]);
                }

                // Tambahkan tombol ke baris terakhir
                buttonTWK[buttonTWK.length - 1].push({
                    text: buttonText,
                    callback_data: callbackData
                });
            }

            buttonTWK.push([
                { text: '<< TKP', callback_data: 'skd_awal_tkp' },
                { text: 'TIU >>', callback_data: 'skd_awal_tiu' }
            ],[
                { text: 'Finish 🏁', callback_data: 'skd_finish'} 
            ],[
                { text: 'Cancel Ujian', callback_data: 'batal_soal_skd'}
            ]);

            const elapsed = Date.now() - add_public[chatId].startTime;
            const timeLeft = 80 * 60 * 1000 - elapsed;
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            bot.editMessageText(`Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik (Waktu akan tetap berjalan)\n\n`+'Total soal TWK adalah 30 soal, kamu dapat mengerjakan soal selain soal TKP\n\nPetunjuk :\n❌ = Belum menjawab\n✅ = Sudah menjawab\n\nMohon kerjakan dengan cermat\n',{chat_id:chatId,message_id:msg.message.message_id,reply_markup:{inline_keyboard:buttonTWK}});
          }
          break;
        case 'skd_awal_tiu':
          if(add_public[chatId]&&add_public[chatId].response=='SOAL_SKD'){
            let buttonTIU = [];
            for (let g = 0; g < add_public[chatId].TIU.length; g++) {
                const buttonText = add_public[chatId].TIU[g].jawaban_id === undefined
                    ? `${add_public[chatId].TIU[g].no}.❌`
                    : `${add_public[chatId].TIU[g].no}.✅`;
                const callbackData = `jawaban_skd_tiu_${add_public[chatId].TIU[g].no}`;

                // Tambahkan tombol ke baris
                if (g % maxPerRow === 0) {
                    // Jika sudah mencapai batas maksimum per baris, tambahkan baris baru
                    buttonTIU.push([]);
                }

                // Tambahkan tombol ke baris terakhir
                buttonTIU[buttonTIU.length - 1].push({
                    text: buttonText,
                    callback_data: callbackData
                });
            }
            buttonTIU.push([
                { text: '<< TWK', callback_data: 'skd_awal_twk' },
                { text: 'TKP >>', callback_data: 'skd_awal_tkp' }
            ],[
              { text: 'Finish 🏁', callback_data: 'skd_finish'} 
            ],[
                { text: 'Cancel Ujian', callback_data: 'batal_soal_skd'}
            ]);
            const elapsed = Date.now() - add_public[chatId].startTime;
            const timeLeft = 80 * 60 * 1000 - elapsed;
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            bot.editMessageText(`Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik (Waktu akan tetap berjalan)\n\n`+'Total soal TIU adalah 35 soal, kamu dapat mengerjakan soal selain soal TIU\n\nPetunjuk :\n❌ = Belum menjawab\n✅ = Sudah menjawab\n\nMohon kerjakan dengan cermat\n',{chat_id:chatId,message_id:msg.message.message_id,reply_markup:{inline_keyboard:buttonTIU}})
          }else{
            bot.editMessageText('Maaf, kamu belum masuk ke soal', {chat_id:chatId, message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:'Kembali',callback_data:'public'}]]}})
          }
          break;
        case 'skd_awal_tkp':
          if(add_public[chatId]&&add_public[chatId].response=='SOAL_SKD'){
            let buttonTKP = [];
            for (let g = 0; g < add_public[chatId].TKP.length; g++) {
                const buttonText = add_public[chatId].TKP[g].jawaban_id === undefined
                    ? `${add_public[chatId].TKP[g].no}.❌`
                    : `${add_public[chatId].TKP[g].no}.✅`;
                const callbackData = `jawaban_skd_tkp_${add_public[chatId].TKP[g].no}`;

                // Tambahkan tombol ke baris
                if (g % maxPerRow === 0) {
                    // Jika sudah mencapai batas maksimum per baris, tambahkan baris baru
                    buttonTKP.push([]);
                }

                // Tambahkan tombol ke baris terakhir
                buttonTKP[buttonTKP.length - 1].push({
                    text: buttonText,
                    callback_data: callbackData
                });
            }
            buttonTKP.push([
                { text: '<< TIU', callback_data: 'skd_awal_tiu' },
                { text: 'TWK >>', callback_data: 'skd_awal_tWK' }
            ],[
              { text: 'Finish 🏁', callback_data: 'skd_finish'} 
            ],[
                { text: 'Cancel Ujian', callback_data: 'batal_soal_skd'}
            ]);
            const elapsed = Date.now() - add_public[chatId].startTime;
            const timeLeft = 80 * 60 * 1000 - elapsed;
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            bot.editMessageText(`Waktu tersisa: ${hours} Jam ${minutes} Menit ${seconds} Detik (Waktu akan tetap berjalan)\n\n`+'Total soal TKP adalah 45 soal, kamu dapat mengerjakan soal selain soal TKP\n\nPetunjuk :\n❌ = Belum menjawab\n✅ = Sudah menjawab\n\nMohon kerjakan dengan cermat\n',{chat_id:chatId,message_id:msg.message.message_id,reply_markup:{inline_keyboard:buttonTKP}})
          }else{
            bot.editMessageText('Maaf, kamu belum masuk ke soal', {chat_id:chatId, message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:'Kembali',callback_data:'public'}]]}})
          }
          break;
          case 'skd_finish':
            if (add_public[chatId] && add_public[chatId].response === "SOAL_SKD") {
                const dataTIU = add_public[chatId].TIU || [];
                const dataTWK = add_public[chatId].TWK || [];
                const dataTKP = add_public[chatId].TKP || [];
                const hasUndefinedJawaban = (data) => {
                    return data.some(soal => soal.jawaban_id === undefined);
                };
                const hasUndefinedTIU = hasUndefinedJawaban(dataTIU);
                const hasUndefinedTWK = hasUndefinedJawaban(dataTWK);
                const hasUndefinedTKP = hasUndefinedJawaban(dataTKP);
                if (hasUndefinedTIU || hasUndefinedTWK || hasUndefinedTKP) {
                    bot.editMessageText(
                        'Mohon maaf, ada jawaban yang belum diisi. Silakan lengkapi jawaban Anda.',
                        {
                            chat_id: chatId,
                            message_id: msg.message.message_id,
                            reply_markup: { inline_keyboard: [[{ text: 'Kembali', callback_data: 'skd_awal_twk' }]] }
                        }
                    );
                } else {
                    bot.editMessageText(
                      'Apa kamu yakin dengan jawaban kamu?',
                      {
                        chat_id: chatId,
                        message_id: msg.message.message_id,
                        reply_markup: {
                          inline_keyboard: [
                            [
                              { text: 'Yakin!', callback_data: 'yakin_finish_skd'}
                            ],[
                              { text: "Aku cek dulu deh", callback_data: 'skd_awal_twk'}
                            ]
                          ]
                        }
                      }
                    )
                }
            } else {
                bot.editMessageText(
                    'Mohon maaf, anda belum berada di sesi ujian',
                    {
                        chat_id: chatId,
                        message_id: msg.message.message_id,
                        reply_markup: { inline_keyboard: [[{ text: 'Kembali', callback_data: 'public' }]] }
                    }
                );
            }
            break;
            case 'yakin_finish_skd':
              if (add_public[chatId] && add_public[chatId].response === "SOAL_SKD") {
                  try {
                      // Baca dan parse data soal dari file JSON
                      const soalSkdData = JSON.parse(fs.readFileSync('./lib/soal_skd.json'));
                      
                      // Ambil soal untuk TIU, TWK, dan TKP
                      const soalTIU = soalSkdData.find(item => item.type === 'TIU').data;
                      const soalTWK = soalSkdData.find(item => item.type === 'TWK').data;
                      const soalTKP = soalSkdData.find(item => item.type === 'TKP').data;
          
                      // Fungsi untuk menghitung skor berdasarkan jawaban peserta
                      const hitungSkor = (dataSoal, jawabanPeserta) => {
                          let skor = 0;
                          for (const soal of dataSoal) {
                              const jawabanPesertaItem = jawabanPeserta.find(j => j.soal_id === soal.id);
                              if (jawabanPesertaItem && jawabanPesertaItem.jawaban_id !== undefined) {
                                  const jawabanBenar = soal.jawaban_pilihan.find(j => j.is_correct).id;
                                  if (jawabanPesertaItem.jawaban_id === jawabanBenar) {
                                      skor++;
                                  }
                              }
                          }
                          return skor;
                      };
          
                      // Hitung skor untuk TIU, TWK, dan TKP
                      const skorTIU = hitungSkor(soalTIU, add_public[chatId].TIU);
                      const skorTWK = hitungSkor(soalTWK, add_public[chatId].TWK);
                      const skorTKP = hitungSkor(soalTKP, add_public[chatId].TKP);
          
                      // Define passing grades (sesuaikan dengan nilai passing grade yang sebenarnya)
                      const passingGradeTIU = 20; // Contoh passing grade untuk TIU
                      const passingGradeTWK = 25; // Contoh passing grade untuk TWK
                      const passingGradeTKP = 30; // Contoh passing grade untuk TKP
          
                      // Cek apakah peserta lulus atau tidak
                      const lulusTIU = skorTIU >= passingGradeTIU;
                      const lulusTWK = skorTWK >= passingGradeTWK;
                      const lulusTKP = skorTKP >= passingGradeTKP;
          
                      // Menyusun pesan hasil ujian
                      let hasilPesan = `Hasil Ujian:\n`;
                      hasilPesan += `TIU: ${skorTIU}/${soalTIU.length} (${lulusTIU ? 'Lulus' : 'Tidak Lulus'})\n`;
                      hasilPesan += `TWK: ${skorTWK}/${soalTWK.length} (${lulusTWK ? 'Lulus' : 'Tidak Lulus'})\n`;
                      hasilPesan += `TKP: ${skorTKP}/${soalTKP.length} (${lulusTKP ? 'Lulus' : 'Tidak Lulus'})\n`;
          
                      // Tampilkan hasil ujian di konsol
                      console.log(hasilPesan);
          
                  } catch (error) {
                      console.error('Error membaca file atau menghitung skor:', error);
                      console.log('Terjadi kesalahan saat memproses ujian. Silakan coba lagi nanti.');
                  }
              } else {
                  console.log('Mohon maaf, anda belum berada di sesi ujian');
              }
              break;      
        }   
      };
    bot.on('polling_error', (error) => {
      console.error('Polling error:', error.code, error.response);
    });
  } catch (err) {
    console.log(err);
  }
};
function public(idUser, bot, options, message) {
  const start2 = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Remove Background', callback_data: 'remove_background'},
          { text: 'Adzan Timer', callback_data: 'adzan_timer'}
        ],[
          { text: 'Test Soal SKD',callback_data: 'soal_skd'}
        ]
      ]
    }
  }
  if(options === 'user'){
    bot.sendMessage(idUser, `${getGreeting()}, ${idUser} bagaimana aku akan membantumu?`, start2);
  }else if(options === 'public'){
    bot.editMessageText(`${getGreeting()}, ${idUser} bagaimana aku akan membantumu?`,{chat_id:idUser,message_id:message,reply_markup:start2.reply_markup})
  }
}
function storeSoalData(chatId, soalTIU, soalTWK, soalTKP) {
  add_public[chatId] = add_public[chatId] || {}; // Pastikan chatId ada di add_public

  add_public[chatId].TIU = soalTIU.map((soal, index) => ({
      no: index + 1,
      soal_id: soal.id,
      jawaban_id: undefined, // Nilai jawaban_id awalnya undefined
      random_jawaban: soal.random_jawaban // Menyertakan random_jawaban
  }));

  add_public[chatId].TWK = soalTWK.map((soal, index) => ({
      no: index + 1,
      soal_id: soal.id,
      jawaban_id: undefined, // Nilai jawaban_id awalnya undefined
      random_jawaban: soal.random_jawaban // Menyertakan random_jawaban
  }));

  add_public[chatId].TKP = soalTKP.map((soal, index) => ({
      no: index + 1,
      soal_id: soal.id,
      jawaban_id: undefined, // Nilai jawaban_id awalnya undefined
      random_jawaban: soal.random_jawaban // Menyertakan random_jawaban
  }));
}
function startTimer(chatId) {
  if (add_public[chatId] && add_public[chatId].timer) {
      console.log('Timer sudah berjalan.');
      return; // Jika sudah ada timer, keluar dari fungsi
  }

  const startTime = Date.now();
  add_public[chatId] = add_public[chatId] || {}; // Pastikan chatId ada di add_public
  add_public[chatId].response = 'SOAL_SKD';
  add_public[chatId].startTime = startTime;
  add_public[chatId].timer = setInterval(() => {
      const elapsed = Date.now() - add_public[chatId].startTime;
      const timeLeft = 80 * 60 * 1000 - elapsed; // 1 jam 20 menit
      if (timeLeft <= 0) {
          clearInterval(add_public[chatId].timer);
          delete add_public[chatId];
          bot.sendMessage(chatId, 'Waktu habis! Anda gagal menyelesaikan soal.');
      }
  }, 1000); // Update setiap detik
}
function getGreeting() {
  const hours = new Date().getHours();
  if (hours < 12) {
      return 'Selamat pagi';
  } else if (hours < 18) {
      return 'Selamat siang';
  } else {
      return 'Selamat sore';
  }
}
getTokenAndOwner((err, data) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  const { token, idPemilik } = data;
  putrod(token, idPemilik);
});