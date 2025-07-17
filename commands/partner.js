const { SlashCommandBuilder } = require('@discordjs/builders');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'partner',
  description: 'Partner metni gönderir',
  data: new SlashCommandBuilder()
    .setName('partner')
    .setDescription('Partner metni gönderir'),
  
  async run(client, message, args) {
    message.reply('Bu komut sadece slash komut olarak kullanılabilir. Lütfen `/partner` komutunu kullanın.');
  },
  
  async execute(interaction) {
    try {
      const modal = new ModalBuilder()
        .setCustomId('partnerModal')
        .setTitle('Partner Metni');

      const partnerTextInput = new TextInputBuilder()
        .setCustomId('partnerText')
        .setLabel('Partner metninizi girin')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Partner metninizi buraya yazın...')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(2000);

      const firstActionRow = new ActionRowBuilder().addComponents(partnerTextInput);

      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Partner komutu çalıştırılırken hata oluştu:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Komut çalıştırılırken bir hata oluştu!', flags: 64 }).catch(() => {});
      }
    }
  }
};
