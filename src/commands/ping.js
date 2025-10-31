module.exports = {
  data: {
    name: 'ping',
    description: 'Responde com Pong! e mostra a latência do bot',
  },

  async execute(interaction) {
    const startTime = Date.now();
    
    await interaction.reply({ content: '🏓 Calculando...' });
    
    const roundtripLatency = Date.now() - startTime;
    
    await interaction.editReply(
      `🏓 Pong!\n` +
      `⏱️ Latência: ${roundtripLatency}ms\n`
    );
  },
};
