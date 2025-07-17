const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserStats, getUserStatsHistory } = require('../database/database');
const { createCanvas, loadImage } = require('canvas');
const Chart = require('chart.js/auto');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const moment = require('moment');
moment.locale('tr');

const width = 800;
const height = 500;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#36393f' });

async function createStatsChart(username, statsHistory) {
  const dates = statsHistory.map(stat => moment(stat.date).format('DD MMM'));
  const messageData = statsHistory.map(stat => stat.message_count);
  const voiceData = statsHistory.map(stat => stat.voice_minutes);
  const partnerData = statsHistory.map(stat => stat.partner_count);


  const configuration = {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Mesaj',
          data: messageData,
          borderColor: '#5865F2',
          backgroundColor: 'rgba(88, 101, 242, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Ses (Dakika)',
          data: voiceData,
          borderColor: '#57F287',
          backgroundColor: 'rgba(87, 242, 135, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Partner',
          data: partnerData,
          borderColor: '#FEE75C',
          backgroundColor: 'rgba(254, 231, 92, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${username} - İstatistik Grafiği`,
          color: 'white',
          font: {
            size: 18
          }
        },
        legend: {
          labels: {
            color: 'white'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'white'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'white'
          }
        }
      }
    }
  };


  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

async function createStatsCard(client, user, allTimeStats, dailyStats, weeklyStats, monthlyStats) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');


  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#2c2f33');
  gradient.addColorStop(1, '#23272A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  

  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
    

    ctx.beginPath();
    ctx.arc(80, 80, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#36393f';
    ctx.fill();
    

    ctx.save();
    ctx.beginPath();
    ctx.arc(80, 80, 45, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 35, 35, 90, 90);
    ctx.restore();
    

    ctx.beginPath();
    ctx.arc(80, 80, 45, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5865F2';
    ctx.stroke();
  } catch (error) {
    console.error('Avatar yüklenirken hata oluştu:', error);
  }


  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${user.username}`, 150, 70);
  
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '20px Arial';
  ctx.fillText('İstatistikler', 150, 100);
  

  try {

    const guild = client.guilds.cache.first(); 
    const serverAvatar = await loadImage(guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
    

    ctx.beginPath();
    ctx.arc(width - 80, 80, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#36393f';
    ctx.fill();
    

    ctx.save();
    ctx.beginPath();
    ctx.arc(width - 80, 80, 45, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(serverAvatar, width - 125, 35, 90, 90);
    ctx.restore();
    

    ctx.beginPath();
    ctx.arc(width - 80, 80, 45, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5865F2';
    ctx.stroke();
    

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(guild.name || 'Hana | Anime & Sohbet', width - 150, 70);
    
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Sunucu', width - 150, 100);
  } catch (error) {
    console.error('Sunucu avatarı yüklenirken hata oluştu:', error);
  }
  

  const boxWidth = 170;
  const boxHeight = 140; 
  const startY = 200;
  const spacing = 20;
  

  drawStatsBox(ctx, 20, startY, boxWidth, boxHeight, 'Tüm Zamanlar', allTimeStats, '#5865F2');
  

  drawStatsBox(ctx, 20 + boxWidth + spacing, startY, boxWidth, boxHeight, 'Bugün', dailyStats, '#57F287');
  

  drawStatsBox(ctx, 20 + (boxWidth + spacing) * 2, startY, boxWidth, boxHeight, 'Son 7 Gün', weeklyStats, '#FEE75C');
  

  drawStatsBox(ctx, 20 + (boxWidth + spacing) * 3, startY, boxWidth, boxHeight, 'Son 30 Gün', monthlyStats, '#EB459E');
  

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Son güncelleme: ${moment().format('DD MMMM YYYY, HH:mm')}`, width / 2, height - 20);

  return canvas.toBuffer();
}

