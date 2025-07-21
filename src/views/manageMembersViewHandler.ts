import { App, ViewSubmitAction } from "@slack/bolt";
import { Member } from "../types/member";
import { saveMembers } from "../utils/memberStore";

export default function manageMembersViewHandler(app: App) {
  app.view("manage_members", async ({ ack, view, body, client }) => {
    await ack();

    const state = view.state.values;

    // 참여자 데이터를 id 기준으로 모으기 (Partial 타입 사용)
    const memberMap: Record<string, Partial<Member>> = {};

    Object.entries(state).forEach(([blockId, actionBlocks]) => {
      // blockId 예: "user001_name" 또는 "user001_team_status_actions"
      const id = blockId.split("_")[0];
      if (!memberMap[id]) memberMap[id] = { id };

      Object.entries(actionBlocks).forEach(([actionId, actionValue]) => {
        if (actionId === "name_input") {
          // string | null | undefined → string | undefined 로 타입 맞추기 위해 기본 빈문자열로 처리
          memberMap[id].name = actionValue.value ?? "";
        } else if (actionId === "team_select") {
          memberMap[id].team = actionValue.selected_option?.value ?? "";
        } else if (actionId === "status_select") {
          memberMap[id].isActive = actionValue.selected_option?.value === "true";
        }
      });
    });

    // 완성된 참여자 배열, "delete" 같이 이상한 id 제거
    const members = Object.values(memberMap).filter(p => p.id !== "delete") as Member[];

    saveMembers(members);

    const channelId = view.private_metadata;
    const editorUserId = (body as ViewSubmitAction).user.id;
    const activeCount = members.filter(p => p.isActive).length;

    try {
      await client.chat.postMessage({
        channel: channelId,
        text: `✅ <@${editorUserId}> 님이 참여자 정보를 변경했습니다.\n• 현재 참여 인원: *${activeCount}명*`,
      });
    } catch (error) {
      console.error("💥 메시지 전송 실패:", error);
    }

    console.log("✅ 참여자 저장 완료", members);
  });
}
