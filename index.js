require("dotenv").config();
const { App } = require("@slack/bolt");
const { loadParticipants, saveParticipants } = require("./utils/participantStore");
const { v4: uuidv4 } = require('uuid');
const { TEAM_OPTIONS } = require("./config");

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
});

function buildBlocks(participants) {
    const blocks = [];

    // 참여자 수정용 블록 (team, name, status)
    blocks.push(
        ...participants.flatMap((p) => [
            {
                type: "input",
                block_id: `${p.id}_name`,
                label: { type: "plain_text", text: "이름" },
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
                ],
            }
        ])
    );

    // 삭제할 참여자 선택 (선택 사항)
    blocks.push({
        type: "section",
        block_id: "delete_participants_block",
        text: {
            type: "mrkdwn",
            text: "*삭제할 참여자 선택 (선택 사항)*",
        },
        accessory: {
            type: "multi_static_select",
            action_id: "delete_participants_select",
            placeholder: {
                type: "plain_text",
                text: "참여자 선택",
            },
            options: participants.map((p) => ({
                text: {
                    type: "plain_text",
                    text: p.name || "(이름 없음)",
                },
                value: p.id,
            })),
        },
    });

    // 하단 버튼
    blocks.push({
        type: "actions",
        block_id: "actions_block",
        elements: [
            {
                type: "button",
                action_id: "add_participant",
                text: { type: "plain_text", text: "참여자 추가" },
                style: "primary",
            },
            {
                type: "button",
                action_id: "delete_selected_participants",
                text: { type: "plain_text", text: "선택 삭제" },
                style: "danger",
                confirm: {
                    title: {
                        type: "plain_text",
                        text: "삭제 확인",
                    },
                    text: {
                        type: "plain_text",
                        text: "선택한 참여자를 삭제하시겠습니까?",
                    },
                    confirm: {
                        type: "plain_text",
                        text: "삭제",
                    },
                    deny: {
                        type: "plain_text",
                        text: "취소",
                    },
                },
            },
        ],
    });

    return blocks;
}

function createNewParticipant(team, name, isActive = true) {
    return {
        id: uuidv4(),
        team,
        name,
        isActive,
    };
}

// 셔플 함수 (Fisher-Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 조 편성 함수: 팀별 골고루 섞기
function makeGroups(participants, groupSize) {
    const teamsMap = {};
    participants.forEach(p => {
        if (!teamsMap[p.team]) teamsMap[p.team] = [];
        teamsMap[p.team].push(p);
    });

    Object.values(teamsMap).forEach(teamArr => shuffle(teamArr));

    const numGroups = Math.ceil(participants.length / groupSize);
    const groups = Array.from({ length: numGroups }, () => []);

    let groupIndex = 0;
    const teamArrays = Object.values(teamsMap);
    let teamsLeft = true;

    while (teamsLeft) {
        teamsLeft = false;
        for (const teamArr of teamArrays) {
            if (teamArr.length > 0) {
                groups[groupIndex].push(teamArr.pop());
                groupIndex = (groupIndex + 1) % numGroups;
                teamsLeft = true;
            }
        }
    }

    return groups;
}

app.command("/hello", async ({ ack, say }) => {
    await ack();
    await say("👋 안녕하세요! Slack Lunch Bot 준비됐어요.");
});

app.command("/참여자관리", async ({ ack, body, client }) => {
    await ack();

    const participants = loadParticipants();

    const blocks = buildBlocks(participants);

    await client.views.open({
        trigger_id: body.trigger_id,
        view: {
            type: "modal",
            callback_id: "manage_participants",
            private_metadata: body.channel_id,
            title: { type: "plain_text", text: "참여자 관리" },
            submit: { type: "plain_text", text: "저장" },
            close: { type: "plain_text", text: "취소" },
            blocks,
        },
    });
});

app.action('add_participant', async ({ ack, body, client }) => {
    await ack();

    const participants = loadParticipants();

    // 예: 기본 팀과 이름 빈칸으로 새 참여자 생성
    const newParticipant = createNewParticipant('개발1팀', '');

    participants.push(newParticipant);
    saveParticipants(participants);

    // 모달 다시 열기 (또는 갱신)
    const blocks = buildBlocks(participants);

    await client.views.update({
        view_id: body.view.id,
        hash: body.view.hash,
        view: {
            type: 'modal',
            callback_id: 'manage_participants',
            title: { type: 'plain_text', text: '참여자 관리' },
            submit: { type: 'plain_text', text: '저장' },
            close: { type: 'plain_text', text: '취소' },
            blocks,
        },
    });
});

