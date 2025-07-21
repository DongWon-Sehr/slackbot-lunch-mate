import { App } from "@slack/bolt";
import { config } from "dotenv";

config();

import helloCommand from "./commands/hello";
import manageMembersCommand from "./commands/manageMembers";
import drawGroupsCommand from "./commands/drawGroups";

import addMemberAction from "./actions/addMember";
import deleteMemberAction from "./actions/deleteMember";

import manageMembersView from "./views/manageMembersViewHandler";
import drawGroupsView from "./views/drawGroupsView";

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

helloCommand(app);
manageMembersCommand(app);
drawGroupsCommand(app);

addMemberAction(app);
deleteMemberAction(app);

manageMembersView(app);
drawGroupsView(app);

(async () => {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.start(port);
  console.log(`⚡️ Slack Lunch Bot is running on port ${port}!`);
})();