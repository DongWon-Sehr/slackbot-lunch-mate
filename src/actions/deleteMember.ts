import { App } from "@slack/bolt";
import { loadMembers, saveMembers } from "../utils/memberStore";
import buildBlocks from "../views/manageMembersView";

export default function deleteMemberAction(app: App) {
  app.action("delete_member", async ({ ack, body, client }) => {
    await ack();

    const actionBody = body as any;
    const deleteId = actionBody.actions[0].value;

    let members = loadMembers();
    members = members.filter((p) => p.id !== deleteId);

    saveMembers(members);

    const blocks = buildBlocks(members);

    await client.views.update({
      view_id: actionBody.view?.id!,
      hash: actionBody.view?.hash!,
      view: {
        type: "modal",
        callback_id: "manage_members",
        title: { type: "plain_text", text: "참여자 관리" },
        submit: { type: "plain_text", text: "저장" },
        close: { type: "plain_text", text: "취소" },
        blocks,
      },
    });
  });
}