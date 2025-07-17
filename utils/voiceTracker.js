const { updateUserStats, updateUserTaskProgress } = require('../database/database');

const voiceStates = new Map();

/**
 * 
 * @param {string} userId 
 * @param {string} channelId 
 * @param {boolean} isMuted 
 * @param {boolean} isDeaf 
 */
function trackUserJoin(userId, channelId, isMuted = false, isDeaf = false) {
  const isAFK = channelId === process.env.AFK_CHANNEL_ID;
  
  voiceStates.set(userId, {
    joinTime: Date.now(),
    channelId: channelId,
    lastUpdate: Date.now(),
    isMuted: isMuted,
    isDeaf: isDeaf,
    isAFK: isAFK
  });
}

/**
 * Kullanıcının ses kanalından çıkışını işle
 * @param {string} userId - Kullanıcı ID'si
 * @returns {number} - Geçirilen dakika
 */
async function trackUserLeave(userId) {
  if (voiceStates.has(userId)) {
    const voiceState = voiceStates.get(userId);
    const voiceTime = Date.now() - voiceState.joinTime;
    const voiceMinutes = Math.floor(voiceTime / 60000);
    
    if (voiceMinutes > 0 && !voiceState.isAFK && !voiceState.isMuted && !voiceState.isDeaf) {
      try {
        await updateUserStats(userId, 0, voiceMinutes, 0);
        
        await updateUserTaskProgress(userId, 'voice', voiceMinutes);
      } catch (error) {
        console.error('Ses istatistikleri güncellenirken hata oluştu:', error);
      }
    }
    
    voiceStates.delete(userId);
    return voiceMinutes;
  }
  return 0;
}

/**
 * Kullanıcının ses kanalını değiştirmesini işle
 * @param {string} userId - Kullanıcı ID'si
 * @param {string} newChannelId - Yeni kanal ID'si
 * @param {boolean} isMuted - Kullanıcı susturulmuş mu
 * @param {boolean} isDeaf - Kullanıcı kulaklığı kapalı mı
 */
async function trackUserSwitch(userId, newChannelId, isMuted = false, isDeaf = false) {
  const minutes = await trackUserLeave(userId);
  trackUserJoin(userId, newChannelId, isMuted, isDeaf);
  return minutes;
}

/**
 * Kullanıcının susturma durumunu güncelle
 * @param {string} userId - Kullanıcı ID'si
 * @param {boolean} isMuted - Kullanıcı susturulmuş mu
 * @param {boolean} isDeaf - Kullanıcı kulaklığı kapalı mı
 */
function updateUserMuteState(userId, isMuted, isDeaf) {
  if (voiceStates.has(userId)) {
    const state = voiceStates.get(userId);
    
    if (state.isMuted !== isMuted || state.isDeaf !== isDeaf) {
      state.isMuted = isMuted;
      state.isDeaf = isDeaf;
      state.lastUpdate = Date.now();
      voiceStates.set(userId, state);
    }
  }
}

async function updateActiveVoiceUsers() {
  const now = Date.now();
  const fiveMinutesInMs = 5 * 60 * 1000;
  
  for (const [userId, state] of voiceStates.entries()) {
    if (now - state.lastUpdate >= fiveMinutesInMs) {
      const minutesSinceLastUpdate = Math.floor((now - state.lastUpdate) / 60000);
      
      if (minutesSinceLastUpdate > 0 && !state.isAFK && !state.isMuted && !state.isDeaf) {
        try {
          await updateUserStats(userId, 0, minutesSinceLastUpdate, 0);
          
          await updateUserTaskProgress(userId, 'voice', minutesSinceLastUpdate);
          
          state.lastUpdate = now;
        } catch (error) {
          console.error(`${userId} kullanıcısının ses istatistikleri güncellenirken hata oluştu:`, error);
        }
      } else {
        state.lastUpdate = now;
      }
    }
  }
}

module.exports = {
  voiceStates,
  trackUserJoin,
  trackUserLeave,
  trackUserSwitch,
  updateActiveVoiceUsers,
  updateUserMuteState
};