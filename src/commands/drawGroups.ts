import { App } from "@slack/bolt";
import { loadMembers } from "../utils/memberStore";

export default function drawGroupsCommand(app: App) {
  app.command("/점심조뽑기", async ({ ack, body, client }) => {
    await ack();

    const allMembers = loadMembers();
    const activeMembers = allMembers.filter((p) => p.isActive);
    const inactiveMembers = allMembers.filter((p) => !p.isActive);

    if (activeMembers.length === 0) {
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: "참여 중인 인원이 없습니다. `/참여자관리`에서 참여자를 추가해주세요.",
      });
      return;
    }

    const activeListText = activeMembers
      .map((p) => `• ${p.name} (${p.team})`)
      .join("\n");

    const inactiveListText =
      inactiveMembers.length > 0
        ? inactiveMembers.map((p) => `• ${p.name} (${p.team})`).join("\n")
        : "_없음_";

    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "draw_groups_modal",
        private_metadata: body.channel_id,
        title: { type: "plain_text", text: "점심 조 편성" },
        submit: { type: "plain_text", text: "뽑기" },
        close: { type: "plain_text", text: "취소" },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*✅ 참여자 (${activeMembers.length}명)*\n${activeListText}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🚫 미참여자 (${inactiveMembers.length}명)*\n${inactiveListText}`,
            },
          },
          {
            type: "input",
            block_id: "group_size_block",
            label: { type: "plain_text", text: "팀 사이즈" },
            element: {
              type: "plain_text_input",
              action_id: "group_size_input",
              initial_value: "4",
              placeholder: { type: "plain_text", text: "자연수만 입력" },
            },
          },
        ],
      },
    });
  });
}