import { Member } from "../types/member";

export function shuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function makeGroups(members: Member[], groupSize: number): Member[][] {
  const total = members.length;
  const numGroups = Math.ceil(total / groupSize);
  const groups: Member[][] = Array.from({ length: numGroups }, () => []);

  const teamsMap: Record<string, Member[]> = {};

  for (const p of members) {
    if (!teamsMap[p.team]) teamsMap[p.team] = [];
    teamsMap[p.team].push(p);
  }

  Object.values(teamsMap).forEach(shuffle);

  let groupIndex = 0;
  for (const team in teamsMap) {
    const members = teamsMap[team];
    while (members.length > 0) {
      groups[groupIndex % numGroups].push(members.pop()!);
      groupIndex++;
    }
  }

  // (Optional) 팀 골고루 섞기 보정 로직 넣을 수 있음

  return groups;
}