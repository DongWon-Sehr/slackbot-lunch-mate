import { App } from "@slack/bolt";
import { loadMembers } from "../utils/memberStore";
import { makeGroups } from "../utils/groupMaker";
import { TEAM_EMOJIS, TeamName } from "../config";

export default function drawGroupsView(app: App) {
  app.view("draw_groups_modal", async ({ ack, view, client }) => {
    await ack();

    const state = view.state.values;
    const groupSizeStr = state.group_size_block.group_size_input.value;
    const groupSize = parseInt(groupSizeStr ?? "0", 10);

    if (isNaN(groupSize) || groupSize <= 0) {
      console.error("잘못된 팀 사이즈 입력:", groupSizeStr);
      return;
    }

    const members = loadMembers().filter((p) => p.isActive);
    const groups = makeGroups(members, groupSize);

    const now = new Date();
    const dateStr = `[${String(now.getMonth() + 1).padStart(2, "0")}/${String(
      now.getDate()
    ).padStart(2, "0")}]`;

    let text = `*${dateStr} 점심 조 편성 결과* (팀 사이즈: ${groupSize})\n`;

    groups.forEach((group, i) => {
      text += `\n*${i + 1} 조* (${group.length}명)\n`;
      group.forEach((p) => {
        text += `• ${TEAM_EMOJIS[p.team as TeamName]} ${p.name}\n`;
      });
    });

    text += `\n맛점하세요~ (오늘의 점심메뉴는~? 🍣🍕🍜🍖🍝)`;

    const channelId = view.private_metadata!;

    await client.chat.postMessage({
      channel: channelId,
      text,
    });
  });
}