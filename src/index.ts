import { promises as fs } from "fs";
import { ConfigBuilder, Config } from "./lib/config";
import { addFarmConfig } from "./farmConfig";
import { Bot, BotContext } from "./interface";
import { Injector, Type } from "./injector";
import { Brain, InMemoryBrain } from "./providers/brain";
import Farmer from "./providers/farmer";
import CBF from "./providers/cbf";
import CronProvider from "./providers/cron";
import DiscordProvider from "./providers/discord";
import RedditProvider from "./providers/reddit";
import SlackRTMProvider from "./providers/slack-rtm";
import SlackWebProvider from "./providers/slack-web";

async function discover() {
  const folders = await fs.readdir(__dirname + "/bots/", { encoding: "utf-8" });
  return (await Promise.all(
    folders.map(folder => import(__dirname + "/bots/" + folder))
  )).map(x => x.default as Bot);
}

function createContext(injector: Injector): BotContext {
  return {
    require: injector.get.bind(injector)
  };
}

const BOTS: Bot[] = [];

const CORE_PROVIDERS: Array<Type<any>> = [
  Brain,
  CBF,
  CronProvider,
  DiscordProvider,
  Farmer,
  RedditProvider,
  SlackRTMProvider,
  SlackWebProvider
];

async function bootstrap() {
  const injector = new Injector();

  // TODO: change implementation
  injector.set(Brain, new InMemoryBrain());

  const farmer = injector.resolve(Farmer);
  let conf = new ConfigBuilder();
  conf = addFarmConfig(conf);

  // Create the configuration that we need for the core providers to be bootstrapped
  let config = conf.build();
  injector.set(Config, config);

  // Bootstrap providers
  CORE_PROVIDERS.forEach(pro => injector.resolve(pro));

  const bots = await discover();

  for (const botType of bots) {
    if (typeof botType.configParameters !== "undefined") {
      conf = botType.configParameters(conf);
    }
  }

  config = conf.build();
  injector.set(Config, config);

  const context = createContext(injector);

  for (const botType of bots) {
    botType(context);
  }

  return injector;
}

bootstrap()
  .then(injector => {
    console.log("Bot Farm bootstrapped.");
    process.on("exit", () => {
      console.log("Sending shutdown event...");
      injector.get(Farmer).emit("shutdown");
    });
  })
  .catch(e => {
    console.error("REJECTED");
    console.error(e);
  });
