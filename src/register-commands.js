require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Registrem seus commandos dentro do array para que ele possa ser reconhecido

const commands = [
  {
    name: 'eleicao',
    description: 'Commando Teste!',
  },
  {
    name: 'ping',
    description: 'CommandoTeste2',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Registrando Comandos');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID, //Client I
        process.env.TEST_GUILD_ID //Utilizar TEST_GUID_ID para servidor de TESTE e DEF_GUILD_ID para Servidor oficial da selva
      ),
      { body: commands }
    );

    console.log('Commando Registrado com sucesso');
  } catch (error) {
    console.log(`Ocorreu um Erro: ${error}`);
  }
})();