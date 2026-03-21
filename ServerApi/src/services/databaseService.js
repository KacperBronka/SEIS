import fs from "node:fs/promises"
import { getAgeFromPESEL } from "../util/peselUtil.js"

let data = []

export async function loadData() {
    const d = await fs.readFile("./database.json")
    data = JSON.parse(d)

    console.log(`Database successfully loaded (${data.length} records)`)
}

export function getPersonalData(id_uid) {
    const user = data.find(t => t.id_uid == id_uid)

    if(!user)
        return null

    return {...user, age: getAgeFromPESEL(user.pesel)}
}
