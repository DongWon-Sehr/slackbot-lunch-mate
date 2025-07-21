import { App } from "@slack/bolt";
import { loadMembers } from "../utils/memberStore";
import buildBlocks from "../views/manageMembersView";

export default function manageMembersCommand(app: App) {
  app.command("/참여자관리", async ({ ack, body, client }) => {
    await ack();

    const members = loadMembers();

    const blocks = buildBlocks(members);

    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "manage_members",
        private_metadata: body.channel_id,
        title: { type: "plain_text", text: "참여자 관리" },
        submit: { type: "plain_text", text: "저장" },
        close: { type: "plain_text", text: "취소" },
        blocks,
      },
    });
  });
}