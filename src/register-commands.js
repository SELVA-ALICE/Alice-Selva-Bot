require('dotenv').config();
const { REST, Routes } = require('discord.js');
const CommandHandler = require('./utils/commandHandler');

const commandHandler = new CommandHandler();
commandHandler.loadCommands();

const commands = commandHandler.getCommandsData();

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`🔄 Registrando ${commands.length} comando(s)...`);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.TEST_GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso!');
    console.log(`📋 Comandos: ${commands.map(c => c.name).join(', ')}`);
  } catch (error) {
    console.log(`❌ Ocorreu um erro: ${error}`);
  }
})();
