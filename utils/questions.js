module.exports = {
    applicationQuestions: {
        step1: [
            {
                id: 'name',
                label: 'İsim/Takma ad',
                placeholder: 'Gerçek adın veya takma adın',
                required: true,
                maxLength: 100
            },
            {
                id: 'age',
                label: 'Yaş',
                placeholder: 'Örn: 18',
                required: true,
                maxLength: 3
            },
            {
                id: 'discord_username',
                label: 'Discord adın',
                placeholder: 'Discord kullanıcı adın',
                required: true,
                maxLength: 50
            },
            {
                id: 'daily_activity',
                label: 'Günlük aktiflik',
                placeholder: 'Örn: 5-6 saat',
                required: true,
                maxLength: 50
            },
            {
                id: 'active_hours',
                label: 'Aktif saatlerin',
                placeholder: 'Örn: 14:00 - 22:00',
                required: true,
                maxLength: 100
            }
        ],
        step2: [
            {
                id: 'member_since',
                label: 'Üyelik süren',
                placeholder: 'Örn: 6 ay',
                required: true,
                maxLength: 100
            },
            {
                id: 'previous_experience',
                label: 'Önceki deneyim',
                placeholder: 'Yetkili deneyimlerini anlat',
                required: true,
                maxLength: 500
            },
            {
                id: 'moderation_bots',
                label: 'Bildiğin botlar',
                placeholder: 'Carl-bot, MEE6, Dyno vs.',
                required: true,
                maxLength: 300
            },
            {
                id: 'technical_knowledge',
                label: 'Teknik bilgin',
                placeholder: 'Rol/kanal/bot ayarları hakkında',
                required: true,
                maxLength: 400
            },
            {
                id: 'moderation_commands',
                label: 'Moderasyon komutları',
                placeholder: 'Ban, mute, warn komutları',
                required: true,
                maxLength: 300
            }
        ],
        step3: [
            {
                id: 'technical_troubleshooting',
                label: 'Sorun çözme',
                placeholder: 'Teknik sorun çözme deneyimin',
                required: true,
                maxLength: 400
            },
            {
                id: 'motivation',
                label: 'Motivasyonun',
                placeholder: 'Neden yetkili olmak istiyorsun?',
                required: true,
                maxLength: 500
            },
            {
                id: 'anime_interest',
                label: 'Anime ilgin',
                placeholder: 'Favori animelerin neler?',
                required: true,
                maxLength: 300
            },
            {
                id: 'good_moderator',
                label: 'İyi yetkili',
                placeholder: 'İyi yetkili nasıl olmalı?',
                required: true,
                maxLength: 400
            },
            {
                id: 'contribution',
                label: 'Katkın',
                placeholder: 'Sunucuya nasıl katkı sağlarsın?',
                required: true,
                maxLength: 400
            }
        ],
        step4: [
            {
                id: 'conflict_handling',
                label: 'Stres yönetimi',
                placeholder: 'Kavgalı ortamda nasıl davranırsın?',
                required: true,
                maxLength: 400
            },
            {
                id: 'scenario_insult',
                label: 'Hakaret senaryosu',
                placeholder: 'Hakaret durumunda ne yaparsın?',
                required: true,
                maxLength: 400
            },
            {
                id: 'scenario_spoiler',
                label: 'Spoiler senaryosu',
                placeholder: 'Spoiler durumunda ne yaparsın?',
                required: true,
                maxLength: 400
            },
            {
                id: 'scenario_dm_insult',
                label: 'DM küfür senaryosu',
                placeholder: 'Özelden küfür edilirse ne yaparsın?',
                required: true,
                maxLength: 400
            },
            {
                id: 'scenario_staff_violation',
                label: 'Yetkili ihlali',
                placeholder: 'Yetkili kural ihlali yapsa ne yaparsın?',
                required: true,
                maxLength: 400
            }
        ],
        step5: [
            {
                id: 'event_experience',
                label: 'Etkinlik deneyimi',
                placeholder: 'Etkinlik yapma deneyimin var mı?',
                required: true,
                maxLength: 400
            },
            {
                id: 'extra_skills',
                label: 'Ekstra yetenekler',
                placeholder: 'Grafik, video edit, bot vs.',
                required: true,
                maxLength: 400
            },
            {
                id: 'additional_info',
                label: 'Ekstra bilgi',
                placeholder: 'Eklemek istediğin başka şey?',
                required: false,
                maxLength: 500
            }
        ]
    }
};