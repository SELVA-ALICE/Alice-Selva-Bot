const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

class CommandHandler {
  constructor() {
    this.commands = new Map();
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        this.commands.set(command.data.name, command);
        console.log(`✅ Comando carregado: ${command.data.name}`);
      } else {
        console.log(`⚠️ O comando em ${file} está faltando "data" ou "execute"`);
      }
    }

    return this.commands;
  }

  async handleCommand(interaction) {
    const command = this.commands.get(interaction.commandName);

    if (!command) {
      console.error(`❌ Comando não encontrado: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Erro ao executar ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: '❌ Houve um erro ao executar este comando!',
        flags: [MessageFlags.Ephemeral]
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }

  getCommandsData() {
    return Array.from(this.commands.values()).map(cmd => cmd.data);
  }
}

module.exports = CommandHandler;
