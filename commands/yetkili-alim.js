const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const config = require('../config/config');
const { initializeApplicationDatabase } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yetkili-alim')
        .setDescription('Yetkili alım sistemini açar veya kapatır')
        .addStringOption(option =>
            option.setName('durum')
                .setDescription('Yetkili alımı açmak veya kapatmak için')
                .setRequired(true)
                .addChoices(
                    { name: 'Aç', value: 'open' },
                    { name: 'Kapat', value: 'close' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const status = interaction.options.getString('durum');
        const applicationChannelId = process.env.APPLICATION_CHANNEL_ID;
        const applicationChannel = interaction.guild.channels.cache.get(applicationChannelId);

        if (!applicationChannel) {
            return await interaction.reply({
                content: '❌ Başvuru kanalı bulunamadı! Lütfen kanal ID\'sini kontrol edin.',
                ephemeral: true
            });
        }

        try {
            if (!interaction.client.applicationStatus) {
                interaction.client.applicationStatus = new Map();
            }
            if (!interaction.client.applicationData) {
                interaction.client.applicationData = new Map();
            }
            if (!interaction.client.applicationPages) {
                interaction.client.applicationPages = new Map();
            }

            try {
                await initializeApplicationDatabase();
                Logger.info('Application database initialized successfully');
            } catch (dbError) {
                Logger.error('Failed to initialize application database:', dbError);
                return await interaction.reply({
                    content: '❌ Veritabanı başlatılırken hata oluştu!',
                    ephemeral: true
                });
            }

            if (status === 'open') {
                interaction.client.applicationStatus.set('status', true);

                const embed = new EmbedBuilder()
                    .setTitle('🎯 Yetkili Alımları Açık!')
                    .setDescription(
                        '**Sunucumuzda yetkili olmak ister misiniz?**\n\n' +
                        '🔹 Aktif ve sorumlu üyeler arıyoruz\n' +
                        '🔹 Discord moderasyon deneyimi tercih edilir\n' +
                        '🔹 Günlük en az 3-4 saat aktif olabilmelisiniz\n' +
                        '🔹 Takım çalışmasına uyumlu olmalısınız\n\n' +
                        '**Başvuru yapmak için aşağıdaki düğmeye tıklayın!**'
                    )
                    .setColor(config.colors?.success || '#00ff00')
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ 
                        text: 'Başvurular değerlendirildikten sonra size dönüş yapılacaktır.',
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                const button = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('start_application')
                            .setLabel('📝 Yetkili Başvurusu Yap')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📝')
                    );

                try {
                    const messages = await applicationChannel.messages.fetch({ limit: 10 });
                    const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);
                    if (botMessages.size > 0) {
                        await applicationChannel.bulkDelete(botMessages);
                    }
                } catch (cleanupError) {
                    Logger.warn('Failed to cleanup old messages:', cleanupError);
                }

                await applicationChannel.send({
                    embeds: [embed],
                    components: [button]
                });

                Logger.info(`Staff applications opened by ${interaction.user.tag}`);
                await interaction.reply({
                    content: '✅ Yetkili alımları başarıyla açıldı!',
                    ephemeral: true
                });

            } else {
                interaction.client.applicationStatus.set('status', false);

                const embed = new EmbedBuilder()
                    .setTitle('🔒 Yetkili Alımları Kapalı')
                    .setDescription(
                        '**Yetkili alımları şu anda kapalıdır.**\n\n' +
                        '🔹 Alımlar tekrar açıldığında duyuru yapılacaktır\n' +
                        '🔹 Mevcut başvurular değerlendirilmeye devam edecektir\n' +
                        '🔹 Güncellemeler için duyuru kanallarını takip edin\n\n' +
                        '**Sabırlı olduğunuz için teşekkürler!**'
                    )
                    .setColor(config.colors?.error || '#ff0000')
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ 
                        text: 'Yetkili alımları hakkında güncellemeler için beklemede kalın.',
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();
                    
                try {
                    const messages = await applicationChannel.messages.fetch({ limit: 10 });
                    const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);
                    if (botMessages.size > 0) {
                        await applicationChannel.bulkDelete(botMessages);
                    }
                } catch (cleanupError) {
                    Logger.warn('Failed to cleanup old messages:', cleanupError);
                }

                await applicationChannel.send({
                    embeds: [embed]
                });

                Logger.info(`Staff applications closed by ${interaction.user.tag}`);
                await interaction.reply({
                    content: '✅ Yetkili alımları başarıyla kapatıldı!',
                    ephemeral: true
                });
            }
        } catch (error) {
            Logger.error('Error in yetkili-alim command:', error);
            
            const errorReply = {
                content: '❌ Bir hata oluştu! Lütfen tekrar deneyin.',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorReply).catch(err => 
                    Logger.error('Failed to send error followup:', err)
                );
            } else {
                await interaction.reply(errorReply).catch(err => 
                    Logger.error('Failed to send error reply:', err)
                );
            }
        }
    },
};