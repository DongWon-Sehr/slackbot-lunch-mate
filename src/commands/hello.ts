import { App } from "@slack/bolt";

export default function helloCommand(app: App) {
  app.command("/hello", async ({ ack, say }) => {
    await ack();
    await say("👋🏻 안녕하세요! Lunch Mate Bot 이 준비됐어요.\n채팅창에 슬래시 커맨드를 써보세요\n`/참여자관리` 로 참가 인원을 설정하고 `/점심조뽑기` 로 오늘의 점심 메이트를 뽑아봐요");
  });
}