const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTopUsers } = require('../database/database');

function getStatTypeName(statType) {
  switch (statType) {
    case 'message': return 'Mesaj';
    case 'voice': return 'Ses';
    case 'partner': return 'Partner';
    default: return 'Mesaj';
  }
}

function getPeriodName(period) {
  switch (period) {
    case 'all': return 'Tüm Zamanlar';
    case 'month': return 'Bu Ay';
    case 'week': return 'Bu Hafta';
    case 'day': return 'Bugün';
    default: return 'Tüm Zamanlar';
  }
}

function formatStatValue(statType, value) {
  switch (statType) {
    case 'message': return `${value.toLocaleString()} mesaj`;
    case 'voice': return `${value.toLocaleString()} dakika`;
    case 'partner': return `${value.toLocaleString()} partner`;
    default: return value.toLocaleString();
  }
}

async function showTopUsers(client, context, statType, period, limit) {
  try {
    const topUsers = await getTopUsers(statType, limit, period);
    
    if (topUsers.length === 0) {
      const noDataMessage = `Bu dönem için ${getStatTypeName(statType)} istatistiği bulunamadı.`;
      if (context.replied || context.deferred) {
        return context.editReply({ content: noDataMessage });
      } else if (context.reply) {
        return context.reply(noDataMessage);
      }
    }
    
    const userPromises = topUsers.map(async (userData, index) => {
      const user = await client.users.fetch(userData.user_id).catch(() => null);
      return {
        rank: index + 1,
        username: user ? user.username : 'Bilinmeyen Kullanıcı',
        value: userData.stat_value,
        userId: userData.user_id
      };
    });
    
    const users = await Promise.all(userPromises);
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🏆 ${getStatTypeName(statType)} Sıralaması - ${getPeriodName(period)}`)
      .setDescription(users.map(user => {
        let medal = '';
        if (user.rank === 1) medal = '🥇';
        else if (user.rank === 2) medal = '🥈';
        else if (user.rank === 3) medal = '🥉';
        
        return `${medal} **${user.rank}.** ${user.username}: **${formatStatValue(statType, user.value)}**`;
      }).join('\n'))
      .setTimestamp();
    
    if (context.replied || context.deferred) {
      return context.editReply({ embeds: [embed] });
    } else if (context.reply) {
      return context.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('showTopUsers fonksiyonunda hata oluştu:', error);
    if (context.replied || context.deferred) {
      return context.editReply({ content: 'Sıralama gösterilirken bir hata oluştu!' });
    } else if (context.reply) {
      return context.reply('Sıralama gösterilirken bir hata oluştu!');
    }
  }
}

const topCommand = {
  name: 'top',
  description: 'En yüksek istatistiklere sahip kullanıcıları gösterir',
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('En yüksek istatistiklere sahip kullanıcıları gösterir')
    .addSubcommand(subcommand =>
      subcommand
        .setName('mesaj')
        .setDescription('En çok mesaj gönderen kullanıcıları gösterir')
        .addStringOption(option =>
          option.setName('dönem')
            .setDescription('İstatistik dönemi')
            .setRequired(false)
            .addChoices(
              { name: 'Tüm Zamanlar', value: 'all' },
              { name: 'Bu Ay', value: 'month' },
              { name: 'Bu Hafta', value: 'week' },
              { name: 'Bugün', value: 'day' }
            ))
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Gösterilecek kullanıcı sayısı')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ses')
        .setDescription('En çok sesli sohbette vakit geçiren kullanıcıları gösterir')
        .addStringOption(option =>
          option.setName('dönem')
            .setDescription('İstatistik dönemi')
            .setRequired(false)
            .addChoices(
              { name: 'Tüm Zamanlar', value: 'all' },
              { name: 'Bu Ay', value: 'month' },
              { name: 'Bu Hafta', value: 'week' },
              { name: 'Bugün', value: 'day' }
            ))
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Gösterilecek kullanıcı sayısı')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('partner')
        .setDescription('En çok partner metni gönderen kullanıcıları gösterir')
        .addStringOption(option =>
          option.setName('dönem')
            .setDescription('İstatistik dönemi')
            .setRequired(false)
            .addChoices(
              { name: 'Tüm Zamanlar', value: 'all' },
              { name: 'Bu Ay', value: 'month' },
              { name: 'Bu Hafta', value: 'week' },
              { name: 'Bugün', value: 'day' }
            ))
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Gösterilecek kullanıcı sayısı')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    ),
  
  async run(client, message, args) {
    try {
      let statType = 'message';
      let period = 'all';
      let limit = 10;
      
      if (args.length > 0) {
        if (['mesaj', 'message'].includes(args[0].toLowerCase())) {
          statType = 'message';
        } else if (['ses', 'voice'].includes(args[0].toLowerCase())) {
          statType = 'voice';
        } else if (args[0].toLowerCase() === 'partner') {
          statType = 'partner';
        } else {
          return message.reply('Geçersiz istatistik türü! Kullanılabilir türler: `mesaj`, `ses`, `partner`');
        }
        
        if (args.length > 1) {
          if (['tüm', 'all', 'hepsi'].includes(args[1].toLowerCase())) period = 'all';
          else if (['ay', 'month'].includes(args[1].toLowerCase())) period = 'month';
          else if (['hafta', 'week'].includes(args[1].toLowerCase())) period = 'week';
          else if (['gün', 'day', 'bugün', 'today'].includes(args[1].toLowerCase())) period = 'day';
          else if (!isNaN(args[1])) {
            limit = Math.min(Math.max(parseInt(args[1]), 1), 25);
          } else {
            return message.reply('Geçersiz dönem! Kullanılabilir dönemler: `tüm`, `ay`, `hafta`, `gün` veya bir sayı');
          }
          
          if (args.length > 2 && !isNaN(args[2])) {
            limit = Math.min(Math.max(parseInt(args[2]), 1), 25);
          }
        }
      } else {
        return message.reply('Kullanım: `.top <tür> [dönem] [limit]`\nTürler: `mesaj`, `ses`, `partner`\nDönemler: `tüm`, `ay`, `hafta`, `gün`');
      }
      
      await showTopUsers(client, message, statType, period, limit);
    } catch (error) {
      console.error('Top komutu çalıştırılırken hata oluştu:', error);
      message.reply('Komut çalıştırılırken bir hata oluştu!');
    }
  },
  
  async execute(client, interaction) {
    try {
      const subCommand = interaction.options.getSubcommand();
      
      let statType;
      if (subCommand === 'mesaj') statType = 'message';
      else if (subCommand === 'ses') statType = 'voice';
      else if (subCommand === 'partner') statType = 'partner';
      
      const period = interaction.options.getString('dönem') || 'all';
      const limit = interaction.options.getInteger('limit') || 10;
      
      await interaction.deferReply();
      await showTopUsers(client, interaction, statType, period, limit);
    } catch (error) {
      console.error('Top komutu çalıştırılırken hata oluştu:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Komut çalıştırılırken bir hata oluştu!', flags: 64 });
      } else {
        await interaction.editReply('Komut çalıştırılırken bir hata oluştu!');
      }
    }
  }
};

async function showTopUsers(client, context, statType, period, limit) {
  try {
    const topUsers = await getTopUsers(statType, limit, period);
    
    if (topUsers.length === 0) {
      const noDataMessage = `Bu dönem için ${getStatTypeName(statType)} istatistiği bulunamadı.`;
      if (context.replied || context.deferred) {
        
        return context.editReply({ content: noDataMessage });
      } else if (context.reply) {
        
        return context.reply(noDataMessage);
      }
    }
    
    const userPromises = topUsers.map(async (userData, index) => {
      const user = await client.users.fetch(userData.user_id).catch(() => null);
      return {
        rank: index + 1,
        username: user ? user.username : 'Bilinmeyen Kullanıcı',
        value: userData.stat_value,
        userId: userData.user_id
      };
    });
    
    const users = await Promise.all(userPromises);
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🏆 ${getStatTypeName(statType)} Sıralaması - ${getPeriodName(period)}`)
      .setDescription(users.map(user => {
        let medal = '';
        if (user.rank === 1) medal = '🥇';
        else if (user.rank === 2) medal = '🥈';
        else if (user.rank === 3) medal = '🥉';
        
        return `${medal} **${user.rank}.** ${user.username}: **${formatStatValue(statType, user.value)}**`;
      }).join('\n'))
      .setTimestamp();
    
    if (context.replied || context.deferred) {
      return context.editReply({ embeds: [embed] });
    } else if (context.reply) {
      return context.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('showTopUsers fonksiyonunda hata oluştu:', error);
    if (context.replied || context.deferred) {
      return context.editReply({ content: 'Sıralama gösterilirken bir hata oluştu!' });
    } else if (context.reply) {
      return context.reply('Sıralama gösterilirken bir hata oluştu!');
    }
  }
}

module.exports = topCommand;
module.exports.showTopUsers = showTopUsers;