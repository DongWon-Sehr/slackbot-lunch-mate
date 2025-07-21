import fs from "fs";
import path from "path";
import { Member } from "../types/member";

const DATA_FILE = path.resolve(__dirname, "../../data/member.json");

export function loadMembers(): Member[] {
  try {
    console.log("DATA_FILE", DATA_FILE);
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data) as Member[];
  } catch {
    return [];
  }
}

export function saveMembers(members: Member[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(members, null, 2), "utf-8");
}
