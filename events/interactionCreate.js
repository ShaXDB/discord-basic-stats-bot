const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { applicationQuestions } = require('../utils/questions');
const validation = require('../utils/validation');
const Database = require('../utils/database');
const Logger = require('../utils/logger');
const Validator = require('../utils/validation');
const config = require('../config/config');


module.exports = {
    name: 'interactionCreate',
    async execute(interaction) { 
        const client = interaction.client;
        const startTime = Date.now();
        
        try {
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Komut hatası:', error);
                const reply = {
                    content: '❌ Komut çalıştırılırken bir hata oluştu!',
                    flags: 64
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        if (interaction.isButton()) {
            const { customId } = interaction;

            if (customId === 'start_application') {
                const applicationStatus = client.applicationStatus.get('status');
                if (!applicationStatus) {
                    return await interaction.reply({
                        content: '❌ Yetkili alımları şu anda kapalıdır!',
                        flags: 64
                    });
                }

                const userId = interaction.user.id;
                
                const canApply = Validator.canUserApply(userId, client.applicationData);
                if (!canApply.canApply) {
                    const remainingHours = Math.ceil(canApply.remainingTime / (1000 * 60 * 60));
                    return await interaction.reply({
                        content: `❌ ${canApply.reason}. Please wait ${remainingHours} more hours.`,
                        flags: 64
                    });
                }
                client.applicationData.set(userId, {
                    startTime: Date.now(),
                    currentStep: 'step1',
                    answers: {},
                    user: {
                        id: userId,
                        tag: interaction.user.tag,
                        username: interaction.user.username
                    }
                });

                Logger.info(`User ${interaction.user.tag} started application`);
                await showApplicationModal(interaction, 'step1');
            }

            if (customId.startsWith('continue_step')) {
                const step = customId.split('_')[2];
                await showApplicationModal(interaction, step);
            }
            
            if (customId.startsWith('prev_page_') || customId.startsWith('next_page_')) {
                await handlePageNavigation(interaction, client);
            }
            
            if (customId.startsWith('approve_application_') || customId.startsWith('reject_application_')) {
                await handleApplicationDecision(interaction, client);
            }
        }

        if (interaction.isModalSubmit()) {
            const { customId } = interaction;

            if (customId.startsWith('application_step')) {
                await handleApplicationStep(interaction, client);
            }
            
            if (customId === 'partnerModal') {
                await handlePartnerModal(interaction, client);
            }
        }
        } catch (error) {
            Logger.error('Error handling interaction:', error);
            
            if (client.healthMonitor) {
                client.healthMonitor.recordError();
            }
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                    flags: 64
                }).catch(() => {});
            }
        } finally {
            if (client.healthMonitor) {
                const responseTime = Date.now() - startTime;
                client.healthMonitor.recordRequest(responseTime);
            }
        }
    }
};

