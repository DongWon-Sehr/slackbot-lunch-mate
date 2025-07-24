import { App, ViewSubmitAction } from "@slack/bolt";
import { loadMembers } from "../utils/memberStore";
import { makeGroups } from "../utils/groupMaker";
import { TEAM_EMOJIS, TeamName, FOOD_EMOJIS } from "../config";
import { randomInt } from "crypto";

export default function drawGroupsView(app: App) {
  app.view("draw_groups_modal", async ({ ack, view, client, body }) => {
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
    const drawerUserId = (body as ViewSubmitAction).user.id;

    let text = `*${dateStr}*\n*점심 메이트 뽑기 결과* (팀 사이즈: ${groupSize})\nby <@${drawerUserId}>\n`;

    groups.forEach((group, i) => {
      text += `\n*${i + 1}조* (${group.length}명)\n`;
      group.forEach((p) => {
        text += `• ${TEAM_EMOJIS[p.team as TeamName]} ${p.name}\n`;
      });
    });

    text += `\n<@${process.env.SLACK_BOT_USER_ID || ''}>의 <오추메> 는 ${getRandomFoodEmoji()} 입니다.\n점심 메이트와 같이 상의해봐요. (맛점하세요😋)`;

    const channelId = view.private_metadata!;

    await client.chat.postMessage({
      channel: channelId,
      text,
    });
  });
}

function getRandomFoodEmoji(): typeof FOOD_EMOJIS[number] {
  const index = randomInt(FOOD_EMOJIS.length);
  return FOOD_EMOJIS[index];
}