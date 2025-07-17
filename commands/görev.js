const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createTask, listTasks, deleteTask, getUserTasks } = require('../database/database');
const moment = require('moment');
moment.locale('tr');

function getAuthorizedRoles() {
  return [
    process.env.AUTHORIZED_ROLE_1,
    process.env.AUTHORIZED_ROLE_2,
    process.env.AUTHORIZED_ROLE_3,
    process.env.AUTHORIZED_ROLE_4,
    process.env.AUTHORIZED_ROLE_5,
    process.env.AUTHORIZED_ROLE_6,
    process.env.AUTHORIZED_ROLE_7,
    process.env.AUTHORIZED_ROLE_8,
    process.env.AUTHORIZED_ROLE_9,
    process.env.AUTHORIZED_ROLE_10
  ].filter(Boolean);
}

module.exports = {
  name: 'görev',
  description: 'Görev yönetim sistemi',
  data: new SlashCommandBuilder()
    .setName('görev')
    .setDescription('Görev sistemi')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ekle')
        .setDescription('Yeni bir görev ekler')
        .addStringOption(option =>
          option.setName('tür')
            .setDescription('Görev türü')
            .setRequired(true)
            .addChoices(
              { name: 'Mesaj', value: 'message' },
              { name: 'Ses', value: 'voice' },
              { name: 'Partner', value: 'partner' }
            ))
        .addIntegerOption(option =>
          option.setName('hedef')
            .setDescription('Hedef miktar')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('açıklama')
            .setDescription('Görev açıklaması')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Görevi atayacağınız kullanıcı (boş bırakılırsa herkese atanır)')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('süre')
            .setDescription('Görev süresi (gün)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('listele')
        .setDescription('Tüm görevleri listeler'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('sil')
        .setDescription('Bir görevi siler')
        .addIntegerOption(option =>
          option.setName('görev_id')
            .setDescription('Silinecek görevin ID\'si')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('göster')
        .setDescription('Görevlerinizi gösterir'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('durum')
        .setDescription('Tüm yetkililerin görev durumunu gösterir (Sadece yöneticiler)')),
  
  async run(client, message, args) {
    if (!message.guild) {
      return message.reply('Bu komut sadece sunucularda kullanılabilir!');
    }
    
    if (!message.member) {
      return message.reply('Üye bilgileriniz alınamadı. Lütfen tekrar deneyin.');
    }
    
    if (!args[0]) {
      const hasAdminPermission = message.member.permissions.has(PermissionFlagsBits.Administrator);
      const hasSpecialRole = message.member.roles.cache.has(process.env.SPECIAL_ADMIN_ROLE_ID);
      
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Görev Sistemi')
        .setTimestamp();
      
      if (hasAdminPermission || hasSpecialRole) {
        embed.setDescription('Görev sistemi komutları (Yönetici):')
          .addFields(
            { name: '.görev ekle <tür> <hedef> <açıklama> [kullanıcı] [süre]', value: 'Yeni görev ekler \n\`Kullanıcı etiketlenmezse otomatik olarak tüm yetkililere görevi atar\`' },
            { name: '.görev listele', value: 'Tüm görevleri listeler' },
            { name: '.görev sil [görev_id]', value: 'Görevi siler' },
            { name: '.görev göster', value: 'Kendi görevlerinizi gösterir' },
            { name: '.görev durum', value: 'Tüm yetkililerin görev durumunu gösterir' },
            { name: '\u200B', value: '**Slash Komutları:**' },
            { name: '/görev ekle', value: 'Yeni görev ekler (Slash komut)' },
            { name: '/görev listele', value: 'Tüm görevleri listeler (Slash komut)' },
            { name: '/görev sil', value: 'Görevi siler (Slash komut)' },
            { name: '/görev göster', value: 'Kendi görevlerinizi gösterir (Slash komut)' },
            { name: '/görev durum', value: 'Tüm yetkililerin görev durumunu gösterir (Slash komut)' }
          );
      } else {
        embed.setDescription('Görev sistemi komutları:')
          .addFields(
            { name: '.görev göster', value: 'Kendi görevlerinizi gösterir' },
            { name: '\u200B', value: '**Slash Komutları:**' },
            { name: '/görev göster', value: 'Kendi görevlerinizi gösterir (Slash komut)' }
          );
      }
      
      return message.reply({ embeds: [embed] });
    }

    if (args[0] !== 'göster') {
      const hasAdminPermission = message.member && message.member.permissions.has(PermissionFlagsBits.Administrator);
      const hasSpecialRole = message.member && message.member.roles.cache.has(process.env.SPECIAL_ADMIN_ROLE_ID);
      
      if (!hasAdminPermission && !hasSpecialRole) {
        return message.reply('Bu komutu kullanmak için yönetici yetkisine veya özel role sahip olmalısınız!');
      }
    } else {
      const authorizedRoles = getAuthorizedRoles();
      
      const hasAuthorizedRole = message.member && message.member.roles.cache.some(role => authorizedRoles.includes(role.id));
      
      if ((!message.member || !message.member.permissions.has(PermissionFlagsBits.Administrator)) && !hasAuthorizedRole) {
        return message.reply('Bu komutu kullanmak için yetkili rolüne sahip olmalısınız!');
      }
    }

    const subCommand = args[0].toLowerCase();

    try {
      switch (subCommand) {
        case 'ekle':
          if (args.length < 4) {
            return message.reply('Kullanım: `.görev ekle <tür> <hedef> <açıklama> [kullanıcı] [süre]`\nTürler: `mesaj`, `ses`, `partner`');
          }
          
          const type = args[1].toLowerCase();
          const target = parseInt(args[2]);
          
          let userId = null;
          let duration = 7;
          let descriptionEndIndex = args.length;
          
          if (args[args.length - 1].match(/^\d+$/)) {
            duration = parseInt(args[args.length - 1]);
            descriptionEndIndex--;
          }
          
          const userMention = args[descriptionEndIndex - 1];
          if (userMention && userMention.match(/^<@!?(\d+)>$/)) {
            const mentionMatch = userMention.match(/^<@!?(\d+)>$/);
            userId = mentionMatch[1];
            descriptionEndIndex--;
          }
          
          const description = args.slice(3, descriptionEndIndex).join(' ');
          
          if (!['mesaj', 'ses', 'partner'].includes(type)) {
            return message.reply('Geçersiz görev türü! Kullanılabilir türler: `mesaj`, `ses`, `partner`');
          }
          
          if (isNaN(target) || target <= 0) {
            return message.reply('Hedef miktar pozitif bir sayı olmalıdır!');
          }
          
          const taskType = type === 'mesaj' ? 'message' : type === 'ses' ? 'voice' : 'partner';
          await addTask(message, taskType, target, description, duration, userId);
          break;
          
        case 'listele':
          await showTaskList(message);
          break;
          
        case 'sil':
          if (args.length < 2 || isNaN(parseInt(args[1]))) {
            return message.reply('Kullanım: `.görev sil <görev_id>`');
          }
          
          const taskId = parseInt(args[1]);
          await removeTask(message, taskId);
          break;
          
        case 'göster':
          await showUserTasks(message, message.author.id);
          break;
          
        case 'durum':
          await showAllTasksStatus(message);
          break;
          
        default:
          message.reply('Geçersiz alt komut! Kullanılabilir alt komutlar: `ekle`, `listele`, `sil`, `göster`, `durum`');
      }
    } catch (error) {
      console.error('Görev komutu çalıştırılırken hata oluştu:', error);
      message.reply('Komut çalıştırılırken bir hata oluştu!');
    }
  },
  
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir!', flags: 64 });
    }
    
    if (!interaction.member) {
      return interaction.reply({ content: 'Üye bilgileriniz alınamadı. Lütfen tekrar deneyin.', flags: 64 });
    }
    
    try {
      const subCommand = interaction.options.getSubcommand();
      
      if (subCommand !== 'göster') {
        const hasAdminPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const hasSpecialRole = interaction.member.roles.cache.has(process.env.SPECIAL_ADMIN_ROLE_ID);
        
        if (!hasAdminPermission && !hasSpecialRole) {
          return interaction.reply({ content: 'Bu komutu kullanmak için yönetici yetkisine veya özel role sahip olmalısınız!', flags: 64 });
        }
      } else {
        const authorizedRoles = [...getAuthorizedRoles(), process.env.SPECIAL_ADMIN_ROLE_ID].filter(Boolean);
        
        const hasAuthorizedRole = interaction.member.roles.cache.some(role => authorizedRoles.includes(role.id));
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAuthorizedRole) {
          return interaction.reply({ content: 'Bu komutu kullanmak için yetkili rolüne sahip olmalısınız!', flags: 64 });
        }
      }
      
      switch (subCommand) {
        case 'ekle':
          const type = interaction.options.getString('tür');
          const target = interaction.options.getInteger('hedef');
          
          if (target <= 0) {
            return interaction.reply({ content: 'Hedef miktar pozitif bir sayı olmalıdır!', flags: 64 });
          }
          
          const description = interaction.options.getString('açıklama');
          const duration = interaction.options.getInteger('süre') || 7;
          const user = interaction.options.getUser('kullanıcı');
          
          await addTask(interaction, type, target, description, duration, user ? user.id : null);
          break;
          
        case 'listele':
          await showTaskList(interaction);
          break;
          
        case 'sil':
          const taskId = interaction.options.getInteger('görev_id');
          await removeTask(interaction, taskId);
          break;
          
        case 'göster':
          await showUserTasks(interaction, interaction.user.id);
          break;
          
        case 'durum':
          await showAllTasksStatus(interaction);
          break;
      }
    } catch (error) {
      console.error('Görev komutu çalıştırılırken hata oluştu:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Komut çalıştırılırken bir hata oluştu!');
      } else {
        await interaction.reply({ content: 'Komut çalıştırılırken bir hata oluştu!', flags: 64 });
      }
    }
  }
};
async function addTask(source, type, target, description, duration, userId = null) {
  try {
    if (source.deferReply && !source.deferred && !source.replied) {
      try {
        await source.deferReply();
      } catch (deferError) {
        console.error('Defer hatası:', deferError);
        if (!source.replied) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Hata')
            .setDescription('Komut işlenirken bir hata oluştu.')
            .setTimestamp();
          await source.reply({ embeds: [errorEmbed], flags: 64 });
        }
        return;
      }
    }
    
    const authorizedRoles = [...getAuthorizedRoles(), process.env.SPECIAL_ADMIN_ROLE_ID].filter(Boolean);

    const isAuthorizedRolesOnly = userId === null;
    
    const taskId = await createTask(type, target, description, duration, userId, isAuthorizedRolesOnly ? authorizedRoles : null);
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('Görev Eklendi')
      .setDescription(`Yeni görev başarıyla eklendi!`)
      .addFields(
        { name: 'Görev ID', value: `${taskId}`, inline: true },
        { name: 'Tür', value: type === 'message' ? '**Mesaj**' : type === 'voice' ? '**Ses**' : '**Partner**', inline: true },
        { name: 'Hedef', value: `${target}`, inline: true },
        { name: 'Açıklama', value: description },
        { name: 'Bitiş Tarihi', value: moment().add(duration, 'days').format('DD MMMM YYYY, HH:mm') }
      )
      .setTimestamp();
    
    if (userId) {
      const user = await source.client.users.fetch(userId).catch(() => null);
      if (user) {
        embed.addFields({ name: 'Atanan Kullanıcı', value: `<@${userId}>` });
      }
    } else {
      embed.addFields({ name: 'Atanan Kullanıcı', value: isAuthorizedRolesOnly ? 'Sadece Yetkili Roller' : 'Herkes' });
    }
    
    if (source.deferred) {
      await source.editReply({ embeds: [embed] });
    } else if (source.reply) {
      await source.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('addTask fonksiyonunda hata:', error);
    if (source.deferred) {
      await source.editReply({ content: 'Görev eklenirken bir hata oluştu!' });
    } else if (source.reply && !source.replied) {
      await source.reply({ content: 'Görev eklenirken bir hata oluştu!', flags: 64 });
    }
  }
}

