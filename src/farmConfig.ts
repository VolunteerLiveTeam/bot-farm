import { ConfigBuilder } from "./lib/config";

export const addFarmConfig = (cfg: ConfigBuilder) =>
  cfg
    .for("reddit", c =>
      c
        .env("userAgent", "REDDIT_USER_AGENT")
        .env("clientId", "REDDIT_CLIENT_ID")
        .secret("clientSecret", "REDDIT_CLIENT_SECRET")
        .secret("username", "REDDIT_USERNAME")
        .secret("password", "REDDIT_PASSWORD")
    )
    .for("slack", c => c.secret("token", "SLACK_TOKEN"))
    .for("discord", c => c.secret("token", "DISCORD_TOKEN"));
