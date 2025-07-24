import { App } from "@slack/bolt";
import { loadMembers, saveMembers } from "../utils/memberStore";
import { v4 as uuidv4 } from "uuid";
import buildBlocks from "../views/manageMembersView";
import { TEAM_OPTIONS } from "../config/index"

export default function addMemberAction(app: App) {
  app.action("add_member", async ({ ack, body, client }) => {
    await ack();

    const actionBody = body as any;
    const members = loadMembers();

    members.push({
      id: uuidv4(),
      name: "",
      team: TEAM_OPTIONS[0],
      isActive: true,
    });

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