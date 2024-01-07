import {
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  createAudioResource,
} from "@discordjs/voice";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import "dotenv/config";
import { createReadStream } from "fs";

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

function playSong() {
  const resource = createAudioResource(createReadStream("./sound/music.mp3"));

  player.play(resource);
}

async function connectToChannel(channel, adapterCreator) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guildId,
    adapterCreator: adapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  try {
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

const rest = new REST({ version: "10" }).setToken(process.env["TOKEN"]);
client.login(process.env["TOKEN"]);
const prefix = "~";

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

class Timeout {
  static set = (cb, delay = 1000) => {
    this.timer = setTimeout(() => {
      console.log("timeout");
      cb();
    }, delay);
  };
  static clear = () => {
    clearTimeout(this.timer);
  };
}

class Interval {
  static set = (cb) => {
    this.timer = setInterval(() => {
      console.log("interval");
      cb();
    }, 1 * (1000 * 60 * 60));
  };
  static clear = () => {
    clearInterval(this.timer);
  };
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
  }
  if (interaction.commandName === "join") {
    const voiceChannel = interaction.options.getChannel("channel");
    try {
      const connection = await connectToChannel(
        voiceChannel,
        interaction.guild.voiceAdapterCreator
      );

      const now = new Date();
      const minute = now.getMinutes();
      let delay = 1000;
      if (minute < 50) {
        delay = (50 - minute) * (1000 * 60);
      } else if (minute > 50) {
        delay = (50 + (minute - 50)) * (1000 * 60);
      }

      Timeout.set(() => {
        playSong();
        Interval.set(() => {
          playSong();
        });
      }, delay);

      connection.subscribe(player);
      await interaction.reply(
        `alarm akan bunyi sekitar ${delay / (1000 * 60).toString()} menit lagi`
      );
    } catch (error) {
      console.error(error);
    }
  }
  if (interaction.commandName === "leave") {
    const voiceChannel = interaction.options.getChannel("channel");
    const connection = await connectToChannel(
      voiceChannel,
      interaction.guild.voiceAdapterCreator
    );
    Timeout.clear();
    Interval.clear();
    connection.destroy();
    await interaction.reply("aduh kenak usir");
  }
});

const main = async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    const commands = [
      {
        name: "ping",
        description: "Replies with Pong!",
      },
    ];

    await rest.put(
      Routes.applicationGuildCommands(
        process.env["CLIENT_ID"],
        "1016695172718923776"
      ),
      {
        body: [
          ...commands,
          new SlashCommandBuilder()
            .setName("join")
            .setDescription("join a voice channel")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("list channel nya ini bg")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
            )
            .toJSON(),
          new SlashCommandBuilder()
            .setName("leave")
            .setDescription("usir bot bg")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("list channel nya ini bg")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
            )
            .toJSON(),
        ],
      }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
};

main();
