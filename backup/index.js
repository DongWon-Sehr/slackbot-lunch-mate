require("dotenv").config();
const { App } = require("@slack/bolt");
const { loadParticipants, saveParticipants } = require("../src/utils/memberStore");
const { v4: uuidv4 } = require('uuid');
const { TEAM_OPTIONS } = require("../src/config");

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
        ...participants.flatMap((p, index) => [
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
                        text: {
                            type: "plain_text",
                            text: "🗑 삭제",
                            emoji: true,
                        },
                        style: "danger",
                        value: p.id,
                        action_id: "delete_member",
                        confirm: { // 삭제 확인 팝업 추가 가능
                            title: {
                                type: "plain_text",
                                text: "삭제 확인",
                            },
                            text: {
                                type: "plain_text",
                                text: `${p.name}님을 삭제하시겠습니까?`,
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
            },
            {
                "type": "divider"
            },
        ])
    );

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

function makeGroups(participants, groupSize) {
    const total = participants.length;
    const numGroups = Math.ceil(total / groupSize);
    const groups = Array.from({ length: numGroups }, () => []);
    const teamsMap = {};

    // 팀별 분류
    for (const p of participants) {
        if (!teamsMap[p.team]) teamsMap[p.team] = [];
        teamsMap[p.team].push(p);
    }

    // 팀별로 섞기
    Object.values(teamsMap).forEach(shuffle);

    // 1차 분배: 각 팀에서 한 명씩 라운드로빈으로 각 조에 넣기
    let groupIndex = 0;
    for (const team in teamsMap) {
        const teamMembers = teamsMap[team];
        while (teamMembers.length > 0) {
            groups[groupIndex % numGroups].push(teamMembers.pop());
            groupIndex++;
        }
    }

    // 2차 체크: 특정 조에 특정 팀이 하나도 없을 경우, 인접 조에서 교환
    const groupTeams = groups.map(group =>
        new Set(group.map(p => p.team))
    );

    for (let i = 0; i < numGroups; i++) {
        const missingTeams = Object.keys(teamsMap).filter(
            team => !groupTeams[i].has(team)
        );

        for (const team of missingTeams) {
            for (let j = 0; j < numGroups; j++) {
                if (i === j) continue;
                const donorIndex = groups[j].findIndex(p => p.team === team);
                const recipientIndex = groups[i].findIndex(p => {
                    return groupTeams[j].has(p.team) &&
                        !groupTeams[i].has(p.team);
                });

                if (donorIndex >= 0 && recipientIndex >= 0) {
                    // swap
                    const temp = groups[j][donorIndex];
                    groups[j][donorIndex] = groups[i][recipientIndex];
                    groups[i][recipientIndex] = temp;

                    // 업데이트 team sets
                    groupTeams[i].add(team);
                    break;
                }
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

app.action("delete_member", async ({ ack, body, client }) => {
    await ack();

    const deleteId = body.actions[0].value; // 버튼 value에 participant id 있음

    let participants = loadParticipants();
    participants = participants.filter((p) => p.id !== deleteId);

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
            text: `✅ ${editor} 님이 침여자 정보를 변경했습니다.\n• 현재 참여 인원: *${activeCount}명*`,
        });
    } catch (error) {
        console.error("💥 메시지 전송 실패:", error);
    }

    console.log("✅ 참여자 저장 완료", filteredParticipants);
});

app.command("/점심조뽑기", async ({ ack, body, client }) => {
    await ack();

    const allParticipants = loadParticipants();
    const activeParticipants = allParticipants.filter((p) => p.isActive);
    const inactiveParticipants = allParticipants.filter((p) => !p.isActive);

    if (activeParticipants.length === 0) {
        await client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
            text: "참여 중인 인원이 없습니다. `/참여자관리`에서 참여자를 추가해주세요.",
        });
        return;
    }

    const activeListText = activeParticipants
        .map((p) => `• ${p.name} (${p.team})`)
        .join("\n");

    const inactiveListText = inactiveParticipants.length > 0
        ? inactiveParticipants
              .map((p) => `• ${p.name} (${p.team})`)
              .join("\n")
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
                        text: `*✅ 참여자 (${activeParticipants.length}명)*\n${activeListText}`,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*🚫 미참여자 (${inactiveParticipants.length}명)*\n${inactiveListText}`,
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

app.view("draw_groups_modal", async ({ ack, view, client }) => {
    await ack();

    const state = view.state.values;
    const groupSizeStr = state.group_size_block.group_size_input.value;
    const groupSize = parseInt(groupSizeStr, 10);

    if (isNaN(groupSize) || groupSize <= 0) {
        console.log("잘못된 팀 사이즈 입력:", groupSizeStr);
        return;
    }

    const participants = loadParticipants().filter((p) => p.isActive);
    const groups = makeGroups(participants, groupSize);

    const now = new Date();
    const dateStr = `[${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}]`;
    let text = `*${dateStr} 점심 조 편성 결과* (팀 사이즈: ${groupSize})\n`;
    groups.forEach((group, i) => {
        text += `\n*조 ${i + 1}* (${group.length}명)\n`;
        group.forEach((p) => {
            text += `• ${p.name} (${p.team})\n`;
        });
    });

    text += `\n맛점하세요~ (오늘의 점심메뉴는~? 🍣🍕🍜🍖🍝)`;

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