async function showApplicationModal(interaction, step) {
    const questions = applicationQuestions[step];
    if (!questions) {
        return await interaction.reply({
            content: '❌ Geçersiz adım!',
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`application_${step}`)
        .setTitle(`Yetkili Başvurusu - ${getStepTitle(step)}`);

    const components = [];
    for (const question of questions) {
        const textInput = new TextInputBuilder()
            .setCustomId(question.id)
            .setLabel(question.label)
            .setStyle(question.maxLength > 100 ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setPlaceholder(question.placeholder)
            .setRequired(question.required)
            .setMaxLength(question.maxLength);

        const actionRow = new ActionRowBuilder().addComponents(textInput);
        components.push(actionRow);
    }

    modal.addComponents(...components);
    await interaction.showModal(modal);
}

async function handleApplicationStep(interaction, client) {
    const step = interaction.customId.split('_')[1];
    const userId = interaction.user.id;
    
    if (!client.applicationData.has(userId)) {
        Logger.warn(`Application data not found for user ${interaction.user.tag}`);
        return await interaction.reply({
            content: '❌ Başvuru verisi bulunamadı. Lütfen tekrar başlayın.',
            ephemeral: true
        });
    }

    const userData = client.applicationData.get(userId);
    const questions = applicationQuestions[step];
    const stepData = {};
    for (const question of questions) {
        const answer = interaction.fields.getTextInputValue(question.id);
        stepData[question.id] = Validator.sanitizeInput(answer);
        userData.answers[question.id] = stepData[question.id];
    }


    const validation = Validator.validateStep(step, stepData);
    if (!validation.isValid) {
        Logger.warn(`Validation failed for user ${interaction.user.tag}: ${validation.errors.join(', ')}`);
        return await interaction.reply({
            content: `❌ Validation errors:\n${validation.errors.join('\n')}`,
            ephemeral: true
        });
    }


    const nextStep = getNextStep(step);
    
    if (nextStep) {
        const embed = new EmbedBuilder()
            .setTitle('✅ Cevaplarınız Kaydedildi!')
            .setDescription(`**${getStepTitle(step)}** adımı tamamlandı.\n\nDevam etmek için aşağıdaki düğmeye tıklayın.`)
            .setColor('#00ff00')
            .setFooter({ text: `Adım ${getStepNumber(step)}/5 tamamlandı` });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`continue_step_${nextStep}`)
                    .setLabel(`${getStepTitle(nextStep)} - Devam Et`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
            );

        await interaction.reply({
            embeds: [embed],
            components: [button],
            ephemeral: true
        });
    } else {
        await completeApplication(interaction, client, userData);
    }
}

async function completeApplication(interaction, client, userData) {
    const logChannelId = process.env.LOG_CHANNEL_ID;
    const logChannel = interaction.guild.channels.cache.get(logChannelId);

    if (!logChannel) {
        return await interaction.reply({
            content: '❌ Log kanalı bulunamadı!',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 Yeni Yetkili Başvurusu')
        .setDescription(`**Başvuran:** ${userData.user.tag} (${userData.user.id})\n**Başvuru Tarihi:** ${new Date(userData.startTime).toLocaleString('tr-TR')}`)
        .setColor('#0099ff')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    const allQuestions = [
        ...applicationQuestions.step1,
        ...applicationQuestions.step2,
        ...applicationQuestions.step3,
        ...applicationQuestions.step4,
        ...applicationQuestions.step5
    ];
    
    const allAnswers = [];
    for (const [questionId, answer] of Object.entries(userData.answers)) {
        const question = allQuestions.find(q => q.id === questionId);
        if (question) {
            allAnswers.push({
                name: question.label,
                value: answer.length > 1024 ? answer.substring(0, 1021) + '...' : answer
            });
        }
    }
    
    const fieldsPerPage = 10;
    const totalPages = Math.ceil(allAnswers.length / fieldsPerPage);
    const firstPageAnswers = allAnswers.slice(0, fieldsPerPage);

    firstPageAnswers.forEach(field => {
        embed.addFields(field);
    });
    

    if (totalPages > 1) {
        embed.setFooter({ text: `Sayfa 1/${totalPages} • Başvuru ID: ${userData.user.id}` });
    }
    

    const components = [];
    if (totalPages > 1) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`prev_page_${userData.user.id}_0`)
                    .setLabel('◀ Önceki')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`next_page_${userData.user.id}_0`)
                    .setLabel('Sonraki ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(totalPages === 1)
            );
        components.push(row);
    }
    
    const approvalRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`approve_application_${userData.user.id}`)
                .setLabel('✅ Onayla')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`reject_application_${userData.user.id}`)
                .setLabel('❌ Reddet')
                .setStyle(ButtonStyle.Danger)
        );
    components.push(approvalRow);

    const logMessage = await logChannel.send({ 
        content: '@everyone Yeni yetkili başvurusu!',
        embeds: [embed],
        components: components
    });
    
      if (totalPages > 1) {
          client.applicationPages.set(userData.user.id, {
              allAnswers: allAnswers,
              totalPages: totalPages,
              userData: userData
          });
      }
      

    
    Logger.success(`Application submitted by ${interaction.user.tag}`);


    const confirmEmbed = new EmbedBuilder()
        .setTitle('🎉 Başvurunuz Tamamlandı!')
        .setDescription(
            '**Yetkili başvurunuz başarıyla gönderildi!**\n\n' +
            '🔹 Başvurunuz yetkili ekibimiz tarafından değerlendirilecektir\n' +
            '🔹 Sonuç hakkında size özel mesaj ile bilgi verilecektir\n' +
            '🔹 Değerlendirme süreci 1-3 gün sürebilir\n\n' +
            '**Sabırlı olduğunuz için teşekkürler!**'
        )
        .setColor('#00ff00')
        .setFooter({ text: 'Başvuru başarıyla kaydedildi' })
        .setTimestamp();

    await interaction.reply({
        embeds: [confirmEmbed],
        ephemeral: true
    });


    client.applicationData.delete(userData.user.id);
}

