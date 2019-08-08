import { createBot } from "../../interface";
import CBF from "../../providers/cbf";

const ID = "cbf-test";

export default createBot({ id: ID }, async ctx => {
  const cbf = await ctx.require(CBF).create({
    id: ID,
    providers: ["slack", "discord"],
    slack: {
      mode: "rtm",
      commands: ["mention"]
    },
    discord: {
      prefix: "$"
    }
  });
  cbf.hear(/ping/, m => {
    m.respond("PONG");
  });
});
