import { Member } from "../types/member";
import { TEAM_OPTIONS } from "../config/index";

export default function buildBlocks(members: Member[]) {
  const blocks: any[] = [];

  members.forEach((p, index) => {
    blocks.push(
      {
        type: "input",
        block_id: `${p.id}_name`,
        label: {
          type: "plain_text",
          text: `멤버 ${index + 1}`,
        },
        element: {
          type: "plain_text_input",
          action_id: "name_input",
          initial_value: p.name,
        },
      },
      {
        type: "actions",
        block_id: `${p.id}_team_status_actions`,
        elements: [
          {
            type: "static_select",
            action_id: "team_select",
            placeholder: {
              type: "plain_text",
              text: "소속팀",
            },
            options: TEAM_OPTIONS.map((team) => ({
              text: { type: "plain_text", text: team },
              value: team,
            })),
            initial_option: {
              text: { type: "plain_text", text: p.team },
              value: p.team,
            },
          },
          {
            type: "static_select",
            action_id: "status_select",
            placeholder: {
              type: "plain_text",
              text: "참여여부",
            },
            options: [
              { text: { type: "plain_text", text: "참여" }, value: "true" },
              { text: { type: "plain_text", text: "미참여" }, value: "false" },
            ],
            initial_option: {
              text: { type: "plain_text", text: p.isActive ? "참여" : "미참여" },
              value: p.isActive ? "true" : "false",
            },
          },
          {
            type: "button",
            text: { type: "plain_text", text: "🗑 삭제", emoji: true },
            style: "danger",
            value: p.id,
            action_id: "delete_member",
            confirm: {
              title: { type: "plain_text", text: "삭제 확인" },
              text: { type: "plain_text", text: `${p.name}님을 삭제하시겠습니까?` },
              confirm: { type: "plain_text", text: "삭제" },
              deny: { type: "plain_text", text: "취소" },
            },
          },
        ],
      },
      { type: "divider" }
    );
  });

  blocks.push({
    type: "actions",
    block_id: "actions_block",
    elements: [
      {
        type: "button",
        action_id: "add_member",
        text: { type: "plain_text", text: "참여자 추가" },
        style: "primary",
      },
    ],
  });

  return blocks;
}