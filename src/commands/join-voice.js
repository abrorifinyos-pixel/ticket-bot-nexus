const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join-voice')
    .setDescription('Join a voice channel and stay 24/7')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Voice channel to join').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    if (!channel.isVoiceBased()) {
      return interaction.reply({ content: '❌ Please select a voice channel.', ephemeral: true });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
        }
      });

      await interaction.reply({ content: `✅ Joined **${channel.name}** and will stay 24/7! 🎙️`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ Failed to join: ${err.message}`, ephemeral: true });
    }
  }
};
