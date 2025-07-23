import { App } from "@slack/bolt";

export default function helloCommand(app: App) {
  app.command("/hello", async ({ ack, say }) => {
    await ack();
    await say("👋 안녕하세요! Slack Lunch Bot 준비됐어요.\n `/참여자관리` `/점심조뽑기` 슬래시 커맨드를 써보세요");
  });
}