async function showTaskList(source) {
  try {
    if (source.deferReply && !source.deferred && !source.replied) {
      try {
        await source.deferReply();
      } catch (deferError) {
        console.error('Defer hatası:', deferError);
        if (!source.replied) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Hata')
            .setDescription('Komut işlenirken bir hata oluştu.')
            .setTimestamp();
          await source.reply({ embeds: [errorEmbed], flags: 64 });
        }
        return;
      }
    }
    
    const tasks = await listTasks();
    
    if (tasks.length === 0) {
      const noTaskEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('Görev Listesi')
        .setDescription('Aktif görev bulunmamaktadır.')
        .setTimestamp();
      
      if (source.deferred) {
        await source.editReply({ embeds: [noTaskEmbed] });
      } else if (source.reply) {
        await source.reply({ embeds: [noTaskEmbed] });
      }
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Görev Listesi')
      .setDescription(`Toplam ${tasks.length} aktif görev bulunmaktadır.`)
      .setTimestamp();
    
    tasks.forEach(task => {
      const taskType = task.task_type === 'message' ? '**Mesaj**' : task.task_type === 'voice' ? '**Ses**' : '**Partner**';
      embed.addFields({
        name: `ID: ${task.id} - ${taskType}`,
        value: `**Hedef:** ${task.target_amount}\n**Açıklama:** ${task.description}\n**Bitiş:** ${moment(task.expires_at).format('DD MMMM YYYY, HH:mm')}`
      });
    });
    
    if (source.deferred) {
      await source.editReply({ embeds: [embed] });
    } else if (source.reply) {
      await source.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('showTaskList fonksiyonunda hata:', error);
    if (source.deferred) {
      await source.editReply({ content: 'Görev listesi yüklenirken bir hata oluştu!' });
    } else if (source.reply && !source.replied) {
      await source.reply({ content: 'Görev listesi yüklenirken bir hata oluştu!', flags: 64 });
    }
  }
}

async function removeTask(source, taskId) {
  try {
    if (source.deferReply && !source.deferred && !source.replied) {
      try {
        await source.deferReply();
      } catch (deferError) {
        console.error('Defer hatası:', deferError);
        if (!source.replied) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Hata')
            .setDescription('Komut işlenirken bir hata oluştu.')
            .setTimestamp();
          await source.reply({ embeds: [errorEmbed], flags: 64 });
        }
        return;
      }
    }
    
    const result = await deleteTask(taskId);
    
    if (result > 0) {
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('Görev Silindi')
        .setDescription(`ID'si ${taskId} olan görev başarıyla silindi.`)
        .setTimestamp();
      
      if (source.deferred) {
        await source.editReply({ embeds: [embed] });
      } else if (source.reply) {
        await source.reply({ embeds: [embed] });
      }
    } else {
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('Hata')
        .setDescription(`ID'si ${taskId} olan görev bulunamadı.`)
        .setTimestamp();
      
      if (source.deferred) {
        await source.editReply({ embeds: [embed] });
      } else if (source.reply) {
        await source.reply({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error('removeTask fonksiyonunda hata:', error);
    if (source.deferred) {
      await source.editReply({ content: 'Görev silinirken bir hata oluştu!' });
    } else if (source.reply && !source.replied) {
      await source.reply({ content: 'Görev silinirken bir hata oluştu!', flags: 64 });
    }
  }
}


async function showUserTasks(source, userId) {
  try {

    if (source.deferReply && !source.deferred && !source.replied) {
      try {
        await source.deferReply();
      } catch (deferError) {
        console.error('Defer hatası:', deferError);

        if (!source.replied) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Hata')
            .setDescription('Komut işlenirken bir hata oluştu.')
            .setTimestamp();
          await source.reply({ embeds: [errorEmbed], flags: 64 });
        }
        return;
      }
    }
    

    let userRoles = [];
    if (source.member) {
      userRoles = source.member.roles.cache.map(role => role.id);
    }
    
    const tasks = await getUserTasks(userId, userRoles);
    
    if (tasks.length === 0) {
      const noTaskEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('Görevleriniz')
        .setDescription('Aktif göreviniz bulunmamaktadır.')
        .setTimestamp();
      
      if (source.deferred) {
        await source.editReply({ embeds: [noTaskEmbed] });
      } else if (source.reply && !source.replied) {
        await source.reply({ embeds: [noTaskEmbed] });
      }
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Görevleriniz')
      .setDescription(`Toplam ${tasks.length} aktif göreviniz bulunmaktadır.`)
      .setTimestamp();
    
    tasks.forEach(task => {
      const taskType = task.task_type === 'message' ? '**Mesaj**' : task.task_type === 'voice' ? '**Ses**' : '**Partner**';
      const progress = task.progress || 0;
      const percentage = Math.min(100, Math.floor((progress / task.target_amount) * 100));
      const progressBar = createProgressBar(percentage);
      
      embed.addFields({
        name: `${taskType}: ${task.description}`,
        value: `${progressBar} ${percentage}% (${progress}/${task.target_amount})\n**Bitiş:** ${moment(task.expires_at).format('DD MMMM YYYY, HH:mm')}`
      });
    });
    
    if (source.deferred) {
      await source.editReply({ embeds: [embed] });
    } else if (source.reply && !source.replied) {
      await source.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('showUserTasks fonksiyonunda hata:', error);
    try {
      if (source.deferred) {
        await source.editReply({ content: 'Görevler yüklenirken bir hata oluştu!' });
      } else if (source.reply && !source.replied) {
        await source.reply({ content: 'Görevler yüklenirken bir hata oluştu!', flags: 64 });
      }
    } catch (replyError) {
      console.error('Hata mesajı gönderilirken hata:', replyError);
    }
  }
}


function createProgressBar(percentage) {
  const barLength = 10;
  const filledCount = Math.floor(percentage / 10);
  const emptyCount = barLength - filledCount;
  
  let progressBar = '';
  
  
  if (filledCount > 0) {
    progressBar += '<:dolubas:1368589939444416553>';
  } else {
    progressBar += '<:bosbas:1368589916874870874>';
  }
  

  for (let i = 1; i < barLength - 1; i++) {
    if (i < filledCount) {
      progressBar += '<:doluorta:1368589945102536714>';
    } else {
      progressBar += '<:bosorta:1368589928044171305>';
    }
  }
  

  if (filledCount >= barLength) {
    progressBar += '<:doluson:1368589951113105590>';
  } else {
    progressBar += '<:bosson:1368589934058930306>';
  }
  
  return progressBar;
}


async function showAllTasksStatus(source) {
  try {

    if (source.deferReply && !source.deferred && !source.replied) {
      try {
        await source.deferReply();
      } catch (deferError) {
        console.error('Defer hatası:', deferError);

        if (!source.replied) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Hata')
            .setDescription('Komut işlenirken bir hata oluştu.')
            .setTimestamp();
          await source.reply({ embeds: [errorEmbed], flags: 64 });
        }
        return;
      }
    }
    

    const authorizedRoles = [...getAuthorizedRoles(), process.env.SPECIAL_ADMIN_ROLE_ID].filter(Boolean);
    

    const guild = source.guild;
    

    await guild.members.fetch();
    await guild.roles.fetch();
    
    const authorizedMembers = [];
    
    console.log('Yetkili rol sayısı:', authorizedRoles.length);
    console.log('Guild toplam üye sayısı:', guild.memberCount);
    console.log('Cache\'deki üye sayısı:', guild.members.cache.size);
    

    const allMembers = guild.members.cache;
    console.log('Tüm üyeler kontrol ediliyor...');
    
    for (const roleId of authorizedRoles) {
      const role = guild.roles.cache.get(roleId);
      if (role) {
        console.log(`Rol ${role.name} (${roleId}): ${role.members.size} üye`);
        role.members.forEach(member => {
          console.log(`  - ${member.user.username} (${member.id})`);
          if (!authorizedMembers.find(m => m.id === member.id)) {
            authorizedMembers.push(member);
          }
        });
      } else {
        console.log(`Rol bulunamadı: ${roleId}`);
      }
    }
    

    console.log('\nAlternatif kontrol:');
    const alternativeAuthorized = [];
    allMembers.forEach(member => {
      const hasAuthorizedRole = member.roles.cache.some(role => authorizedRoles.includes(role.id));
      if (hasAuthorizedRole) {
        alternativeAuthorized.push(member);
        console.log(`Yetkili üye bulundu: ${member.user.username} (${member.id})`);
      }
    });
    console.log(`Alternatif yöntemle bulunan yetkili sayısı: ${alternativeAuthorized.length}`);
    
    console.log('Toplam yetkili üye sayısı:', authorizedMembers.length);
    
    if (authorizedMembers.length === 0) {
      const noMemberEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('Yetkili Görev Durumu')
        .setDescription('Yetkili üye bulunamadı.')
        .setTimestamp();
      
      if (source.deferred) {
        await source.editReply({ embeds: [noMemberEmbed] });
      } else if (source.reply && !source.replied) {
        await source.reply({ embeds: [noMemberEmbed] });
      }
      return;
    }
    

    const memberTasksData = [];
    
    for (const member of authorizedMembers) {
      const userRoles = member.roles.cache.map(role => role.id);
      const tasks = await getUserTasks(member.id, userRoles);
      
     
      memberTasksData.push({
        member: member,
        tasks: tasks
      });
    }    
    const itemsPerPage = 3;
    const totalPages = Math.ceil(memberTasksData.length / itemsPerPage);
    let currentPage = 0;
    
    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const pageData = memberTasksData.slice(start, end);
      
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Yetkili Görev Durumu')
        .setDescription(`Toplam ${memberTasksData.length} yetkili üye gösteriliyor.`)
        .setFooter({ text: `Sayfa ${page + 1}/${totalPages}` })
        .setTimestamp();
      
      pageData.forEach(data => {
        const member = data.member;
        const tasks = data.tasks;
        
        let taskInfo = '';
        if (tasks.length > 0) {
          tasks.forEach(task => {
            const taskType = task.task_type === 'message' ? '📝 Mesaj' : task.task_type === 'voice' ? '🎤 Ses' : '🤝 Partner';
            const progress = task.progress || 0;
            const percentage = Math.min(100, Math.floor((progress / task.target_amount) * 100));
            const progressBar = createProgressBar(percentage);
            
            taskInfo += `${taskType}: ${task.description}\n${progressBar} ${percentage}% (${progress}/${task.target_amount})\n`;
          });
        } else {
          taskInfo = '📋 Henüz aktif görev bulunmuyor';
        }
        
        embed.addFields({
          name: `${member.displayName}`,
          value: taskInfo,
          inline: false
        });
      });
      
      return embed;
    };
    
    const embed = generateEmbed(currentPage);
    
    const row = new ActionRowBuilder();
    
    if (totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('task_status_prev')
          .setLabel('◀️ Önceki')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('task_status_next')
          .setLabel('Sonraki ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === totalPages - 1)
      );
    }
    
    const messageOptions = { embeds: [embed] };
    if (totalPages > 1) {
      messageOptions.components = [row];
    }
    
    let message;
    if (source.deferred) {
      message = await source.editReply(messageOptions);
    } else if (source.reply && !source.replied) {
      message = await source.reply(messageOptions);
    }
    
  
    if (totalPages > 1 && message) {
      const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === (source.user ? source.user.id : source.author.id),
        time: 300000 
      });
      
      collector.on('collect', async i => {
        if (i.customId === 'task_status_prev' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'task_status_next' && currentPage < totalPages - 1) {
          currentPage++;
        }
        
        const newEmbed = generateEmbed(currentPage);
        const newRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('task_status_prev')
              .setLabel('◀️ Önceki')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId('task_status_next')
              .setLabel('Sonraki ▶️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === totalPages - 1)
          );
        
        await i.update({ embeds: [newEmbed], components: [newRow] });
      });
      
      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('task_status_prev')
                .setLabel('◀️ Önceki')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('task_status_next')
                .setLabel('Sonraki ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
          
          await message.edit({ components: [disabledRow] });
        } catch (error) {
          console.error('Butonları devre dışı bırakırken hata:', error);
        }
      });
    }
    
  } catch (error) {
    console.error('showAllTasksStatus fonksiyonunda hata:', error);
    try {
      if (source.deferred) {
        await source.editReply({ content: 'Görev durumları yüklenirken bir hata oluştu!' });
      } else if (source.reply && !source.replied) {
        await source.reply({ content: 'Görev durumları yüklenirken bir hata oluştu!', flags: 64 });
      }
    } catch (replyError) {
      console.error('Hata mesajı gönderilirken hata:', replyError);
    }
  }
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  
 
  if (/^\d+$/.test(timeStr)) {
    return parseInt(timeStr);
  }
  

  const match = timeStr.match(/^(\d+)([mh])$/i);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit === 'm') {
      return value;
    } else if (unit === 'h') {
      return value * 60;
    }
  }
  
  return null;
}