function drawStatsBox(ctx, x, y, width, height, title, stats, accentColor) {
  ctx.fillStyle = '#36393f'; 
  roundRect(ctx, x, y, width, height, 10, true, false);
  

  ctx.fillStyle = accentColor;
  roundRect(ctx, x, y, width, 5, { tl: 10, tr: 10, br: 0, bl: 0 }, true, false);
  

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + width / 2, y + 25);
  

  const iconY = y + 55;
  const spacing = 30;
  

  ctx.fillStyle = '#aaaaaa';
  ctx.font = 'bold 14px Arial';  
  ctx.textAlign = 'left';
  ctx.fillText('Mesaj:', x + 20, iconY);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${stats.message_count || 0}`, x + width - 20, iconY);
  

  ctx.fillStyle = 'rgba(80, 80, 80, 0.2)';
  roundRect(ctx, x + 10, iconY - 15, width - 20, 20, 5, true, false);
  

  ctx.fillStyle = '#aaaaaa';
  ctx.font = 'bold 14px Arial';  
  ctx.textAlign = 'left';
  ctx.fillText('Ses:', x + 20, iconY + spacing);
  
  const hours = Math.floor((stats.voice_minutes || 0) / 60);
  const minutes = (stats.voice_minutes || 0) % 60;
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${hours}s ${minutes}dk`, x + width - 20, iconY + spacing);
  

  ctx.fillStyle = 'rgba(80, 80, 80, 0.2)';
  roundRect(ctx, x + 10, iconY + spacing - 15, width - 20, 20, 5, true, false);
  

  ctx.fillStyle = '#aaaaaa';
  ctx.font = 'bold 14px Arial';  
  ctx.textAlign = 'left';
  ctx.fillText('Partner:', x + 20, iconY + spacing * 2);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${stats.partner_count || 0}`, x + width - 20, iconY + spacing * 2);
  

  ctx.fillStyle = 'rgba(80, 80, 80, 0.2)';
  roundRect(ctx, x + 10, iconY + spacing * 2 - 15, width - 20, 20, 5, true, false);
}


function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = { ...{ tl: 0, tr: 0, br: 0, bl: 0 }, ...radius };
  }
  
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  
  if (fill) {
    ctx.fill();
  }
  
  if (stroke) {
    ctx.stroke();
  }
}

async function sendStats(targetUser, source) {
  if (!targetUser || !targetUser.id) {
    const errorMessage = 'Kullanıcı bulunamadı!';
    if (source.deferred) {
      await source.editReply(errorMessage);
    } else if (source.reply) {
      await source.reply(errorMessage);
    }
    return;
  }
  

  const allTimeStats = await getUserStats(targetUser.id, 'all');
  const dailyStats = await getUserStats(targetUser.id, 'day');
  const weeklyStats = await getUserStats(targetUser.id, 'week');
  const monthlyStats = await getUserStats(targetUser.id, 'month');
  

  const statsHistory = await getUserStatsHistory(targetUser.id, 30);
  

  const statsCard = await createStatsCard(source.client, targetUser, allTimeStats, dailyStats, weeklyStats, monthlyStats);
  const statsCardAttachment = new AttachmentBuilder(statsCard, { name: 'stats-card.png' });
  

  const statsChart = await createStatsChart(targetUser.username, statsHistory);
  const statsChartAttachment = new AttachmentBuilder(statsChart, { name: 'stats-chart.png' });
  

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_chart_${targetUser.id}`)
        .setLabel('Grafiği Göster')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊')
    );
  

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`${targetUser.username} - İstatistikler`)
    .setDescription(`${targetUser} kullanıcısının istatistikleri aşağıda gösterilmiştir.`)
    .setImage('attachment://stats-card.png')
    .setTimestamp();
  

  let message;
  if (source.deferred) {
    message = await source.editReply({ embeds: [embed], files: [statsCardAttachment], components: [row] });
  } else if (source.reply && source.user) {
    message = await source.reply({ embeds: [embed], files: [statsCardAttachment], components: [row] });
  } else {
    message = await source.reply({ embeds: [embed], files: [statsCardAttachment], components: [row] });
  }
  
  const filter = i => i.customId === `stats_chart_${targetUser.id}` && i.user.id === (source.user ? source.user.id : source.author.id);
  
  try {
    const collector = message.createMessageComponentCollector({ filter, time: 60000 });
    
    collector.on('collect', async i => {
      try {

        const chartEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`${targetUser.username} - İstatistik Grafiği`)
          .setDescription(`${targetUser} kullanıcısının son 30 günlük istatistik grafiği.`)
          .setImage('attachment://stats-chart.png')
          .setTimestamp();
        

        const backRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`stats_back_${targetUser.id}`)
              .setLabel('İstatistiklere Dön')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🔙')
          );
        
        await i.update({ embeds: [chartEmbed], files: [statsChartAttachment], components: [backRow] });
        

        const backFilter = j => j.customId === `stats_back_${targetUser.id}` && j.user.id === (source.user ? source.user.id : source.author.id);
        const backCollector = message.createMessageComponentCollector({ filter: backFilter, time: 60000 });
        
        backCollector.on('collect', async j => {
          try {
            await j.update({ embeds: [embed], files: [statsCardAttachment], components: [row] });
          } catch (error) {
            console.error('Geri dönüş butonu işlenirken hata oluştu:', error);
            await j.followUp({ content: 'İstatistiklere dönülürken bir hata oluştu!', flags: 64 });
          }
        });
      } catch (error) {
        console.error('Buton etkileşimi işlenirken hata oluştu:', error);

        await i.update({ content: 'Grafik gösterilirken bir hata oluştu!', components: [] }).catch(() => {
          i.followUp({ content: 'Grafik gösterilirken bir hata oluştu!', flags: 64 });
        });
      }
    });
  } catch (error) {
    console.error('Buton etkileşimi işlenirken hata oluştu:', error);
  }
}

async function run(client, message, args) {
  try {
    const targetUser = (message.mentions && message.mentions.users && message.mentions.users.first()) || message.author;
    
    if (!targetUser) {
      if (message.reply) {
        await message.reply('Kullanıcı bulunamadı!');
      }
      return;
    }
    
    await sendStats(targetUser, message);
  } catch (error) {
    console.error('Stats komutu çalıştırılırken hata oluştu:', error);
    if (message.reply) {
      await message.reply('İstatistikler alınırken bir hata oluştu!');
    }
  }
}

async function execute(interaction) {
  try {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
    await sendStats(targetUser, interaction);
  } catch (error) {
    console.error('Stats komutu çalıştırılırken hata oluştu:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('İstatistikler alınırken bir hata oluştu!');
    } else {
      await interaction.reply({ content: 'İstatistikler alınırken bir hata oluştu!', flags: 64 });
    }
  }
}

module.exports = {
  name: 'stats',
  description: 'Kullanıcı istatistiklerini gösterir',
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Kullanıcı istatistiklerini gösterir')
    .addUserOption(option =>
      option.setName('kullanıcı')
        .setDescription('İstatistiklerini görmek istediğiniz kullanıcı')
        .setRequired(false)),
  run,
  execute
};