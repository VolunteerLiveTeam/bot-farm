import { promises as fs } from "fs";
import { ConfigBuilder, Config } from "./lib/config";
import { addFarmConfig } from "./farmConfig";
import { Bot, BotContext } from "./interface";
import { Injector, Type } from "./injector";
import { Brain, InMemoryBrain } from "./providers/brain";

async function discover() {
  const folders = await fs.readdir(__dirname + "/bots/", { encoding: "utf-8" });
  return (await Promise.all(
    folders.map(folder => import(__dirname + "/bots/" + folder))
  )).map(x => x.default as Bot);
}

function createContext(injector: Injector): BotContext {
  return {
    require: injector.get
  };
}

const BOTS: Bot[] = [];

async function bootstrap() {
  const injector = new Injector();

  let conf = new ConfigBuilder();
  conf = addFarmConfig(conf);

  const bots = await discover();

  for (const botType of bots) {
    if (typeof botType.configParameters !== "undefined") {
      conf = botType.configParameters(conf);
    }
  }

  const config = conf.build();
  injector.set(Config, config);

  // TODO: change implementation
  injector.set(Brain, new InMemoryBrain());

  const context = createContext(injector);

  for (const botType of bots) {
    botType(context);
  }
}

bootstrap()
  .then(() => {
    console.log("Bot Farm bootstrapped.");
  })
  .catch(e => {
    console.error("REJECTED");
    console.error(e);
  });
