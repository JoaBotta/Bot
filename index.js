require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");
const express = require("express");

// Crear el cliente del bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Configurar Express para manejar solicitudes HTTP
const app = express();
const PORT = process.env.PORT || 3000; // Usa el puerto proporcionado por Render o 3000 si no está definido

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Mapeo de códigos de invitación a nombres de roles
const inviteToRole = {
  RghFU7J3rH: "M. Basica",
  NZxUfRfuRt: "Gratis",
  RTqW98FG39: "M. Avanzada",
};

// Mapa para almacenar las invitaciones actuales
let invitesCache = new Map();

// Evento que se ejecuta cuando el bot está listo
client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  // Guardar las invitaciones actuales
  const invites = await client.guilds.cache
    .get("1252033921319960587")
    .invites.fetch();
  invitesCache = new Map(invites.map((invite) => [invite.code, invite.uses]));
});

// Evento para cuando un nuevo miembro se une al servidor
client.on("guildMemberAdd", async (member) => {
  try {
    const invitesAfter = await member.guild.invites.fetch();
    const usedInvite = invitesAfter.find(
      (inv) => inv.uses > (invitesCache.get(inv.code) || 0),
    );

    if (usedInvite && inviteToRole[usedInvite.code]) {
      const role = member.guild.roles.cache.find(
        (r) => r.name === inviteToRole[usedInvite.code],
      );
      if (role) {
        await member.roles.add(role);
        console.log(`Assigned role ${role.name} to ${member.user.tag}`);
      }
    }

    // Actualiza los usos de invitaciones
    invitesAfter.forEach((invite) =>
      invitesCache.set(invite.code, invite.uses),
    );
  } catch (error) {
    console.error("Error assigning role:", error);
  }
});

// Comando para cambiar el rol de todos los miembros de un rol específico
client.on("messageCreate", async (message) => {
  if (message.content.startsWith("!cambiarRolesGrupo")) {
    // Verifica que el usuario tenga permisos de administrador
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply("No tienes permisos para usar este comando.");
    }

    // Extraer roles del mensaje
    const args = message.content.split(" ");
    const oldRoleName = args[1];
    const newRoleName = args[2];

    if (!oldRoleName || !newRoleName) {
      return message.reply(
        "Por favor, especifica correctamente los nombres de los roles.",
      );
    }

    // Buscar los roles por nombre
    const oldRole = message.guild.roles.cache.find(
      (role) => role.name === oldRoleName,
    );
    const newRole = message.guild.roles.cache.find(
      (role) => role.name === newRoleName,
    );

    if (!oldRole || !newRole) {
      return message.reply(
        "No se encontraron uno o ambos roles especificados.",
      );
    }

    try {
      // Obtener todos los miembros del servidor y reemplazar roles
      const members = await message.guild.members.fetch();
      const promises = [];

      members.forEach((member) => {
        if (member.roles.cache.has(oldRole.id)) {
          // Eliminar el rol anterior y agregar el nuevo
          promises.push(
            member.roles.remove(oldRole).then(() => member.roles.add(newRole)),
          );
        }
      });

      await Promise.all(promises);

      message.channel.send(
        `Todos los miembros con el rol "${oldRoleName}" ahora tienen el rol "${newRoleName}".`,
      );
    } catch (error) {
      console.error(error);
      message.channel.send("Hubo un error al intentar cambiar los roles.");
    }
  }
});

// Iniciar sesión con el token del bot
client.login(process.env.DISCORD_TOKEN);
