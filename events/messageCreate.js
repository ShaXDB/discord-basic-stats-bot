const { Events } = require('discord.js');
const { updateUserStats, updateUserTaskProgress } = require('../database/database');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
   
    if (message.author.bot || !message.guild) return;
    
    try {
      
      await updateUserStats(message.author.id, 1, 0, 0);
      
      
      await updateUserTaskProgress(message.author.id, 'message', 1);
    } catch (error) {
      console.error('Mesaj istatistikleri güncellenirken hata oluştu:', error);
    }
  },
};