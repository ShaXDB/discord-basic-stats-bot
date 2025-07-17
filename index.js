require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Events, REST, Routes } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./database/database');
const moment = require('moment');
moment.locale('tr');
const { showTopUsers } = require('./commands/top');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.commands = new Collection();
client.slashCommands = new Collection();

client.applicationStatus = new Map();
client.applicationData = new Map();
client.applicationPages = new Map();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if (command.data && command.execute) {
    client.slashCommands.set(command.data.name, command);
  }
  
  if (command.name && command.run) {
    client.commands.set(command.name, command);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
async function deployCommands() {
  const commands = [];
  const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Slash komutları yükleniyor...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log('Slash komutları başarıyla yüklendi!');
  } catch (error) {
    console.error('Slash komutları yüklenirken hata oluştu:', error);
  }
}

async function startBot() {
  try {
    await initializeDatabase();
    await deployCommands();
    await client.login(process.env.TOKEN);
  } catch (error) {
    console.error('Bot başlatılırken hata oluştu:', error);
  }
}

client.once('ready', async () => {
  console.log(`${client.user.tag} olarak giriş yapıldı!`);
  
  const targetChannelId = process.env.TARGET_VOICE_CHANNEL_ID;
  const targetVoiceChannel = process.env.TARGET_VOICE_CHANNEL_ID;
  const guild = client.guilds.cache.first();
  
  if (guild) {
    try {
      const connection = joinVoiceChannel({
        channelId: targetVoiceChannel,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });
      console.log(`${targetVoiceChannel} ID'li ses kanalına başarıyla katıldım!`);
    } catch (error) {
      console.error('Ses kanalına katılırken hata oluştu:', error);
    }
  }
  
  const { updateActiveVoiceUsers } = require('./utils/voiceTracker');
  setInterval(async () => {
    try {
      await updateActiveVoiceUsers();
    } catch (error) {
      console.error('Periyodik ses istatistikleri güncellenirken hata oluştu:', error);
    }
  }, 5 * 60 * 1000);
  
  const { checkExpiredTasks, deleteExpiredTasks } = require('./database/database');
  const { EmbedBuilder } = require('discord.js');
  
  async function checkAndDeleteExpiredTasks() {
    try {
      const expiredTasks = await checkExpiredTasks();
      
      if (expiredTasks.length > 0) {
        const logChannel = client.channels.cache.get(process.env.TASK_LOG_CHANNEL_ID);
        
        if (logChannel) {
          for (const task of expiredTasks) {
            const taskType = task.task_type === 'message' ? 'Mesaj' : task.task_type === 'voice' ? 'Ses' : 'Partner';
            
            const embed = new EmbedBuilder()
              .setColor('#FF5555')
              .setTitle('Görev Süresi Doldu')
              .setDescription(`**${task.description}** görevinin süresi doldu.`)
              .addFields(
                { name: 'Görev Türü', value: taskType, inline: true },
                { name: 'Hedef', value: `${task.target_amount}`, inline: true },
                { name: 'Bitiş Tarihi', value: moment(task.expires_at).format('DD MMMM YYYY, HH:mm'), inline: true }
              )
              .setTimestamp();
            
            if (task.users.length > 0) {
              const completedUsers = [];
              const incompleteUsers = [];
              
              for (const user of task.users) {
                try {
                  const discordUser = await client.users.fetch(user.user_id);
                  const userMention = discordUser ? `<@${user.user_id}>` : user.user_id;
                  
                  if (user.completed) {
                    completedUsers.push(`${userMention} (${user.progress}/${task.target_amount})`);
                  } else {
                    incompleteUsers.push(`${userMention} (${user.progress}/${task.target_amount})`);
                  }
                } catch (error) {
                  console.error(`Kullanıcı bilgisi alınırken hata: ${user.user_id}`, error);

                  if (user.completed) {
                    completedUsers.push(`ID: ${user.user_id} (${user.progress}/${task.target_amount})`);
                  } else {
                    incompleteUsers.push(`ID: ${user.user_id} (${user.progress}/${task.target_amount})`);
                  }
                }
              }
              
              if (completedUsers.length > 0) {
                embed.addFields({ name: '✅ Tamamlayanlar', value: completedUsers.join('\n') });
              }
              
              if (incompleteUsers.length > 0) {
                embed.addFields({ name: '❌ Tamamlamayanlar', value: incompleteUsers.join('\n') });
              }
            } else {
              embed.addFields({ name: 'Katılımcılar', value: 'Bu göreve hiç katılımcı olmadı.' });
            }
            
            await logChannel.send({ embeds: [embed] });
          }
        }
        
        await deleteExpiredTasks();
      }
    } catch (error) {
      console.error('Süresi dolan görevler kontrol edilirken hata oluştu:', error);
    }
  }
  
  checkAndDeleteExpiredTasks();
  
  setInterval(checkAndDeleteExpiredTasks, 60 * 60 * 1000);
});


client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  
  const prefix = process.env.PREFIX || '.';
  
  if (!message.content.startsWith(prefix)) {
    return;
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) {
    return;
  }

  try {
    await command.run(client, message, args);
  } catch (error) {
    console.error('Komut çalıştırılırken hata:', error);
    if (message.reply) {
      message.reply('Komut çalıştırılırken bir hata oluştu!');
    }
  }
});


client.buttonInteractions = new Collection();
client.selectMenuInteractions = new Collection();

startBot();
