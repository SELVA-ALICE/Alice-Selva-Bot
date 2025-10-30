require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const CommandHandler = require('./utils/commandHandler');

const app = express();
const port = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const commandHandler = new CommandHandler();
let botReady = false;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    bot: botReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    bot: botReady ? 'ready' : 'not ready',
    uptime: process.uptime()
  });
});

app.listen(port, '0.0.0.0', () => { //inicia o port listening necessario para alguns servidores
  console.log(`🌐 Servidor HTTP rodando na porta ${port}`);
});

client.on('clientReady', () => {
  botReady = true;
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`📋 Carregando comandos...`);
  commandHandler.loadCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await commandHandler.handleCommand(interaction);
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
  }
});

async function handleButton(interaction) {
  const eleicaoCommand = commandHandler.commands.get('eleicao');
  if (eleicaoCommand && eleicaoCommand.handleButton) {
    await eleicaoCommand.handleButton(interaction);
  }
}

async function handleSelectMenu(interaction) {
  const eleicaoCommand = commandHandler.commands.get('eleicao');
  if (eleicaoCommand && eleicaoCommand.handleSelectMenu) {
    await eleicaoCommand.handleSelectMenu(interaction, client);
  }
}

client.on('error', (error) => {
  console.error('❌ Erro no cliente Discord:', error);
});

client.on('warn', (warning) => {
  console.warn('⚠️ Aviso do Discord:', warning);
});

console.log('🚀 Iniciando bot...');
client.login(process.env.BOT_TOKEN).catch((error) => {
  console.error('❌ Erro ao fazer login no Discord:', error);
  process.exit(1);
});
