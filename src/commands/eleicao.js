const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');

const activeElections = new Map();

module.exports = {
  data: {
    name: 'eleicao',
    description: 'Inicia uma eleição para um cargo específico',
    options: [
      {
        name: 'cargo',
        description: 'O cargo para o qual a eleição será realizada',
        type: 8,
        required: true,
      },
      {
        name: 'duracao',
        description: 'Duração da eleição em minutos',
        type: 4,
        required: true,
        min_value: 1,
        max_value: 1440,
      },
      {
        name: 'tipo',
        description: 'Tipo de eleição',
        type: 3,
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
    ],
  },

  async execute(interaction) {
    const electionStarterRoleId = process.env.ELECTION_STARTER_ROLE_ID;
    
    if (electionStarterRoleId && !interaction.member.roles.cache.has(electionStarterRoleId)) {
      return interaction.reply({
        content: `❌ Você não tem permissão para iniciar uma eleição! É necessário ter o cargo <@&${electionStarterRoleId}> para iniciar eleições.`,
        flags: [MessageFlags.Ephemeral],
      });
    }

    const role = interaction.options.getRole('cargo');
    const duration = interaction.options.getInteger('duracao');
    const electionType = interaction.options.getString('tipo');
    
    if (activeElections.has(interaction.guildId)) {
      return interaction.reply({
        content: '❌ Já existe uma eleição ativa neste servidor!',
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (electionType === 'substituir') {
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

      try {
        await interaction.guild.members.fetch();
      } catch (error) {
        console.error('Error fetching members:', error);
      }

      const membersWithRole = interaction.guild.members.cache.filter(member => 
        member.roles.cache.has(role.id) && !member.user.bot
      );

      if (membersWithRole.size === 0) {
        return interaction.editReply({
          content: `❌ Ninguém possui o cargo **${role.name}** atualmente. Use o tipo "Manter todos" para esta eleição.`,
        });
      }

      const options = Array.from(membersWithRole.values()).map(member =>
        new StringSelectMenuOptionBuilder()
          .setLabel(member.user.username)
          .setDescription(`ID: ${member.user.id}`)
          .setValue(member.user.id)
      );

      if (options.length > 25) {
        options.length = 25;
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_member_to_replace')
        .setPlaceholder('Selecione quem perderá o cargo')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const tempData = {
        role: role,
        duration: duration,
        electionType: electionType,
        channelId: interaction.channelId,
        creatorId: interaction.user.id,
      };

      activeElections.set(`temp_${interaction.guildId}`, tempData);

      return interaction.editReply({
        content: `📋 **Eleição tipo: Substituição**\n\nSelecione qual membro perderá o cargo de **${role.name}** se o vencedor da eleição ganhar:`,
        components: [row],
      });
    }

    await startElection(interaction, role, duration, electionType, null);
  },

  handleButton: async function(interaction) {
    const election = activeElections.get(interaction.guildId);

    if (!election) {
      return interaction.reply({
        content: '❌ Não há eleição ativa neste servidor.',
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (interaction.customId === 'apply_candidate') {
      const candidateRoleId = process.env.CANDIDATE_ROLE_ID;
      
      if (candidateRoleId && !interaction.member.roles.cache.has(candidateRoleId)) {
        return interaction.reply({
          content: `❌ Você não tem permissão para se candidatar! É necessário ter o cargo <@&${candidateRoleId}> para se candidatar.`,
          flags: [MessageFlags.Ephemeral],
        });
      }

      const userId = interaction.user.id;
      
      if (election.candidates.find(c => c.id === userId)) {
        return interaction.reply({
          content: '❌ Você já está registrado como candidato!',
          flags: [MessageFlags.Ephemeral],
        });
      }

      election.candidates.push({
        id: userId,
        name: interaction.user.username,
        votes: 0,
      });

      await updateElectionMessage(interaction);

      return interaction.reply({
        content: '✅ Você foi registrado como candidato!',
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (interaction.customId === 'start_voting') {
      if (election.candidates.length === 0) {
        return interaction.reply({
          content: '❌ Não há candidatos registrados!',
          flags: [MessageFlags.Ephemeral],
        });
      }

      const voteEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🗳️ Vote no seu candidato!')
        .setDescription('Escolha um candidato abaixo. Seu voto é secreto!')
        .setFooter({ text: 'Apenas você pode ver esta mensagem' });

      const buttons = election.candidates.map(candidate =>
        new ButtonBuilder()
          .setCustomId(`vote_${candidate.id}`)
          .setLabel(candidate.name)
          .setStyle(ButtonStyle.Secondary)
      );

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(
          new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
        );
      }

      return interaction.reply({
        embeds: [voteEmbed],
        components: rows,
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (interaction.customId.startsWith('vote_')) {
      const candidateId = interaction.customId.replace('vote_', '');
      const voterId = interaction.user.id;

      if (election.votes.has(voterId)) {
        return interaction.reply({
          content: '❌ Você já votou nesta eleição!',
          flags: [MessageFlags.Ephemeral],
        });
      }

      const candidate = election.candidates.find(c => c.id === candidateId);
      if (!candidate) {
        return interaction.reply({
          content: '❌ Candidato não encontrado!',
          flags: [MessageFlags.Ephemeral],
        });
      }

      candidate.votes++;
      election.votes.set(voterId, candidateId);

      return interaction.reply({
        content: `✅ Seu voto foi registrado com sucesso! Você votou em **${candidate.name}**.`,
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (interaction.customId === 'end_election') {
      await endElection(interaction.guildId, interaction.guild);
      
      return interaction.reply({
        content: '✅ Eleição encerrada!',
        flags: [MessageFlags.Ephemeral],
      });
    }
  },

  handleSelectMenu: async function(interaction, client) {
    if (interaction.customId === 'select_member_to_replace') {
      const tempData = activeElections.get(`temp_${interaction.guildId}`);
      
      if (!tempData) {
        return interaction.reply({
          content: '❌ Sessão expirada. Por favor, inicie a eleição novamente.',
          flags: [MessageFlags.Ephemeral],
        });
      }

      const selectedMemberId = interaction.values[0];
      activeElections.delete(`temp_${interaction.guildId}`);

      await interaction.deferUpdate();
      await interaction.deleteReply();

      const channel = await client.channels.fetch(tempData.channelId);
      const fakeInteraction = {
        reply: async (options) => {
          return await channel.send(options);
        },
        channelId: tempData.channelId,
        guildId: interaction.guildId,
        guild: interaction.guild,
      };

      await startElection(fakeInteraction, tempData.role, tempData.duration, tempData.electionType, selectedMemberId);
    }
  },
};

async function startElection(interaction, role, duration, electionType, replacedMemberId) {
  const electionData = {
    role: role,
    candidates: [],
    votes: new Map(),
    channelId: interaction.channelId,
    endTime: Date.now() + (duration * 60 * 1000),
    messageId: null,
    electionType: electionType,
    replacedMemberId: replacedMemberId,
  };

  activeElections.set(interaction.guildId, electionData);

  let description = `Uma eleição foi iniciada para o cargo de **${role.name}**!\n\nDuração: **${duration} minutos**`;
  
  if (electionType === 'substituir' && replacedMemberId) {
    description += `\n\n⚠️ **Tipo:** Substituição - <@${replacedMemberId}> perderá o cargo se houver um vencedor.`;
  } else {
    description += `\n\n✅ **Tipo:** Manter todos - O vencedor receberá o cargo.`;
  }

  const candidateRoleId = process.env.CANDIDATE_ROLE_ID;
  if (candidateRoleId) {
    description += `\n\n👤 **Cargo necessário para candidatar-se:** <@&${candidateRoleId}>`;
  }
  description += `\n🗳️ **Votação:** Aberta para todos`;

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🗳️ Eleição para ${role.name}`)
    .setDescription(description)
    .addFields(
      { name: '📋 Candidatos', value: 'Nenhum candidato ainda', inline: false },
      { name: '⏰ Status', value: 'Fase de candidatura aberta', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Clique em "Candidatar-se" para participar!' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('apply_candidate')
        .setLabel('📝 Candidatar-se')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('start_voting')
        .setLabel('🗳️ Iniciar Votação')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('end_election')
        .setLabel('🏁 Encerrar Eleição')
        .setStyle(ButtonStyle.Danger)
    );

  const message = await interaction.reply({
    embeds: [embed],
    components: [row],
  });

  if (interaction.fetchReply) {
    const fetchedMessage = await interaction.fetchReply();
    electionData.messageId = fetchedMessage.id;
  } else {
    electionData.messageId = message.id;
  }

  setTimeout(() => {
    if (activeElections.has(interaction.guildId)) {
      endElection(interaction.guildId, interaction.guild);
    }
  }, duration * 60 * 1000);
}

async function updateElectionMessage(interaction) {
  const election = activeElections.get(interaction.guildId);
  const channel = interaction.client.channels.cache.get(election.channelId);
  const message = await channel.messages.fetch(election.messageId);

  const candidateList = election.candidates.length > 0
    ? election.candidates.map((c, i) => `${i + 1}. <@${c.id}>`).join('\n')
    : 'Nenhum candidato ainda';

  const timeRemaining = Math.ceil((election.endTime - Date.now()) / 60000);
  let description = `Uma eleição foi iniciada para o cargo de **${election.role.name}**!\n\nDuração restante: **${timeRemaining} minutos**`;
  
  if (election.electionType === 'substituir' && election.replacedMemberId) {
    description += `\n\n⚠️ **Tipo:** Substituição - <@${election.replacedMemberId}> perderá o cargo se houver um vencedor.`;
  } else {
    description += `\n\n✅ **Tipo:** Manter todos - O vencedor receberá o cargo.`;
  }

  const candidateRoleId = process.env.CANDIDATE_ROLE_ID;
  if (candidateRoleId) {
    description += `\n\n👤 **Cargo necessário para candidatar-se:** <@&${candidateRoleId}>`;
  }
  description += `\n🗳️ **Votação:** Aberta para todos`;

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🗳️ Eleição para ${election.role.name}`)
    .setDescription(description)
    .addFields(
      { name: '📋 Candidatos', value: candidateList, inline: false },
      { name: '⏰ Status', value: 'Fase de candidatura aberta', inline: false },
      { name: '👥 Total de candidatos', value: `${election.candidates.length}`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Clique em "Candidatar-se" para participar!' });

  await message.edit({ embeds: [embed] });
}

async function endElection(guildId, guild) {
  const election = activeElections.get(guildId);
  if (!election) return;

  const channel = await guild.client.channels.fetch(election.channelId);
  const message = await channel.messages.fetch(election.messageId);

  election.candidates.sort((a, b) => b.votes - a.votes);

  const winner = election.candidates[0];
  const totalVotes = election.votes.size;

  const resultsEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(`🏆 Resultados da Eleição - ${election.role.name}`)
    .setDescription(winner ? `🎉 **${winner.name}** venceu a eleição!` : 'Nenhum voto foi registrado.')
    .addFields(
      { name: '📊 Resultados', value: election.candidates.length > 0 
        ? election.candidates.map((c, i) => `${i + 1}. **${c.name}** - ${c.votes} voto(s)`).join('\n')
        : 'Nenhum candidato', inline: false },
      { name: '🗳️ Total de votos', value: `${totalVotes}`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Eleição encerrada' });

  await message.edit({
    embeds: [resultsEmbed],
    components: [],
  });

  if (winner && winner.votes > 0) {
    try {
      const winnerMember = await guild.members.fetch(winner.id);

      if (election.electionType === 'substituir' && election.replacedMemberId) {
        const replacedMember = await guild.members.fetch(election.replacedMemberId);
        await replacedMember.roles.remove(election.role);
        await channel.send(`⚠️ <@${election.replacedMemberId}> perdeu o cargo de **${election.role.name}** devido à eleição.`);
      }

      await winnerMember.roles.add(election.role);
      await channel.send(`🎊 Parabéns <@${winner.id}>! Você recebeu o cargo de **${election.role.name}**!`);
    } catch (error) {
      console.error('Erro ao atribuir cargo:', error);
      await channel.send(`⚠️ Não foi possível atribuir/remover o cargo automaticamente. Por favor, faça isso manualmente.`);
    }
  }

  activeElections.delete(guildId);
}