app.action("delete_selected_participants", async ({ ack, body, client }) => {
    await ack();

    const state = body.view.state.values;
    const selectedValues =
        state.delete_participants_block.delete_participants_select.selected_options || [];

    const deleteIds = selectedValues.map((opt) => opt.value);

    let participants = loadParticipants();
    participants = participants.filter((p) => !deleteIds.includes(p.id));

    saveParticipants(participants);

    const blocks = buildBlocks(participants);

    await client.views.update({
        view_id: body.view.id,
        hash: body.view.hash,
        view: {
            type: "modal",
            callback_id: "manage_participants",
            title: { type: "plain_text", text: "참여자 관리" },
            submit: { type: "plain_text", text: "저장" },
            close: { type: "plain_text", text: "취소" },
            blocks,
        },
    });
});

app.view("manage_participants", async ({ ack, view, body, client }) => {
    await ack();

    const state = view.state.values;
    const participantMap = {};

    Object.entries(state).forEach(([block_id, actionBlocks]) => {
        // block_id 에서 참여자 id를 추출 (block_id 예: "user001_name" 또는 "user001_team_status_actions")
        const id = block_id.split("_")[0];
        if (!participantMap[id]) participantMap[id] = { id };

        // actionBlocks는 object, 키는 action_id (ex: name_input, team_select, status_select)
        Object.entries(actionBlocks).forEach(([action_id, actionValue]) => {
            if (action_id === "name_input") {
                participantMap[id].name = actionValue.value;
            } else if (action_id === "team_select") {
                participantMap[id].team = actionValue.selected_option?.value;
            } else if (action_id === "status_select") {
                participantMap[id].isActive = actionValue.selected_option?.value === "true";
            }
        });
    });

    const participants = Object.values(participantMap);

    // 저장 전에 불필요한 id "delete" 제거 혹은 필터링 필요 시 여기서 해도 됨
    const filteredParticipants = participants.filter(p => p.id !== "delete");

    saveParticipants(filteredParticipants);

    const channelId = view.private_metadata;
    const editor = `<@${body.user.id}>`;
    const activeCount = participants.filter(p => p.isActive).length;

    // 👇 메시지 전송
    try {
        await client.chat.postMessage({
            channel: channelId,
            text: `✅ ${editor}님에 의해 참여자 정보가 저장되었습니다.\n현재 참여 인원: *${activeCount}명*`,
        });
    } catch (error) {
        console.error("💥 메시지 전송 실패:", error);
    }

    console.log("✅ 참여자 저장 완료", filteredParticipants);
});

app.command("/점심조뽑기", async ({ ack, body, client }) => {
    await ack();

    const participants = loadParticipants().filter((p) => p.isActive);
    if (participants.length === 0) {
        await client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
            text: "참여 중인 인원이 없습니다. `/참여자관리`에서 참여자를 추가해주세요.",
        });
        return;
    }

    const participantListText = participants
        .map((p) => `• ${p.name} (${p.team})`)
        .join("\n");

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
                        text: `*참여자 (${participants.length}명)*\n${participantListText}`,
                    },
                },
                {
                    type: "input",
                    block_id: "group_size_block",
                    label: { type: "plain_text", text: "조 인원수" },
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

app.view("draw_groups_modal", async ({ ack, view, client }) => {
    await ack();

    const state = view.state.values;
    const groupSizeStr = state.group_size_block.group_size_input.value;
    const groupSize = parseInt(groupSizeStr, 10);

    if (isNaN(groupSize) || groupSize <= 0) {
        console.log("잘못된 조 인원수 입력:", groupSizeStr);
        return;
    }

    const participants = loadParticipants().filter((p) => p.isActive);
    const groups = makeGroups(participants, groupSize);

    const now = new Date();
    const dateStr = `[${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}]`;
    let text = `*${dateStr} 점심 조 편성 결과* (조 인원수: ${groupSize})\n`;
    groups.forEach((group, i) => {
        text += `\n*조 ${i + 1}* (${group.length}명)\n`;
        group.forEach((p) => {
            text += `• ${p.name} (${p.team})\n`;
        });
    });

    const channelId = view.private_metadata;

    await client.chat.postMessage({
        channel: channelId,
        text,
    });
});

(async () => {
    await app.start(3000);
    console.log("⚡️ Slack Lunch Bot is running on port 3000!");
})();