function getStepTitle(step) {
    const titles = {
        step1: 'Kişisel Bilgiler',
        step2: 'Deneyim ve Teknik',
        step3: 'Motivasyon',
        step4: 'Senaryolar',
        step5: 'Yetenekler'
    };
    return titles[step] || 'Bilinmeyen Adım';
}

function getStepNumber(step) {
    const numbers = {
        step1: 1,
        step2: 2,
        step3: 3,
        step4: 4,
        step5: 5
    };
    return numbers[step] || 0;
}


async function handlePageNavigation(interaction, client) {
    const { customId } = interaction;
    const parts = customId.split('_');
    const direction = parts[0]; 
    const userId = parts[2];
    const currentPage = parseInt(parts[3]);
    
    const pageData = client.applicationPages?.get(userId);
    if (!pageData) {
        return await interaction.reply({
            content: '❌ Sayfa verileri bulunamadı!',
            ephemeral: true
        });
    }
    
    const { allAnswers, totalPages, userData } = pageData;
    let newPage = currentPage;
    
    if (direction === 'next' && currentPage < totalPages - 1) {
        newPage = currentPage + 1;
    } else if (direction === 'prev' && currentPage > 0) {
        newPage = currentPage - 1;
    }
    
    const fieldsPerPage = 10;
    const startIndex = newPage * fieldsPerPage;
    const endIndex = Math.min(startIndex + fieldsPerPage, allAnswers.length);
    const pageAnswers = allAnswers.slice(startIndex, endIndex);
    

    const embed = new EmbedBuilder()
        .setTitle('📋 Yeni Yetkili Başvurusu')
        .setDescription(`**Başvuran:** ${userData.user.tag} (${userData.user.id})\n**Başvuru Tarihi:** ${new Date(userData.startTime).toLocaleString('tr-TR')}`)
        .setColor('#0099ff')
        .setThumbnail(interaction.message.embeds[0].thumbnail?.url || null)
        .setFooter({ text: `Sayfa ${newPage + 1}/${totalPages} • Başvuru ID: ${userData.user.id}` })
        .setTimestamp();
    
    pageAnswers.forEach(field => {
        embed.addFields(field);
    });
    

    const components = [];
    if (totalPages > 1) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`prev_page_${userId}_${newPage}`)
                    .setLabel('◀ Önceki')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === 0),
                new ButtonBuilder()
                    .setCustomId(`next_page_${userId}_${newPage}`)
                    .setLabel('Sonraki ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === totalPages - 1)
            );
        components.push(row);
    }
    

    const approvalRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`approve_application_${userId}`)
                .setLabel('✅ Onayla')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`reject_application_${userId}`)
                .setLabel('❌ Reddet')
                .setStyle(ButtonStyle.Danger)
        );
    components.push(approvalRow);
    
    await interaction.update({
        embeds: [embed],
        components: components
    });
}


