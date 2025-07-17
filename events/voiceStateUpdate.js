const { Events } = require('discord.js');
const { trackUserJoin, trackUserLeave, trackUserSwitch, updateUserMuteState } = require('../utils/voiceTracker');

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState, newState) {
    if (newState.member.user.bot) return;
    
    const userId = newState.id;
    const isMuted = newState.selfMute || newState.serverMute;
    const isDeaf = newState.selfDeaf || newState.serverDeaf;
    
    if (!oldState.channelId && newState.channelId) {
      trackUserJoin(userId, newState.channelId, isMuted, isDeaf);
    }
    else if (oldState.channelId && !newState.channelId) {
      await trackUserLeave(userId);
    }
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      await trackUserSwitch(userId, newState.channelId, isMuted, isDeaf);
    }
    else if (oldState.selfMute !== newState.selfMute || 
             oldState.selfDeaf !== newState.selfDeaf ||
             oldState.serverMute !== newState.serverMute ||
             oldState.serverDeaf !== newState.serverDeaf) {
      updateUserMuteState(userId, isMuted, isDeaf);
    }
  },
};