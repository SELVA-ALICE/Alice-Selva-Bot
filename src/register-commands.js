//esse arquivo precisa rodar só uma vez para adicionar os commandos ao servidor

require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
  {
    name: 'eleicao',
    description: 'Inicia uma eleição para um cargo específico',
    options: [
      {
        name: 'cargo',
        description: 'O cargo para o qual a eleição será realizada',
        type: ApplicationCommandOptionType.Role,
        required: true,
      },
      {
        name: 'duracao',
        description: 'Duração da eleição em minutos',
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
        max_value: 1440, //24hrs
      },
      {
        name: 'tipo',
        description: 'Tipo de eleição',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          {
            name: 'Manter todos com o cargo',
            value: 'manter',
          },
          {
            name: 'Substituir alguém com o cargo',
            value: 'substituir',
          },
        ],
      },
    ],     //Fim dos comandos de eleição, adicione mais comandos após essa linha para registrar mais




  },
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('🔄 Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.TEST_GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.log(`❌ Ocorreu um erro: ${error}`);
  }
})();
