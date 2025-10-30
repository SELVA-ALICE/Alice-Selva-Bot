module.exports = {
  data: {
    name: 'ping',
    description: 'Responde com Pong! e mostra a latência do bot',
  },

  async execute(interaction) {
    await interaction.deferReply();
    
    const initialTimestamp = interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply(
      `🏓 Pong!\n` +
      `⏱️ Latência: ${Date.now() - initialTimestamp}ms\n` +
      `💓 API: ${apiLatency}ms`
    );
  },
};
