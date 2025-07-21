import { App } from "@slack/bolt";

export default function helloCommand(app: App) {
  app.command("/hello", async ({ ack, say }) => {
    await ack();
    await say("👋 안녕하세요! Slack Lunch Bot 준비됐어요.");
  });
}