async function handleApplicationDecision(interaction, client) {
    const { customId } = interaction;
    const parts = customId.split('_');
    const decision = parts[0]; 
    const userId = parts[2];
    

    if (!interaction.member.permissions.has('ManageRoles')) {
        return await interaction.reply({
            content: '❌ Bu işlemi yapmak için yetkiniz yok!',
            ephemeral: true
        });
    }
    
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) {
        return await interaction.reply({
            content: '❌ Kullanıcı bulunamadı!',
            ephemeral: true
        });
    }
    
    const embed = new EmbedBuilder()
        .setTimestamp();
    
    if (decision === 'approve') {

        const roleId = process.env.STAFF_ROLE_ID;
        const guild = interaction.guild;
        const member = await guild.members.fetch(userId).catch(() => null);
        
        let roleAssigned = false;
        if (member) {
            try {
                const role = await guild.roles.fetch(roleId);
                if (role) {
                    await member.roles.add(role);
                    roleAssigned = true;
                    Logger.success(`Role ${role.name} assigned to ${user.tag}`);
                } else {
                    Logger.error(`Role with ID ${roleId} not found`);
                }
            } catch (error) {
                Logger.error(`Failed to assign role to ${user.tag}:`, error);
            }
        }
        
        embed
            .setTitle('✅ Başvuru Onaylandı')
            .setDescription(`**${user.tag}** kullanıcısının başvurusu **${interaction.user.tag}** tarafından onaylandı.${roleAssigned ? '\n🎭 Yetkili rolü verildi!' : '\n⚠️ Rol verilemedi, manuel olarak verilmesi gerekiyor.'}`)
            .setColor('#00ff00');
        
        try {
            await user.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🎉 Başvurunuz Onaylandı!')
                    .setDescription(`Tebrikler! Yetkili başvurunuz onaylandı.${roleAssigned ? ' Yetkili rolünüz verildi!' : ' Yakında size rol verilecektir.'}`)
                    .setColor('#00ff00')
                    .setTimestamp()]
            });
        } catch (error) {
            Logger.warn(`Could not send DM to ${user.tag}`);
        }
    } else {
        embed
            .setTitle('❌ Başvuru Reddedildi')
            .setDescription(`**${user.tag}** kullanıcısının başvurusu **${interaction.user.tag}** tarafından reddedildi.`)
            .setColor('#ff0000');
        
        try {
            await user.send({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Başvurunuz Reddedildi')
                    .setDescription('Maalesef yetkili başvurunuz reddedildi. Daha sonra tekrar başvurabilirsiniz.')
                    .setColor('#ff0000')
                    .setTimestamp()]
            });
        } catch (error) {
            Logger.warn(`Could not send DM to ${user.tag}`);
        }
    }
    

    await interaction.update({
        embeds: [embed],
        components: []
    });
    
    if (client.applicationPages?.has(userId)) {
        client.applicationPages.delete(userId);
    }
    
    Logger.info(`Application ${decision}d for ${user.tag} by ${interaction.user.tag}`);
}

function getNextStep(currentStep) {
    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
}


async function handlePartnerModal(interaction, client) {
    try {
        const { updateUserStats, updateUserTaskProgress } = require('../database/database');
        
        const partnerText = interaction.fields.getTextInputValue('partnerText');
        
        const cleanText = partnerText
            .replace(/@everyone/g, '@\u200beveryone')
            .replace(/@here/g, '@\u200bhere');
        
        const partnerChannel = client.channels.cache.get(process.env.PARTNER_CHANNEL_ID);
        
        if (!partnerChannel) {
            return await interaction.reply({ 
                content: 'Partner kanalı bulunamadı!', 
                flags: 64
            });
        }
        
        await partnerChannel.send(cleanText);
        
        await updateUserStats(interaction.user.id, 0, 0, 1);
        
        await updateUserTaskProgress(interaction.user.id, 'partner', 1);
        
        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('Partner Metni Gönderildi')
            .setDescription('Partner metniniz başarıyla gönderildi!')
            .setTimestamp();
        
        await interaction.reply({ 
            embeds: [embed], 
            flags: 64
        });
        
        Logger.info(`Partner message sent by ${interaction.user.tag}`);
    } catch (error) {
        Logger.error('Partner modal handling error:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'Partner metni gönderilirken bir hata oluştu!', 
                flags: 64
            }).catch(() => {});
        }
    }
}