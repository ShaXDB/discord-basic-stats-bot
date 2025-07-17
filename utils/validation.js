const config = require('../config/config');

class Validator {
    static canUserApply(userId, applicationData) {
        const maxApplications = config.application?.maxApplicationsPerUser || 1;
        const cooldownHours = 24;
        
        if (!applicationData.has(userId)) {
            return { canApply: true };
        }
        
        const userData = applicationData.get(userId);
        const timeSinceLastApplication = Date.now() - userData.startTime;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        
        if (timeSinceLastApplication < cooldownMs) {
            return {
                canApply: false,
                reason: 'You have already submitted an application recently',
                remainingTime: cooldownMs - timeSinceLastApplication
            };
        }
        
        return { canApply: true };
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        

        return input
            .replace(/[<>"'&]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, config.application?.maxFieldLength || 1024);
    }
    
    static validateStep(step, stepData) {
        const errors = [];
        
  
        switch (step) {
            case 'step1':
                if (!stepData.name || stepData.name.length < 2) {
                    errors.push('İsim en az 2 karakter olmalıdır');
                }
                if (!stepData.age || isNaN(stepData.age) || stepData.age < 13 || stepData.age > 99) {
                    errors.push('Geçerli bir yaş giriniz (13-99)');
                }
                if (!stepData.discord_username || stepData.discord_username.length < 2) {
                    errors.push('Geçerli bir Discord kullanıcı adı giriniz');
                }
                if (!stepData.daily_activity || stepData.daily_activity.length < 2) {
                    errors.push('Günlük aktiflik bilgisi gereklidir');
                }
                if (!stepData.active_hours || stepData.active_hours.length < 2) {
                    errors.push('Aktif olduğunuz saatler gereklidir');
                }
                break;
                
            case 'step2':
                if (!stepData.member_since || stepData.member_since.length < 2) {
                    errors.push('Üyelik süresi bilgisi gereklidir');
                }
                if (!stepData.previous_experience || stepData.previous_experience.length < 10) {
                    errors.push('Deneyim açıklaması en az 10 karakter olmalıdır');
                }
                if (!stepData.moderation_bots || stepData.moderation_bots.length < 5) {
                    errors.push('Moderasyon botları bilgisi gereklidir');
                }
                if (!stepData.technical_knowledge || stepData.technical_knowledge.length < 10) {
                    errors.push('Teknik bilgi açıklaması en az 10 karakter olmalıdır');
                }
                if (!stepData.moderation_commands || stepData.moderation_commands.length < 5) {
                    errors.push('Moderasyon komutları bilgisi gereklidir');
                }
                break;
                
            case 'step3':
                if (!stepData.technical_troubleshooting || stepData.technical_troubleshooting.length < 10) {
                    errors.push('Teknik sorun çözme deneyimi en az 10 karakter olmalıdır');
                }
                if (!stepData.motivation || stepData.motivation.length < 20) {
                    errors.push('Motivasyon açıklaması en az 20 karakter olmalıdır');
                }
                if (!stepData.anime_interest || stepData.anime_interest.length < 5) {
                    errors.push('Anime ilgisi bilgisi gereklidir');
                }
                if (!stepData.good_moderator || stepData.good_moderator.length < 10) {
                    errors.push('İyi yetkili tanımı en az 10 karakter olmalıdır');
                }
                if (!stepData.contribution || stepData.contribution.length < 10) {
                    errors.push('Katkı açıklaması en az 10 karakter olmalıdır');
                }
                break;
                
            case 'step4':
                const requiredFields = ['conflict_handling', 'scenario_insult', 'scenario_spoiler', 'scenario_dm_insult', 'scenario_staff_violation'];
                for (const field of requiredFields) {
                    if (!stepData[field] || stepData[field].length < 10) {
                        errors.push(`${field} alanı en az 10 karakter olmalıdır`);
                    }
                }
                break;
                
            case 'step5':
                if (!stepData.event_experience || stepData.event_experience.length < 5) {
                    errors.push('Etkinlik deneyimi açıklaması en az 5 karakter olmalıdır');
                }
                if (!stepData.extra_skills || stepData.extra_skills.length < 5) {
                    errors.push('Ekstra yetenekler bilgisi gereklidir');
                }
            
                break;
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validateDiscordId(id) {
        return /^\d{17,19}$/.test(id);
    }
}

module.exports = Validator;